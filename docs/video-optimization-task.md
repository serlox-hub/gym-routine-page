# Tarea: Optimización de Videos en Raspberry Pi

## Objetivo

Comprimir automáticamente los videos subidos a MinIO para reducir almacenamiento (~50-70%) con mínima pérdida de calidad.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Flujo actual                              │
│  App → Edge Function → MinIO (video original)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Procesador de videos                      │
│                                                              │
│  mc watch ──► mc cp (descarga) ──► FFmpeg ──► mc cp (sube)  │
│                                                              │
│  Servicio systemd que monitorea nuevos objetos en MinIO     │
└─────────────────────────────────────────────────────────────┘
```

**Nota**: MinIO almacena objetos en formato interno (no como archivos directos), por lo que usamos `mc` (MinIO Client) para detectar y manejar los videos.

## Pasos de implementación

### 1. Instalar dependencias

```bash
ssh pi@[IP-PI]
sudo apt update && sudo apt install ffmpeg -y
```

### 2. Instalar MinIO Client (mc)

```bash
# Descargar mc para ARM64
wget https://dl.min.io/client/mc/release/linux-arm64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Verificar instalación
mc --version
```

### 3. Configurar alias de MinIO

```bash
# Configurar conexión a MinIO local
mc alias set minio http://localhost:9000 TU_ACCESS_KEY TU_SECRET_KEY

# Verificar conexión
mc ls minio/exercise-videos
```

### 4. Crear directorios necesarios

```bash
mkdir -p ~/video-processor
sudo mkdir -p /mnt/videos/tmp
sudo chown pi:pi /mnt/videos/tmp
```

### 5. Crear script de procesamiento

```bash
# ~/video-processor/process.sh
#!/bin/bash

MINIO_ALIAS="minio"
BUCKET="exercise-videos"
PROCESSED_LOG="$HOME/video-processor/processed.txt"
ERRORS_LOG="$HOME/video-processor/errors.txt"
HISTORY_CSV="$HOME/video-processor/history.csv"
TEMP_DIR="/mnt/videos/tmp"
LOCK_FILE="/tmp/video-processor.lock"

# ============================================
# LOCK FILE - Evitar múltiples instancias
# ============================================
exec 200>"$LOCK_FILE"
flock -n 200 || { echo "Ya hay una instancia ejecutándose"; exit 1; }

# ============================================
# CLEANUP - Limpiar archivos temporales al salir
# ============================================
cleanup() {
  rm -f "$TEMP_DIR"/original_$$_*.mp4
  rm -f "$TEMP_DIR"/optimized_$$_*.mp4
}
trap cleanup EXIT

# ============================================
# FUNCIONES
# ============================================
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

log_to_history() {
  local object_key="$1"
  local original_size="$2"
  local new_size="$3"
  local savings_percent="$4"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  if [ ! -f "$HISTORY_CSV" ]; then
    echo "timestamp,object_key,original_kb,final_kb,savings_percent" > "$HISTORY_CSV"
  fi

  echo "$timestamp,$object_key,$((original_size / 1024)),$((new_size / 1024)),$savings_percent" >> "$HISTORY_CSV"
}

process_video() {
  local object_key="$1"
  local filename=$(basename "$object_key")
  local temp_original="$TEMP_DIR/original_$$_${filename}"
  local temp_optimized="$TEMP_DIR/optimized_$$_${filename%.mp4}.mp4"

  # Saltar si ya fue procesado
  if is_processed "$object_key"; then
    log "Saltado: $object_key - Ya procesado"
    return
  fi

  # Saltar si tuvo error previamente
  if has_error "$object_key"; then
    log "Saltado: $object_key - Error previo"
    return
  fi

  log "Descargando: $object_key"

  # Descargar video de MinIO
  if ! mc cp "$MINIO_ALIAS/$BUCKET/$object_key" "$temp_original" 2>/dev/null; then
    log "Error descargando: $object_key"
    mark_error "$object_key"
    return
  fi

  original_size=$(stat -c%s "$temp_original" 2>/dev/null)
  log "Comprimiendo: $filename ($(($original_size / 1024 / 1024))MB)"

  # Comprimir con FFmpeg
  if ! ffmpeg -i "$temp_original" \
    -c:v libx264 \
    -crf 24 \
    -preset medium \
    -vf "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2" \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \
    -y "$temp_optimized" 2>/dev/null; then
    log "Error comprimiendo: $filename"
    mark_error "$object_key"
    rm -f "$temp_original" "$temp_optimized"
    return
  fi

  # Verificar integridad del video comprimido
  if ! ffprobe -v error "$temp_optimized" >/dev/null 2>&1; then
    log "Error: $filename - Video comprimido corrupto"
    mark_error "$object_key"
    rm -f "$temp_original" "$temp_optimized"
    return
  fi

  new_size=$(stat -c%s "$temp_optimized" 2>/dev/null)

  # Solo subir si es más pequeño
  if [ "$new_size" -lt "$original_size" ]; then
    log "Subiendo video optimizado: $object_key"

    if mc cp "$temp_optimized" "$MINIO_ALIAS/$BUCKET/$object_key" 2>/dev/null; then
      savings=$((original_size - new_size))
      savings_percent=$(($savings * 100 / $original_size))
      log "Completado: $filename - Reducido $(($savings / 1024))KB ($savings_percent%)"
      log_to_history "$object_key" "$original_size" "$new_size" "$savings_percent"
    else
      log "Error subiendo: $object_key"
      mark_error "$object_key"
      rm -f "$temp_original" "$temp_optimized"
      return
    fi
  else
    log "Saltado: $filename - Compresión no reduce tamaño"
    log_to_history "$object_key" "$original_size" "$original_size" "0"
  fi

  mark_processed "$object_key"
  rm -f "$temp_original" "$temp_optimized"
}

# ============================================
# INICIO
# ============================================
log "Iniciando video processor..."

# Crear archivos necesarios
mkdir -p "$TEMP_DIR"
touch "$PROCESSED_LOG"
touch "$ERRORS_LOG"

# Monitorear nuevos objetos en MinIO
mc watch "$MINIO_ALIAS/$BUCKET" --events put 2>/dev/null | while read -r line; do
  # Extraer la key del objeto del evento
  # Formato: [timestamp] [size] s3:ObjectCreated:Put http://localhost:9000/bucket/key
  object_key=$(echo "$line" | awk '{print $NF}' | sed "s|.*/$BUCKET/||")

  # Solo procesar videos
  if [[ "$object_key" =~ \.(mp4|mov|webm|avi)$ ]]; then
    # Esperar un momento para asegurar que la subida terminó
    sleep 3
    process_video "$object_key"
  fi
done
```

### 6. Hacer ejecutable

```bash
chmod +x ~/video-processor/process.sh
```

### 7. Crear servicio systemd

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
ExecStart=/usr/bin/nice -n 19 /bin/bash /home/pi/video-processor/process.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### 8. Activar servicio

```bash
sudo systemctl daemon-reload
sudo systemctl enable video-processor
sudo systemctl start video-processor
```

### 9. Verificar funcionamiento

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

MINIO_ALIAS="minio"
BUCKET="exercise-videos"
PROCESSED_LOG="$HOME/video-processor/processed.txt"
ERRORS_LOG="$HOME/video-processor/errors.txt"
HISTORY_CSV="$HOME/video-processor/history.csv"
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

log_to_history() {
  local object_key="$1"
  local original_size="$2"
  local new_size="$3"
  local savings_percent="$4"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  if [ ! -f "$HISTORY_CSV" ]; then
    echo "timestamp,object_key,original_kb,final_kb,savings_percent" > "$HISTORY_CSV"
  fi

  echo "$timestamp,$object_key,$((original_size / 1024)),$((new_size / 1024)),$savings_percent" >> "$HISTORY_CSV"
}

process_video() {
  local object_key="$1"
  local filename=$(basename "$object_key")
  local temp_original="$TEMP_DIR/original_$$_${filename}"
  local temp_optimized="$TEMP_DIR/optimized_$$_${filename%.mp4}.mp4"

  if is_processed "$object_key"; then
    log "Saltado: $object_key - Ya procesado"
    return
  fi

  if has_error "$object_key"; then
    log "Saltado: $object_key - Error previo"
    return
  fi

  log "Descargando: $object_key"

  if ! mc cp "$MINIO_ALIAS/$BUCKET/$object_key" "$temp_original" 2>/dev/null; then
    log "Error descargando: $object_key"
    mark_error "$object_key"
    return
  fi

  original_size=$(stat -c%s "$temp_original" 2>/dev/null)
  log "Comprimiendo: $filename ($(($original_size / 1024 / 1024))MB)"

  if ! ffmpeg -i "$temp_original" \
    -c:v libx264 \
    -crf 24 \
    -preset medium \
    -vf "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2" \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \
    -y "$temp_optimized" 2>/dev/null; then
    log "Error comprimiendo: $filename"
    mark_error "$object_key"
    rm -f "$temp_original" "$temp_optimized"
    return
  fi

  if ! ffprobe -v error "$temp_optimized" >/dev/null 2>&1; then
    log "Error: $filename - Video comprimido corrupto"
    mark_error "$object_key"
    rm -f "$temp_original" "$temp_optimized"
    return
  fi

  new_size=$(stat -c%s "$temp_optimized" 2>/dev/null)

  if [ "$new_size" -lt "$original_size" ]; then
    log "Subiendo video optimizado: $object_key"

    if mc cp "$temp_optimized" "$MINIO_ALIAS/$BUCKET/$object_key" 2>/dev/null; then
      savings=$((original_size - new_size))
      savings_percent=$(($savings * 100 / $original_size))
      log "Completado: $filename - Reducido $(($savings / 1024))KB ($savings_percent%)"
      log_to_history "$object_key" "$original_size" "$new_size" "$savings_percent"
    else
      log "Error subiendo: $object_key"
      mark_error "$object_key"
    fi
  else
    log "Saltado: $filename - Compresión no reduce tamaño"
    log_to_history "$object_key" "$original_size" "$original_size" "0"
  fi

  mark_processed "$object_key"
  rm -f "$temp_original" "$temp_optimized"
}

# Crear directorios necesarios
mkdir -p "$TEMP_DIR"
touch "$PROCESSED_LOG"
touch "$ERRORS_LOG"

log "Listando videos existentes en MinIO..."

# Listar todos los videos y procesarlos
mc find "$MINIO_ALIAS/$BUCKET" --name "*.mp4" 2>/dev/null | while read -r full_path; do
  object_key=$(echo "$full_path" | sed "s|$MINIO_ALIAS/$BUCKET/||")
  process_video "$object_key"
done

log "Procesamiento de videos existentes completado"
```

```bash
chmod +x ~/video-processor/optimize-existing.sh

# Ejecutar (puede tardar mucho)
~/video-processor/optimize-existing.sh

# O en segundo plano
nohup ~/video-processor/optimize-existing.sh > ~/video-processor/optimize-existing.log 2>&1 &
tail -f ~/video-processor/optimize-existing.log
```

## Monitoreo de espacio

```bash
# Ver espacio usado por videos en MinIO
mc du minio/exercise-videos

# Ver espacio disponible en disco
df -h /mnt/videos
```

## Consultar historial de optimizaciones

El archivo `~/video-processor/history.csv` guarda un registro permanente de todas las optimizaciones con los tamaños antes y después.

### Formato del CSV

```csv
timestamp,object_key,original_kb,final_kb,savings_percent
2025-12-19 10:30:45,user-id/1234567890-video.mp4,15234,5821,62
```

### Comandos útiles

```bash
# Ver todo el historial
cat ~/video-processor/history.csv

# Ver últimas 10 optimizaciones
tail -n 10 ~/video-processor/history.csv

# Ver historial formateado como tabla
column -t -s',' ~/video-processor/history.csv | less

# Calcular espacio total ahorrado (en MB)
awk -F',' 'NR>1 {sum += ($3 - $4)} END {print sum / 1024 " MB ahorrados"}' ~/video-processor/history.csv

# Ver videos con mayor reducción (top 10)
sort -t',' -k5 -rn ~/video-processor/history.csv | head -n 10

# Contar videos procesados
wc -l < ~/video-processor/history.csv

# Promedio de reducción
awk -F',' 'NR>1 && $5 > 0 {sum += $5; count++} END {print sum/count "%"}' ~/video-processor/history.csv
```

### Script para resumen de estadísticas

```bash
# ~/video-processor/stats.sh
#!/bin/bash

HISTORY_CSV="$HOME/video-processor/history.csv"

if [ ! -f "$HISTORY_CSV" ]; then
  echo "No hay historial de optimizaciones"
  exit 0
fi

total_videos=$(($(wc -l < "$HISTORY_CSV") - 1))
if [ "$total_videos" -le 0 ]; then
  echo "No hay videos procesados"
  exit 0
fi

echo "=== Estadísticas de optimización ==="
echo ""
echo "Videos procesados: $total_videos"

awk -F',' 'NR>1 {
  original += $3
  final += $4
  savings += ($3 - $4)
}
END {
  printf "Tamaño original total: %.2f MB\n", original / 1024
  printf "Tamaño final total: %.2f MB\n", final / 1024
  printf "Espacio ahorrado: %.2f MB (%.1f%%)\n", savings / 1024, (savings / original) * 100
}' "$HISTORY_CSV"

echo ""
echo "=== Top 5 mayores reducciones ==="
echo "Archivo | Original | Final | Reducción"
sort -t',' -k5 -rn "$HISTORY_CSV" | head -n 5 | awk -F',' '{
  split($2, path, "/")
  filename = path[length(path)]
  printf "%s | %d KB | %d KB | %d%%\n", filename, $3, $4, $5
}'
```

```bash
chmod +x ~/video-processor/stats.sh
~/video-processor/stats.sh
```

## Script para limpiar logs

Los logs `processed.txt` y `errors.txt` crecen indefinidamente. Este script elimina entradas de videos que ya no existen en MinIO.

```bash
# ~/video-processor/cleanup-log.sh
#!/bin/bash

MINIO_ALIAS="minio"
BUCKET="exercise-videos"
PROCESSED_LOG="$HOME/video-processor/processed.txt"
ERRORS_LOG="$HOME/video-processor/errors.txt"

# Obtener lista de objetos actuales en MinIO
CURRENT_OBJECTS=$(mc find "$MINIO_ALIAS/$BUCKET" --name "*.mp4" 2>/dev/null | sed "s|$MINIO_ALIAS/$BUCKET/||")

cleanup_file() {
  local logfile="$1"
  local name="$2"

  if [ ! -f "$logfile" ]; then
    echo "No existe $name"
    return
  fi

  total_antes=$(wc -l < "$logfile")

  # Filtrar solo objetos que aún existen en MinIO
  while IFS= read -r object_key; do
    echo "$CURRENT_OBJECTS" | grep -qxF "$object_key" && echo "$object_key"
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
3. **Espacio temporal**: Los archivos temporales se guardan en `/mnt/videos/tmp` (mismo disco que MinIO) para evitar llenar la SD
4. **Videos originales**: Se sobrescriben en MinIO. El video está disponible inmediatamente tras subir; la versión optimizada lo reemplaza después
5. **Registro de procesados**: El archivo `processed.txt` guarda las keys de videos ya procesados para evitar reprocesarlos
6. **Registro de errores**: El archivo `errors.txt` guarda keys de videos que fallaron. Para reintentar, elimina la línea del archivo
7. **Historial CSV**: Registro permanente de todas las optimizaciones con tamaños. Usa `stats.sh` para ver estadísticas
8. **Lock file**: Solo puede ejecutarse una instancia a la vez
9. **Transferencia local**: La descarga/subida entre el script y MinIO es por localhost, muy rápida
10. **Tamaño máximo**: El límite de subida es 200MB
11. **Extensiones soportadas**: mp4, mov, webm, avi
12. **Verificación de integridad**: Antes de reemplazar, se verifica con `ffprobe` que el video no esté corrupto
