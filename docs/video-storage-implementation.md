# Implementación de Video Storage con MinIO

## Resumen

Sistema de almacenamiento de videos usando MinIO self-hosted en Raspberry Pi, accesible a través de Cloudflare Tunnel.

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    App React                             │
│                                                          │
│  1. Usuario sube video                                   │
│  2. App pide presigned URL → Edge Function               │
│  3. App sube video directo a MinIO                       │
│  4. App guarda key en Supabase                           │
└─────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐      ┌─────────────────────────────┐
│   Supabase Cloud    │      │      Raspberry Pi           │
│                     │      │                             │
│ • Auth              │      │  MinIO (puerto 9000/9001)   │
│ • PostgreSQL        │      │  Cloudflare Tunnel          │
│ • Edge Functions    │      │  SSD 250GB (USB-SATA)       │
│   - video-upload    │      │                             │
│   - video-url       │      │  URL: videos.diariogym.com  │
└─────────────────────┘      └─────────────────────────────┘
```

## Raspberry Pi

### Componentes instalados

- **Raspberry Pi OS Lite 64-bit**
- **Docker** - Contenedor de MinIO
- **MinIO** - Storage S3-compatible
- **Cloudflare Tunnel** - Exposición segura a internet

### Hardware

- **Disco**: SSD Samsung 850 EVO 250GB conectado por USB-SATA (adaptador JMicron JM20329, VID `152d:2329`)
- **Montaje**: `/mnt/videos` (entrada en `/etc/fstab` con `nofail` — el sistema arranca aunque el SSD esté desconectado)

⚠️ **El adaptador JMicron es notoriamente flakey** (incidencias registradas: 2026-06-15, 2026-07-11/12 — el adaptador suelta el SSD del bus USB y deja las subidas fallando al 100%). Considerar sustituirlo por uno con chip **ASMedia ASM1153E**. Si las subidas empiezan a colgarse:
1. `lsusb | grep JMicron` — si no aparece, el cable o el adaptador han cascado
2. `lsblk` — si no aparece `sda`/`sdb`, mismo síntoma
3. `mountpoint /mnt/videos` — si dice "is not a mountpoint", el SSD se desmontó
4. Reasentar cable USB → `sudo mount -a` → `docker restart minio`

**El monitor `check-minio.sh` ahora intenta los pasos 1–4 automáticamente** (ver [Monitorización](#monitorización)). Solo hace falta tu mano si el adaptador está **físicamente muerto** (no reaparece en el bus ni tras el reset USB por software).

> **Síntoma clásico "mount fantasma"**: el adaptador suelta el disco y éste re-enumera con otro nombre (`sda`↔`sdb`), pero la entrada de mount vieja sigue viva → `mountpoint` dice OK y `/minio/health/live` responde 200, pero **toda lectura/escritura da `Input/output error`**. Por eso el monitor hace una prueba de I/O real (fichero canario), no solo `mountpoint`.

### Ubicaciones importantes

| Qué | Dónde |
|-----|-------|
| Configuración MinIO | `~/minio-config/docker-compose.yml` |
| Credenciales MinIO | `~/minio-config/.env` |
| Datos de videos | `/mnt/videos/minio-data` |
| Config Cloudflare | `/etc/cloudflared/config.yml` |
| Monitor de salud | `/usr/local/bin/check-minio.sh` (cron cada 15 min) |

### Comandos útiles

```bash
# SSH a la Pi
ssh pi@[IP-LOCAL-PI]
# o
ssh pi@[HOSTNAME-PI].local

# Ver estado de MinIO
docker ps
docker logs minio

# Ver estado del túnel
sudo systemctl status cloudflared

# Ver espacio en disco
df -h /mnt/videos

# Reiniciar MinIO
cd ~/minio-config && docker compose restart

# Reiniciar túnel
sudo systemctl restart cloudflared
```

### Credenciales MinIO

```
Endpoint: https://[TU-SUBDOMINIO-MINIO].[TU-DOMINIO].com
Console: https://[TU-SUBDOMINIO-MINIO].[TU-DOMINIO].com:9001 (no expuesto)
Bucket: exercise-videos

# Credenciales root (en ~/minio-config/.env)
Usuario: [ver archivo .env]
Password: [ver archivo .env]

# Access keys para la app (en Supabase secrets)
Access Key: [en Supabase Edge Function secrets]
Secret Key: [en Supabase Edge Function secrets]
```

### Monitorización

Un script vigila el storage cada 15 minutos y envía alerta cuando algo se rompe (mount caído, container parado, endpoint `/health/live` no responde, o el disco no acepta escrituras — "mount fantasma").

**Componentes en la Pi**:

| Qué | Dónde |
|-----|-------|
| Script | `/usr/local/bin/check-minio.sh` |
| Config (topic ntfy) | `/etc/default/minio-monitor` |
| Estado actual | `/var/lib/minio-monitor/state` (`OK` o `FAIL`) |
| Log | `/var/log/minio-monitor.log` |
| Cron | `*/15 * * * * /usr/local/bin/check-minio.sh` (crontab de root) |

**Qué comprueba**:
1. `/mnt/videos` montado → si no, intenta `mount -a` antes de marcar fallo (auto-recovery).
2. **I/O real**: escribe y lee un fichero canario (`.minio-monitor-canary`) en `/mnt/videos`. Detecta el **"mount fantasma"** — el adaptador USB-SATA suelta el SSD pero la entrada de mount sigue viva — que los otros checks NO ven: `mountpoint` sigue dando OK y `/health/live` responde 200 aunque toda escritura falle con `Input/output error`. Este fue el caso real que dejó las subidas fallando al 100% sin que saltara ninguna alerta.
3. Container `minio` en estado `running`.
4. `GET http://127.0.0.1:9000/minio/health/live` → 200.

**Sólo notifica en transiciones** (OK → FAIL o FAIL → OK), no spam.

**Fuente de verdad del script**: [`scripts/raspberry-pi/check-minio.sh`](../scripts/raspberry-pi/check-minio.sh) en este repo. Para desplegar cambios a la Pi:
```bash
scp scripts/raspberry-pi/check-minio.sh pi@<pi>:/tmp/ && \
  ssh pi@<pi> 'sudo install -m 0755 /tmp/check-minio.sh /usr/local/bin/check-minio.sh'
```

**Auto-reparación** (cuando algún check falla, antes de resignarse a alertar):
- **Nivel 1** — el disco sigue presente en el bus (`blkid -U <uuid>` lo encuentra) pero el mount quedó fantasma / con I/O error → `docker stop minio` → `umount` → `fsck -y` → `mount -a` → `docker start minio`.
- **Nivel 2** — el disco desapareció del bus USB → **reset del puerto USB** (unbind/bind del hub padre vía sysfs; la ruta USB del disco se cachea en `/var/lib/minio-monitor/usb_path` cuando está sano). Si reaparece, aplica Nivel 1.
- **Salvaguardas**: siempre notifica el resultado por ntfy (aunque se auto-repare, para dejar rastro de la incidencia) y aplica **rate-limit** (`MAX_REPAIRS_PER_HOUR=3`, configurable en `/etc/default/minio-monitor`) para no entrar en bucle de reinicios si el hardware agoniza.
- **Límite**: no puede recuperar un cable/adaptador **físicamente muerto** (si no reaparece ni tras el reset USB, alerta para intervención manual).

**Canal de notificación**: [ntfy.sh](https://ntfy.sh) (gratis, sin cuenta). El topic concreto está en `/etc/default/minio-monitor` en la Pi — NO debe commitearse al repo (es un canal público; quien lo conozca puede leer las alertas).

Para suscribirse desde móvil: instalar app **ntfy** (iOS/Android) → añadir el topic. O en navegador: `https://ntfy.sh/<topic>`.

Para cambiar de topic (rotar si se filtra) o de canal (Slack, etc.):
```bash
sudo nano /etc/default/minio-monitor   # cambiar NTFY_TOPIC
```

Para enviar una notificación de prueba al topic actual (verifica que el canal funciona sin esperar un fallo real):
```bash
source /etc/default/minio-monitor
curl -d "test" -H "Title: Prueba manual" "https://ntfy.sh/$NTFY_TOPIC"
```

Si `NTFY_TOPIC` se deja vacío, el script sigue funcionando pero sólo loguea a `/var/log/minio-monitor.log`.

## App React

### Archivos relevantes

| Archivo | Propósito |
|---------|-----------|
| `src/lib/videoStorage.js` | Cliente para subir/obtener videos |
| `supabase/functions/video-upload/` | Edge Function para presigned URL de subida |
| `supabase/functions/video-url/` | Edge Function para presigned URL de descarga |
| `src/components/Workout/SetCompleteModal.jsx` | UI de subida de video |
| `src/components/Workout/SetNotesView.jsx` | UI de visualización de video |

### Flujo de subida

1. Usuario selecciona video en `SetCompleteModal`
2. `uploadVideo()` llama a Edge Function `video-upload`
3. Edge Function verifica permisos (`user_settings.can_upload_video`)
4. Edge Function genera presigned URL de MinIO
5. App sube video directo a MinIO con PUT
6. App guarda la `key` en `completed_sets.video_url`

### Flujo de visualización

1. `SetNotesView` recibe `video_url` (key de MinIO)
2. `VideoPlayer` llama a Edge Function `video-url`
3. Edge Function genera presigned URL (válida 1 hora)
4. Video se carga desde la URL firmada

### Compatibilidad con Cloudinary

El `VideoPlayer` detecta si `video_url` empieza con `http`:
- Si es URL completa → la usa directamente (legacy Cloudinary)
- Si es key → obtiene presigned URL de MinIO

## Base de datos

### Tabla: user_settings

```sql
CREATE TABLE user_settings (
    user_id UUID REFERENCES auth.users(id),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);
```

Settings usados:
- `can_upload_video` = `'true'` → Puede subir videos
- `is_admin` = `'true'` → Acceso a panel de admin

### Columna: completed_sets.video_url

Guarda la key del video en MinIO (ej: `uuid/timestamp-filename.mp4`)

## Panel de administración

- **Ruta**: `/admin/users`
- **Acceso**: Solo usuarios con `is_admin = 'true'`
- **Funcionalidad**: Toggle de feature flags por usuario

## Secrets en Supabase

Variables configuradas en Edge Functions:

```
MINIO_ENDPOINT=https://[TU-SUBDOMINIO-MINIO].[TU-DOMINIO].com
MINIO_ACCESS_KEY=[TU-ACCESS-KEY]
MINIO_SECRET_KEY=[TU-SECRET-KEY]
```

## Desarrollo local

```bash
# Iniciar Colima + Supabase
colima start
DOCKER_HOST="unix:///Users/sergio/.colima/default/docker.sock" npx supabase start

# Servir Edge Functions localmente
DOCKER_HOST="unix:///Users/sergio/.colima/default/docker.sock" npx supabase functions serve --env-file supabase/functions/.env.local

# Dar permisos a usuario local
docker exec -i supabase_db_gym-routine-page psql -U postgres -d postgres -c \
  "INSERT INTO user_settings (user_id, key, value) SELECT id, 'can_upload_video', 'true' FROM auth.users WHERE email = 'tu@email.com';"
```

## Despliegue

```bash
# Desplegar Edge Functions
npx supabase functions deploy video-upload
npx supabase functions deploy video-url

# Ejecutar migraciones en producción
npx supabase db push
```

## Configuración de dominio

### Arquitectura de dominios

| Dominio | Servicio | Propósito |
|---------|----------|-----------|
| `tudominio.com` | Vercel | App React (producción) |
| `www.tudominio.com` | Vercel | Redirect a dominio raíz |
| `videos.tudominio.com` | Cloudflare Tunnel → Raspberry Pi | MinIO storage |
| `tuapp.vercel.app` | Vercel | URL por defecto |

### Cloudflare DNS

Registros configurados en Cloudflare Dashboard → DNS → Records:

| Tipo | Nombre | Valor | Proxy |
|------|--------|-------|-------|
| A | `@` | `[IP-DE-VERCEL]` | DNS only (gris) |
| CNAME | `www` | `[TU-CNAME-VERCEL].vercel-dns.com` | DNS only (gris) |
| CNAME | `videos` | `[TU-TUNNEL-ID].cfargotunnel.com` | Proxied (naranja) |

**Importante**: Los registros para Vercel deben tener proxy desactivado (nube gris) para que Vercel maneje el SSL.

### Cloudflare Tunnel

El túnel conecta el subdominio de videos con MinIO en la Raspberry Pi.

```yaml
# /etc/cloudflared/config.yml (en Raspberry Pi)
tunnel: [TU-TUNNEL-ID]
credentials-file: /etc/cloudflared/[TU-TUNNEL-ID].json

ingress:
  - hostname: videos.tudominio.com
    service: http://localhost:9000
  - service: http_status:404
```

### Vercel

Configuración en Vercel Dashboard → Project → Settings → Domains:

1. `tudominio.com` (dominio principal)
2. `www.tudominio.com` → Redirect 307 a dominio raíz
3. `tuapp.vercel.app` (URL por defecto)

### Supabase

En Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://tudominio.com`
- **Redirect URLs**:
  - `https://tudominio.com/**`
  - `http://localhost:5173/**` (desarrollo)
