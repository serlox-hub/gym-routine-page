# Decisiones e implementaciones

Log **append-only** de lo **no derivable del código**: decisiones, trade-offs y gotchas que un
agente/dev futuro no vería solo leyendo los archivos. **Terso y denso**: cada línea aporta algo;
sin relleno ni repetir lo que ya está en el código o en `CLAUDE.md`. Convención de dónde va cada
tipo de contexto: `CLAUDE.md` → "Contexto para futuros agentes".

Formato por entrada: `## AAAA-MM · Título` y bullets `**Clave:** motivo/gotcha` (1 línea c/u).

---

## 2026-07 · GIFs de ejercicios (issue #6)
- **Hosting:** bucket público `exercise-gifs`; la ruta lleva subcarpeta **`gif/`** obligatoria (sin ella → 404): `.../public/exercise-gifs/gif/<gif_key>_<180|360|720>.gif`.
- **Tamaño por superficie** (egress): 180 listas · 360 sesión · 720 pantalla completa.
- **Native usa `expo-image`**, no el `<Image>` de RN (que no anima GIF en Android) → módulo nativo, requiere rebuild del dev client.
- **Sin GIF en ficha/historial** (decisión de producto): va en sesión y catálogo, no en el modal de progreso.
- **GIF apilado sobre las instrucciones**, no al lado (en tarjeta estrecha el texto se estrechaba).
- **`gif_key` NULL = sin animación**; fallback sin hueco roto.
- **Catálogo: lazy-load en viewport, no tap-to-play** (póster estático descartado: exigiría extraer 266 primeros frames).
- ⚠️ **Pendiente:** bucket sirve con `Cache-Control: no-cache`; pasar a `immutable` o el egress se dispara.
