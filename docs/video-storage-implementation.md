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
│ • Edge Functions    │      │  HDD 7TB                    │
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

### Ubicaciones importantes

| Qué | Dónde |
|-----|-------|
| Configuración MinIO | `~/minio-config/docker-compose.yml` |
| Credenciales MinIO | `~/minio-config/.env` |
| Datos de videos | `/mnt/videos/minio-data` |
| Config Cloudflare | `/etc/cloudflared/config.yml` |

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
