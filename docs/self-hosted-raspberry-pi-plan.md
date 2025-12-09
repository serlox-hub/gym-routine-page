# Plan: Arquitectura Híbrida - Supabase Cloud + Raspberry Pi Storage

## Contexto

Objetivo: Almacenar videos de ejercicios para la app de gym tracker.
Usuarios: Uso personal + amigos (grupo pequeño y conocido).
Requisito principal: Storage grande y económico para videos.

---

## Decisión: Arquitectura Híbrida

```
┌─────────────────────────────────────────────────────────┐
│                      App React                           │
├─────────────────────────────────────────────────────────┤
│  Auth, DB, API  →  Supabase Cloud (free tier)           │
│  Videos         →  Raspberry Pi + MinIO (self-hosted)   │
└─────────────────────────────────────────────────────────┘
```

### Por qué este enfoque

| Aspecto | Beneficio |
|---------|-----------|
| **Simplicidad** | No hay que mantener Supabase self-hosted (muy complejo) |
| **Fiabilidad** | Auth y DB funcionan aunque la Pi esté offline |
| **Costo** | Free tier de Supabase + ~€2-3/mes electricidad |
| **Storage ilimitado** | Videos en discos locales sin límites |
| **Migración mínima** | La app actual apenas cambia |

---

## Análisis de Alternativas Descartadas

### Opción 1: Supabase Hosted Storage

| Aspecto | Detalle |
|---------|---------|
| Free tier | 1GB storage (insuficiente para videos) |
| Pro ($25/mes) | 8GB + $0.021/GB extra |
| Costo 100GB | ~$27/mes |
| Costo 500GB | ~$35/mes |

**Veredicto**: Caro para videos. No tiene sentido económico.

### Opción 2: VPS con Supabase Self-Hosted Completo

| Proveedor | Costo | Storage |
|-----------|-------|---------|
| Hetzner | €4-8/mes | 40-160GB |
| Contabo | $6-12/mes | 200-400GB |
| DigitalOcean | $6-12/mes | 50-100GB |

**Veredicto**: Pago mensual recurrente + complejidad de mantener Supabase completo.

### Opción 3: Raspberry Pi con Todo Self-Hosted

Supabase completo consume demasiados recursos:

```
- PostgreSQL     (~200-500MB RAM)
- GoTrue (Auth)  (~100MB RAM)
- PostgREST      (~50MB RAM)
- Realtime       (~100MB RAM)
- Storage API    (~100MB RAM)
- Kong (API GW)  (~200MB RAM)
- Studio         (~300MB RAM)
─────────────────────────────────
Total: ~1-1.5GB RAM mínimo
```

**Veredicto**: Demasiado complejo para el beneficio. Mejor híbrido.

---

## Arquitectura Final

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase Cloud                        │
│                    (free tier)                           │
├─────────────────────────────────────────────────────────┤
│  • PostgreSQL (rutinas, ejercicios, sesiones)           │
│  • Auth (usuarios, JWT)                                  │
│  • API REST automática                                   │
│  • Realtime (si se necesita)                            │
└─────────────────────────────────────────────────────────┘
           │
           │  URLs de videos almacenadas en DB
           │  (ej: https://videos.tudominio.com/abc123.mp4)
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│                    Raspberry Pi                          │
│                    (en casa)                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌─────────────────────────────────────────────────┐   │
│   │                    MinIO                         │   │
│   │              (S3-compatible)                     │   │
│   │                                                  │   │
│   │  • API S3 estándar                              │   │
│   │  • Presigned URLs para streaming                │   │
│   │  • Dashboard web de administración              │   │
│   │  • Puerto 9000 (API) + 9001 (Console)          │   │
│   └─────────────────────────────────────────────────┘   │
│                         │                                │
│                    [HDD 1-2TB]                           │
│                                                          │
└──────────────────────────┬──────────────────────────────┘
                           │
                  ┌────────▼────────┐
                  │ Cloudflare      │
                  │ Tunnel          │
                  │ (HTTPS gratis)  │
                  └────────┬────────┘
                           │
                    ┌──────▼──────┐
                    │  Internet   │
                    │  (usuarios) │
                    └─────────────┘
```

### Por qué MinIO

| Ventaja | Detalle |
|---------|---------|
| **API S3 estándar** | Si migras a AWS/otro cloud, el código no cambia |
| **SDK disponible** | `@aws-sdk/client-s3` funciona directo |
| **Presigned URLs** | Streaming seguro de videos con URLs temporales |
| **Dashboard** | Gestión visual en `http://pi:9001` |
| **Ligero** | ~200MB RAM, perfecto para Pi |
| **Docker ready** | Un comando y funcionando |

---

## Hardware Recomendado

### Mínimo

```
Raspberry Pi 4 (4GB RAM)          ~€60
HDD externo 1TB (para videos)     ~€45
Fuente alimentación oficial       ~€10
Caja con ventilación              ~€15
─────────────────────────────────────
Total aproximado                  ~€130
```

### Recomendado

```
Raspberry Pi 4 (8GB RAM)          ~€85
HDD externo 2TB (para videos)     ~€70
Fuente alimentación oficial       ~€10
Caja con ventilación activa       ~€20
UPS básico (opcional)             ~€40
─────────────────────────────────────
Total aproximado                  ~€225
```

> **Nota**: No necesitas SSD separado porque la DB sigue en Supabase Cloud. Solo necesitas almacenamiento para videos.

---

## Estimación de Storage para Videos

### Tamaños típicos de video

| Calidad | Duración | Tamaño aprox |
|---------|----------|--------------|
| 720p comprimido | 30 seg | 15-25 MB |
| 1080p comprimido | 30 seg | 30-50 MB |
| 1080p comprimido | 1 min | 50-100 MB |
| 4K comprimido | 1 min | 200-400 MB |

### Capacidad con 1TB

| Escenario | Videos que caben |
|-----------|------------------|
| Videos cortos 720p (~20MB) | ~50,000 videos |
| Videos 1080p 1min (~75MB) | ~13,000 videos |
| Mix típico (~50MB promedio) | ~20,000 videos |

**Conclusión**: Para ti y amigos, 1TB es más que suficiente para años de uso.

---

## Plan de Implementación

### Fase 1: Preparación de la Raspberry Pi

#### 1.1 Instalar sistema operativo

```bash
# Descargar Raspberry Pi Imager desde https://www.raspberrypi.com/software/
# Grabar "Raspberry Pi OS Lite (64-bit)" en la SD card

# En las opciones de Imager, configurar:
# - Hostname: gym-storage
# - Usuario: pi (o el que prefieras)
# - Contraseña: (una segura)
# - WiFi: (tus credenciales)
# - SSH: Habilitar
```

#### 1.2 Primer arranque y configuración básica

```bash
# Conectar por SSH
ssh pi@gym-storage.local

# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar herramientas básicas
sudo apt install -y vim htop curl git

# Configurar timezone
sudo timedatectl set-timezone Europe/Madrid

# Habilitar auto-login (opcional, para headless)
sudo raspi-config
# → System Options → Boot / Auto Login → Console Autologin
```

#### 1.3 Montar disco externo

```bash
# Identificar el disco
lsblk

# Formatear si es nuevo (CUIDADO: borra todo)
sudo mkfs.ext4 /dev/sda1

# Crear punto de montaje
sudo mkdir -p /mnt/videos

# Obtener UUID del disco
sudo blkid /dev/sda1

# Añadir a fstab para montaje automático
sudo vim /etc/fstab
# Añadir línea:
# UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx /mnt/videos ext4 defaults,nofail 0 2

# Montar
sudo mount -a

# Verificar
df -h /mnt/videos

# Dar permisos
sudo chown -R pi:pi /mnt/videos
```

#### 1.4 Instalar Docker

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Añadir usuario al grupo docker
sudo usermod -aG docker pi

# Cerrar sesión y volver a entrar para aplicar
exit
ssh pi@gym-storage.local

# Verificar
docker --version
docker run hello-world
```

### Fase 2: Instalar y Configurar MinIO

#### 2.1 Crear estructura de directorios

```bash
# Directorio para datos de MinIO
mkdir -p /mnt/videos/minio-data

# Directorio para configuración
mkdir -p ~/minio-config
```

#### 2.2 Crear docker-compose.yml

```bash
vim ~/minio-config/docker-compose.yml
```

```yaml
version: '3.8'

services:
  minio:
    image: minio/minio:latest
    container_name: minio
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - /mnt/videos/minio-data:/data
    command: server /data --console-address ":9001"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
```

#### 2.3 Crear archivo de variables de entorno

```bash
vim ~/minio-config/.env
```

```bash
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=CambiaEstaPorUnaContraseñaSegura123!
```

```bash
# Proteger el archivo
chmod 600 ~/minio-config/.env
```

#### 2.4 Iniciar MinIO

```bash
cd ~/minio-config
docker compose up -d

# Verificar que está corriendo
docker ps
docker logs minio

# Probar acceso local
curl http://localhost:9000/minio/health/live
```

#### 2.5 Configurar bucket inicial

```bash
# Instalar cliente MinIO
wget https://dl.min.io/client/mc/release/linux-arm64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Configurar alias
mc alias set local http://localhost:9000 admin 'CambiaEstaPorUnaContraseñaSegura123!'

# Crear bucket para videos
mc mb local/exercise-videos

# Verificar
mc ls local
```

### Fase 3: Configurar Cloudflare Tunnel

#### 3.1 Requisitos previos

- Cuenta en Cloudflare (gratis)
- Un dominio gestionado en Cloudflare (puedes usar uno barato o gratuito)

#### 3.2 Instalar cloudflared

```bash
# Descargar cloudflared para ARM64
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Verificar
cloudflared --version
```

#### 3.3 Autenticar con Cloudflare

```bash
cloudflared tunnel login
# Esto abre una URL - cópiala y ábrela en tu navegador
# Selecciona el dominio que quieres usar
```

#### 3.4 Crear túnel

```bash
# Crear túnel
cloudflared tunnel create gym-videos

# Esto genera un archivo de credenciales en ~/.cloudflared/
# Anota el TUNNEL_ID que te muestra
```

#### 3.5 Configurar túnel

```bash
vim ~/.cloudflared/config.yml
```

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/pi/.cloudflared/<TUNNEL_ID>.json

ingress:
  # API de MinIO para uploads/downloads
  - hostname: videos.tudominio.com
    service: http://localhost:9000
  # Console de MinIO (opcional, para administración)
  - hostname: minio-console.tudominio.com
    service: http://localhost:9001
  # Catch-all
  - service: http_status:404
```

#### 3.6 Configurar DNS en Cloudflare

```bash
# Crear registros DNS automáticamente
cloudflared tunnel route dns gym-videos videos.tudominio.com
cloudflared tunnel route dns gym-videos minio-console.tudominio.com
```

#### 3.7 Probar el túnel

```bash
# Ejecutar en primer plano para probar
cloudflared tunnel run gym-videos

# En otra terminal o desde tu ordenador, probar:
curl https://videos.tudominio.com/minio/health/live
```

#### 3.8 Configurar como servicio systemd

```bash
# Instalar servicio
sudo cloudflared service install

# O manualmente:
sudo vim /etc/systemd/system/cloudflared.service
```

```ini
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/usr/local/bin/cloudflared tunnel run gym-videos
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Habilitar e iniciar
sudo systemctl daemon-reload
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# Verificar
sudo systemctl status cloudflared
```

### Fase 4: Crear Access Keys para la App

#### 4.1 Crear usuario/policy para la app

```bash
# Crear política de acceso (solo lectura/escritura al bucket de videos)
mc admin policy create local app-policy - <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::exercise-videos",
        "arn:aws:s3:::exercise-videos/*"
      ]
    }
  ]
}
EOF

# Crear usuario para la app
mc admin user add local gym-app UnaContraseñaSeguraParaLaApp456!

# Asignar política
mc admin policy attach local app-policy --user gym-app

# Crear access key para usar en la app
mc admin user svcacct add local gym-app
# Esto genera ACCESS_KEY y SECRET_KEY - guárdalos!
```

### Fase 5: Integrar con la App React

#### 5.1 Instalar SDK de S3

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

#### 5.2 Crear cliente S3 (src/lib/videoStorage.js)

```javascript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: 'us-east-1', // MinIO ignora esto pero es requerido
  endpoint: import.meta.env.VITE_MINIO_ENDPOINT, // https://videos.tudominio.com
  credentials: {
    accessKeyId: import.meta.env.VITE_MINIO_ACCESS_KEY,
    secretAccessKey: import.meta.env.VITE_MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // Requerido para MinIO
})

const BUCKET = 'exercise-videos'

/**
 * Sube un video y retorna la key
 */
export async function uploadVideo(file, exerciseId) {
  const key = `${exerciseId}/${Date.now()}-${file.name}`

  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file,
    ContentType: file.type,
  }))

  return key
}

/**
 * Obtiene URL firmada para ver un video (válida por 1 hora)
 */
export async function getVideoUrl(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  })

  return getSignedUrl(s3Client, command, { expiresIn: 3600 })
}

/**
 * Elimina un video
 */
export async function deleteVideo(key) {
  await s3Client.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }))
}
```

#### 5.3 Variables de entorno (.env.local)

```bash
VITE_MINIO_ENDPOINT=https://videos.tudominio.com
VITE_MINIO_ACCESS_KEY=tu-access-key
VITE_MINIO_SECRET_KEY=tu-secret-key
```

#### 5.4 Modificar schema de Supabase

```sql
-- Añadir columna para video en exercises (si no existe)
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS video_key TEXT;

-- O crear tabla separada para videos
CREATE TABLE IF NOT EXISTS exercise_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  video_key TEXT NOT NULL,
  filename TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Flujo de Uso

### Subir un video

```
1. Usuario selecciona video en la app
2. App sube video a MinIO → obtiene video_key
3. App guarda video_key en Supabase (tabla exercises o exercise_videos)
4. Confirmación al usuario
```

### Ver un video

```
1. App obtiene video_key de Supabase
2. App genera presigned URL con MinIO
3. Video player carga desde la URL firmada
4. URL expira en 1 hora (seguridad)
```

---

## Consideraciones de Seguridad

| Aspecto | Solución |
|---------|----------|
| Acceso a MinIO | Solo vía Cloudflare Tunnel (HTTPS) |
| Credenciales | Variables de entorno, nunca en código |
| URLs de video | Presigned URLs con expiración |
| Bucket público | NO - siempre usar URLs firmadas |
| Backups | Cron job semanal a disco externo o cloud |
| Actualizaciones | `apt update && apt upgrade` mensual |

---

## Mantenimiento

### Monitoreo básico

```bash
# Ver uso de disco
df -h /mnt/videos

# Ver logs de MinIO
docker logs minio --tail 100

# Ver estado del túnel
sudo systemctl status cloudflared

# Ver recursos
htop
```

### Backup de MinIO

```bash
# Backup a otro disco o carpeta
mc mirror local/exercise-videos /path/to/backup/

# O sincronizar a cloud (B2, Wasabi, etc)
mc mirror local/exercise-videos b2/backup-bucket/
```

### Actualizar MinIO

```bash
cd ~/minio-config
docker compose pull
docker compose up -d
```

---

## Troubleshooting

### MinIO no arranca

```bash
# Ver logs
docker logs minio

# Verificar permisos del disco
ls -la /mnt/videos/minio-data

# Verificar espacio
df -h
```

### Túnel no conecta

```bash
# Ver estado
sudo systemctl status cloudflared

# Ver logs
sudo journalctl -u cloudflared -f

# Probar manualmente
cloudflared tunnel run gym-videos
```

### Videos no cargan en la app

```bash
# Verificar que MinIO responde
curl https://videos.tudominio.com/minio/health/live

# Probar acceso al bucket
mc ls local/exercise-videos

# Verificar CORS si hay errores en browser
mc admin config set local api cors_allow_origin="*"
mc admin service restart local
```

---

## Resumen de Costos

| Concepto | Costo |
|----------|-------|
| Raspberry Pi 4 (4-8GB) | €60-85 (único) |
| HDD 1-2TB | €45-70 (único) |
| Accesorios | €25-35 (único) |
| Dominio | €10-15/año |
| Cloudflare | Gratis |
| Supabase | Gratis (free tier) |
| Electricidad | ~€2-3/mes |
| **Total primer año** | **~€150-220** |
| **Años siguientes** | **~€35-50/año** |

Comparado con Supabase Storage Pro (~$300/año para 100GB), esta solución se amortiza en ~6 meses y ofrece storage ilimitado.
