# Tarea: Optimización de Videos en Raspberry Pi

## Objetivo

Comprimir automáticamente los videos subidos a MinIO para reducir almacenamiento (~50-70%) con mínima pérdida de calidad.

## Arquitectura propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    Flujo actual                              │
│  App → Edge Function → MinIO (video original)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nuevo componente                          │
│                                                              │
│  MinIO ──► inotifywait ──► FFmpeg ──► Video optimizado      │
│                                                              │
│  Servicio systemd que monitorea nuevos archivos             │
└─────────────────────────────────────────────────────────────┘
```

## Pasos de implementación

### 1. Instalar FFmpeg en la Raspberry Pi

```bash
ssh pi@[IP-PI]
sudo apt update && sudo apt install ffmpeg inotify-tools -y
```

### 2. Crear directorio del procesador

```bash
mkdir -p ~/video-processor
```

### 3. Crear script de procesamiento

```bash
# ~/video-processor/process.sh
#!/bin/bash

MINIO_DATA="/mnt/videos/minio-data/exercise-videos"
PROCESSED_LOG="$HOME/video-processor/processed.txt"
ERRORS_LOG="$HOME/video-processor/errors.txt"
TEMP_DIR="/mnt/videos/tmp"
LOCK_FILE="/tmp/video-processor.lock"
MAX_WAIT_ITERATIONS=60  # 60 × 2s = 2 minutos máximo de espera

# Habilitar case insensitive para comparaciones
shopt -s nocasematch

# ============================================
# LOCK FILE - Evitar múltiples instancias
# ============================================
exec 200>"$LOCK_FILE"
flock -n 200 || { echo "Ya hay una instancia ejecutándose"; exit 1; }

# ============================================
# CLEANUP - Limpiar archivos temporales al salir
# ============================================
cleanup() {
  rm -f "$TEMP_DIR"/optimized_$$_*.mp4
}
trap cleanup EXIT

# ============================================
# FUNCIONES
# ============================================
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Verificar si un archivo ya fue procesado
is_processed() {
  grep -qxF "$1" "$PROCESSED_LOG" 2>/dev/null
}

# Verificar si un archivo tuvo error previamente
has_error() {
  grep -qxF "$1" "$ERRORS_LOG" 2>/dev/null
}

# Marcar archivo como procesado
mark_processed() {
  echo "$1" >> "$PROCESSED_LOG"
}

# Marcar archivo con error
mark_error() {
  echo "$1" >> "$ERRORS_LOG"
}

# Esperar a que el archivo termine de escribirse (con timeout)
wait_for_file() {
  local filepath="$1"
  local prev_size=0
  local curr_size=1
  local iterations=0

  while [ "$prev_size" != "$curr_size" ] && [ "$iterations" -lt "$MAX_WAIT_ITERATIONS" ]; do
    prev_size=$(stat -c%s "$filepath" 2>/dev/null || echo 0)
    sleep 2
    curr_size=$(stat -c%s "$filepath" 2>/dev/null || echo 0)
    iterations=$((iterations + 1))
  done

  # Retornar error si se alcanzó el timeout
  [ "$iterations" -ge "$MAX_WAIT_ITERATIONS" ] && return 1
  return 0
}

# Generar nombre único para archivo temporal
get_temp_filename() {
  local filepath="$1"
  local hash=$(echo "$filepath" | md5sum | cut -d' ' -f1)
  echo "$TEMP_DIR/optimized_$$_${hash}.mp4"
}

process_video() {
  local filepath="$1"
  local filename=$(basename "$filepath")
  local temp_output=$(get_temp_filename "$filepath")

  # Verificar que el archivo existe
  if [ ! -f "$filepath" ]; then
    log "Saltado: $filename - Archivo no existe"
    return
  fi

  # Saltar si ya fue procesado
  if is_processed "$filepath"; then
    log "Saltado: $filename - Ya fue procesado anteriormente"
    return
  fi

  # Saltar si tuvo error previamente
  if has_error "$filepath"; then
    log "Saltado: $filename - Error previo registrado"
    return
  fi

  log "Procesando: $filepath"

  # Obtener tamaño original
  original_size=$(stat -c%s "$filepath" 2>/dev/null || stat -f%z "$filepath")

  # Comprimir con FFmpeg
  ffmpeg -i "$filepath" \
    -c:v libx264 \
    -crf 24 \
    -preset medium \
    -vf "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease" \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \
    -y "$temp_output" 2>&1

  if [ $? -eq 0 ] && [ -f "$temp_output" ]; then
    # Verificar que el video comprimido no está corrupto
    if ! ffprobe -v error "$temp_output" >/dev/null 2>&1; then
      log "Error: $filename - Video comprimido corrupto"
      mark_error "$filepath"
      rm -f "$temp_output"
      return
    fi

    new_size=$(stat -c%s "$temp_output" 2>/dev/null || stat -f%z "$temp_output")

    # Solo reemplazar si es más pequeño
    if [ "$new_size" -lt "$original_size" ]; then
      mv "$temp_output" "$filepath"
      savings=$((original_size - new_size))
      log "Completado: $filename - Reducido $(($savings / 1024))KB ($(($savings * 100 / $original_size))%)"
    else
      rm "$temp_output"
      log "Saltado: $filename - Compresión no reduce tamaño"
    fi
    # Marcar como procesado (exitoso o no necesitó compresión)
    mark_processed "$filepath"
  else
    log "Error procesando: $filename"
    mark_error "$filepath"
    rm -f "$temp_output"
  fi
}

# ============================================
# INICIO
# ============================================
log "Iniciando video processor..."

# Crear directorios y archivos necesarios
mkdir -p "$TEMP_DIR"
touch "$PROCESSED_LOG"
touch "$ERRORS_LOG"

# Monitorear nuevos archivos (recursivo para subdirectorios de usuarios)
inotifywait -m -r -e close_write --format '%w%f' "$MINIO_DATA" 2>/dev/null | while IFS= read -r filepath; do
  # Solo procesar videos (case insensitive gracias a shopt)
  if [[ "$filepath" =~ \.(mp4|mov|webm|avi)$ ]]; then
    # Esperar a que MinIO termine de escribir
    if wait_for_file "$filepath"; then
      process_video "$filepath"
    else
      log "Timeout esperando: $(basename "$filepath")"
    fi
  fi
done
```

### 4. Hacer ejecutable

```bash
chmod +x ~/video-processor/process.sh
```

### 5. Crear servicio systemd

```bash
sudo tee /etc/systemd/system/video-processor.service << 'EOF'
[Unit]
Description=Video Processor para MinIO
After=docker.service network.target
Wants=docker.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/video-processor
ExecStart=/usr/bin/nice -n 19 /home/pi/video-processor/process.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### 6. Activar servicio

```bash
sudo systemctl daemon-reload
sudo systemctl enable video-processor
sudo systemctl start video-processor
```

### 7. Verificar funcionamiento

```bash
# Ver estado
sudo systemctl status video-processor

# Ver logs en tiempo real
journalctl -u video-processor -f
```

## Parámetros FFmpeg explicados

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `-c:v libx264` | - | Codec H.264, máxima compatibilidad |
| `-crf` | 24 | Calidad constante (18=alta, 28=baja). 24 es buen balance |
| `-preset` | medium | Velocidad de compresión. `medium` es óptimo para Pi |
| `-vf scale` | 1280:720 max | Limita resolución máxima a 720p |
| `-c:a aac` | - | Codec de audio AAC |
| `-b:a` | 128k | Bitrate de audio |
| `-movflags +faststart` | - | Permite streaming antes de descarga completa |

## Ajustes opcionales

### Para mayor compresión (menor calidad)
```bash
-crf 26 -preset slow
```

### Para mejor calidad (menos compresión)
```bash
-crf 22 -preset medium
```

### Para Pi más lentas (Pi 3 o anterior)
```bash
-preset faster
```

## Script para optimizar videos existentes

```bash
# ~/video-processor/optimize-existing.sh
#!/bin/bash

MINIO_DATA="/mnt/videos/minio-data/exercise-videos"
PROCESSED_LOG="$HOME/video-processor/processed.txt"
ERRORS_LOG="$HOME/video-processor/errors.txt"
TEMP_DIR="/mnt/videos/tmp"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

is_processed() {
  grep -qxF "$1" "$PROCESSED_LOG" 2>/dev/null
}

has_error() {
  grep -qxF "$1" "$ERRORS_LOG" 2>/dev/null
}

mark_processed() {
  echo "$1" >> "$PROCESSED_LOG"
}

mark_error() {
  echo "$1" >> "$ERRORS_LOG"
}

get_temp_filename() {
  local filepath="$1"
  local hash=$(echo "$filepath" | md5sum | cut -d' ' -f1)
  echo "$TEMP_DIR/optimized_$$_${hash}.mp4"
}

process_video() {
  local filepath="$1"
  local filename=$(basename "$filepath")
  local temp_output=$(get_temp_filename "$filepath")

  # Verificar que el archivo existe
  if [ ! -f "$filepath" ]; then
    log "Saltado: $filename - Archivo no existe"
    return
  fi

  if is_processed "$filepath"; then
    log "Saltado: $filename - Ya fue procesado anteriormente"
    return
  fi

  if has_error "$filepath"; then
    log "Saltado: $filename - Error previo registrado"
    return
  fi

  log "Procesando: $filepath"
  original_size=$(stat -c%s "$filepath" 2>/dev/null || stat -f%z "$filepath")

  ffmpeg -i "$filepath" \
    -c:v libx264 \
    -crf 24 \
    -preset medium \
    -vf "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease" \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \
    -y "$temp_output" 2>&1

  if [ $? -eq 0 ] && [ -f "$temp_output" ]; then
    # Verificar que el video comprimido no está corrupto
    if ! ffprobe -v error "$temp_output" >/dev/null 2>&1; then
      log "Error: $filename - Video comprimido corrupto"
      mark_error "$filepath"
      rm -f "$temp_output"
      return
    fi

    new_size=$(stat -c%s "$temp_output" 2>/dev/null || stat -f%z "$temp_output")
    if [ "$new_size" -lt "$original_size" ]; then
      mv "$temp_output" "$filepath"
      savings=$((original_size - new_size))
      log "Completado: $filename - Reducido $(($savings / 1024))KB ($(($savings * 100 / $original_size))%)"
    else
      rm "$temp_output"
      log "Saltado: $filename - Compresión no reduce tamaño"
    fi
    mark_processed "$filepath"
  else
    log "Error procesando: $filename"
    mark_error "$filepath"
    rm -f "$temp_output"
  fi
}

# Crear directorios necesarios
mkdir -p "$TEMP_DIR"
touch "$PROCESSED_LOG"
touch "$ERRORS_LOG"

log "Procesando videos existentes..."

# Buscar y procesar todos los videos (incluyendo subdirectorios)
find "$MINIO_DATA" -type f \( -iname "*.mp4" -o -iname "*.mov" -o -iname "*.webm" -o -iname "*.avi" \) | while IFS= read -r filepath; do
  process_video "$filepath"
done

log "Procesamiento de videos existentes completado"
```

## Monitoreo de espacio

```bash
# Ver espacio usado por videos
du -sh /mnt/videos/minio-data/exercise-videos

# Ver espacio disponible
df -h /mnt/videos
```

## Script para limpiar logs

Los logs `processed.txt` y `errors.txt` crecen indefinidamente. Este script elimina entradas de videos que ya no existen.

```bash
# ~/video-processor/cleanup-log.sh
#!/bin/bash

PROCESSED_LOG="$HOME/video-processor/processed.txt"
ERRORS_LOG="$HOME/video-processor/errors.txt"

cleanup_file() {
  local logfile="$1"
  local name="$2"

  if [ ! -f "$logfile" ]; then
    echo "No existe $name"
    return
  fi

  total_antes=$(wc -l < "$logfile")

  # Filtrar solo rutas que aún existen
  while IFS= read -r filepath; do
    [ -f "$filepath" ] && echo "$filepath"
  done < "$logfile" > "${logfile}.tmp"

  mv "${logfile}.tmp" "$logfile"

  total_despues=$(wc -l < "$logfile")
  eliminados=$((total_antes - total_despues))

  echo "$name: $eliminados entradas eliminadas ($total_despues restantes)"
}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando limpieza de logs..."
cleanup_file "$PROCESSED_LOG" "processed.txt"
cleanup_file "$ERRORS_LOG" "errors.txt"
echo "Limpieza completada"
```

### Programar limpieza semanal con cron

```bash
# Hacer ejecutable
chmod +x ~/video-processor/cleanup-log.sh

# Añadir a crontab (ejecutar domingos a las 3am)
(crontab -l 2>/dev/null; echo "0 3 * * 0 $HOME/video-processor/cleanup-log.sh >> $HOME/video-processor/cleanup.log 2>&1") | crontab -
```

## Rollback

Si hay problemas:

```bash
# Detener servicio
sudo systemctl stop video-processor
sudo systemctl disable video-processor

# Eliminar servicio
sudo rm /etc/systemd/system/video-processor.service
sudo systemctl daemon-reload
```

## Consideraciones

1. **CPU de la Pi**: La compresión H.264 es intensiva. En Pi 4 un video de 1 min puede tardar 2-5 min en procesarse
2. **Cola de videos**: Si se suben muchos videos seguidos, se procesarán en serie
3. **Espacio temporal**: Los archivos temporales se guardan en `/mnt/videos/tmp` (mismo disco que MinIO) para evitar llenar la RAM si `/tmp` está en tmpfs
4. **Videos originales**: Se sobrescriben. Si quieres mantener originales, modificar el script para guardar en otra ubicación
5. **Registro de procesados**: El archivo `~/video-processor/processed.txt` guarda las rutas de videos ya procesados para evitar reprocesarlos y prevenir loops infinitos. Si necesitas reprocesar un video, elimina su línea del archivo
6. **Registro de errores**: El archivo `~/video-processor/errors.txt` guarda rutas de videos que fallaron al procesar. Evita reintentos infinitos de archivos corruptos. Para reintentar, elimina la línea del archivo
7. **Subdirectorios**: El script monitorea recursivamente (`-r`) para detectar videos en carpetas de usuarios (`{user_id}/timestamp-video.mp4`)
8. **Lock file**: Solo puede ejecutarse una instancia a la vez. Si intentas ejecutar otra, mostrará "Ya hay una instancia ejecutándose"
9. **Limpieza automática**: Configura el cron de `cleanup-log.sh` para evitar que el log crezca indefinidamente con rutas de videos eliminados
10. **Tamaño máximo**: El límite de subida es 200MB. La función `wait_for_file` espera hasta que el archivo deje de cambiar de tamaño (máximo 2 minutos)
11. **Extensiones soportadas**: mp4, mov, webm, avi (case insensitive)
12. **Verificación de integridad**: Antes de reemplazar el original, se verifica con `ffprobe` que el video comprimido no esté corrupto. Si lo está, se marca como error y se conserva el original
