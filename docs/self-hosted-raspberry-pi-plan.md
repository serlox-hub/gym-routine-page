# Plan: Self-Hosted en Raspberry Pi para Videos

## Contexto

Objetivo: Almacenar videos de ejercicios para la app de gym tracker.
Usuarios: Uso personal + amigos (grupo pequeño y conocido).
Requisito principal: Storage grande y económico para videos.

---

## Análisis de Opciones

### Opción 1: Supabase Hosted

| Aspecto | Detalle |
|---------|---------|
| Free tier | 1GB storage (insuficiente para videos) |
| Pro ($25/mes) | 8GB + $0.021/GB extra |
| Costo 100GB | ~$27/mes |
| Costo 500GB | ~$35/mes |

**Veredicto**: Caro para videos. No tiene sentido económico.

### Opción 2: VPS con Supabase Self-Hosted

| Proveedor | Costo | Storage |
|-----------|-------|---------|
| Hetzner | €4-8/mes | 40-160GB |
| Contabo | $6-12/mes | 200-400GB |
| DigitalOcean | $6-12/mes | 50-100GB |

**Veredicto**: Mejor relación precio/storage, pero sigue siendo pago mensual recurrente.

### Opción 3: Raspberry Pi en Casa (Recomendada)

| Aspecto | Detalle |
|---------|---------|
| Costo inicial | ~€100-150 (Pi + discos + accesorios) |
| Costo mensual | ~€2-3 electricidad |
| Storage | 1TB+ (lo que quieras añadir) |
| Escalabilidad | Añadir discos según necesidad |

**Veredicto**: Ideal para uso personal/amigos. Costo único, storage ilimitado.

---

## Por Qué Raspberry Pi Funciona Para Este Caso

### Ventajas

1. **Usuarios conocidos**: Si hay downtime, se comunica fácilmente
2. **Pocos usuarios concurrentes**: No habrá carga alta simultánea
3. **Videos pesan mucho**: 1TB gratis vs $20-50/mes en cloud
4. **Sin SLA requerido**: No es un negocio, el downtime ocasional es aceptable
5. **Control total**: Tus datos en tu hardware

### Desventajas Mitigables

| Problema | Solución |
|----------|----------|
| IP dinámica | Cloudflare Tunnel (gratis) |
| Puertos expuestos | Cloudflare Tunnel (no abre puertos) |
| Cortes de luz | UPS básico (opcional) |
| Fiabilidad SD card | Usar SSD/HDD externo para datos |

---

## Hardware Recomendado

### Mínimo

```
Raspberry Pi 4 (4GB RAM)          ~€60
SSD externo 256GB (para DB/OS)    ~€35
HDD externo 1TB (para videos)     ~€45
Fuente alimentación oficial       ~€10
Caja con ventilación              ~€15
─────────────────────────────────────
Total aproximado                  ~€165
```

### Recomendado

```
Raspberry Pi 4 (8GB RAM)          ~€85
SSD externo 512GB (para DB/OS)    ~€50
HDD externo 2TB (para videos)     ~€70
Fuente alimentación oficial       ~€10
Caja con ventilación activa       ~€20
UPS básico (opcional)             ~€40
─────────────────────────────────────
Total aproximado                  ~€275
```

---

## Arquitectura Propuesta

### Stack Simplificado (en vez de Supabase completo)

Supabase completo consume muchos recursos para una Pi. Mejor correr solo lo necesario:

```
┌─────────────────────────────────────────────────────┐
│                   Raspberry Pi 4                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌─────────────┐     ┌─────────────────────────┐   │
│   │ PostgreSQL  │     │   API Backend           │   │
│   │   (datos)   │◄────│   (Express/Fastify)     │   │
│   └─────────────┘     │   - Auth (JWT simple)   │   │
│         │             │   - CRUD ejercicios     │   │
│      [SSD]            │   - Upload videos       │   │
│                       │   - Serve videos        │   │
│   ┌─────────────┐     └───────────┬─────────────┘   │
│   │   Videos    │                 │                  │
│   │  (archivos) │◄────────────────┘                  │
│   └─────────────┘                                    │
│         │                                            │
│      [HDD 1TB]                                       │
│                                                      │
└──────────────────────────┬──────────────────────────┘
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

### Componentes

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| Base de datos | PostgreSQL | Rutinas, ejercicios, sesiones |
| Backend API | Express.js o Fastify | REST API + manejo de archivos |
| Autenticación | JWT simple o Lucia Auth | Login usuarios |
| Proxy/HTTPS | Cloudflare Tunnel | Acceso externo seguro |
| Videos | Sistema de archivos | Servidos directamente |

### Por Qué NO Supabase Completo en Pi

Supabase incluye muchos servicios que consumen RAM:

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

Una Pi 4 con 4GB puede correrlo, pero irá justa. Mejor usar solo PostgreSQL + un backend simple.

---

## Cloudflare Tunnel: Acceso Externo Seguro

### Qué es

Un túnel encriptado entre tu Pi y Cloudflare. Los usuarios acceden a través de Cloudflare, nunca directamente a tu red.

### Ventajas

- **No abres puertos** en tu router
- **IP dinámica no importa** - Cloudflare maneja el DNS
- **HTTPS automático** y gratis
- **Tu IP real oculta** - protección DDoS incluida
- **Gratis** para uso personal

### Setup básico

```bash
# Instalar cloudflared en la Pi
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Autenticar (abre navegador)
cloudflared tunnel login

# Crear túnel
cloudflared tunnel create gym-tracker

# Configurar (archivo config.yml)
tunnel: <TUNNEL_ID>
credentials-file: /home/pi/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: gym.tudominio.com
    service: http://localhost:3000
  - service: http_status:404

# Ejecutar
cloudflared tunnel run gym-tracker
```

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

## Implementación por Fases

### Fase 1: Setup Básico

1. Instalar Raspberry Pi OS Lite (64-bit)
2. Configurar SSD como disco principal
3. Montar HDD para videos
4. Instalar Docker
5. Configurar PostgreSQL en contenedor
6. Restaurar/migrar datos de Supabase actual

### Fase 2: Backend API

1. Crear API simple (Express/Fastify)
2. Endpoints para ejercicios, rutinas, sesiones
3. Autenticación JWT
4. Endpoint para upload de videos
5. Servir videos estáticos

### Fase 3: Acceso Externo

1. Registrar dominio (o usar subdominio existente)
2. Configurar Cloudflare Tunnel
3. Probar acceso desde fuera de la red local
4. Configurar como servicio systemd (auto-inicio)

### Fase 4: Migración Frontend

1. Actualizar URLs de API en la app React
2. Adaptar llamadas de Supabase a REST API
3. Implementar upload de videos en el frontend
4. Testing con usuarios reales

---

## Consideraciones de Seguridad

1. **Backups**: Configurar backup automático de PostgreSQL a otro disco o cloud
2. **Actualizaciones**: Mantener el sistema operativo actualizado
3. **Firewall**: UFW configurado, solo permitir lo necesario
4. **Auth**: JWT con expiración, refresh tokens
5. **Rate limiting**: Limitar requests para evitar abusos
6. **Validación**: Validar tipos de archivo en uploads (solo videos)

---

## Alternativa: Híbrido

Si quieres mantener Supabase para la DB (gratis) y solo self-hostear videos:

```
┌─────────────────┐         ┌─────────────────┐
│  Supabase       │         │  Raspberry Pi   │
│  (hosted)       │         │  (en casa)      │
│                 │         │                 │
│  - PostgreSQL   │         │  - Videos API   │
│  - Auth         │         │  - HDD 1TB      │
│  - API REST     │         │                 │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └───────────┬───────────────┘
                     │
              ┌──────▼──────┐
              │   App React │
              │  (Frontend) │
              └─────────────┘
```

**Ventajas del híbrido**:
- Menos trabajo de migración
- Auth y DB ya funcionan
- Solo implementas storage de videos
- Si la Pi falla, la app sigue funcionando (sin videos)

---

## Resumen

| Aspecto | Decisión |
|---------|----------|
| Hardware | Raspberry Pi 4 (8GB) + SSD + HDD 1TB |
| Acceso externo | Cloudflare Tunnel |
| Base de datos | PostgreSQL (o mantener Supabase hosted) |
| Videos | Servidos desde HDD local |
| Costo estimado | €150-275 único + €2-3/mes electricidad |

Para un grupo pequeño de amigos, esta solución ofrece storage prácticamente ilimitado por un costo único, con la flexibilidad de escalar añadiendo más discos si fuera necesario.
