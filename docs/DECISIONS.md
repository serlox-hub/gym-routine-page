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

## 2026-07 · Hispanización de instrucciones (LatAm → España)
- **Qué:** `instructions.es` del seed original (025, catálogo v5) estaba en español latino. Normalizado a **español de España** (catálogo **v6**, migración **050**). **62/269** ejercicios afectados; el bloque `en` no se toca. Dos pasadas: (1) voseo→tuteo, (2) léxico.
- **Voseo — no es quitar acentos:** hay cambios de raíz (`volvé→vuelve`, `apretá→aprieta`, `extendé→extiende`, `sentí→siente`, `repetí→repite`) e irregulares (`mantené→mantén`, `sostené→sostén`), y enclíticos con tilde (`bajala→bájala`, `aprovechala→aprovéchala`, `sentate→siéntate`). Se usó **mapa curado** (no regex genérico) para acertar cada forma.
- **`parate` (7×) → `colócate`:** en España "pararse" = detenerse, no ponerse de pie; además `Parate al centro → Colócate en el centro`.
- **Léxico:** `manija→asa` (20×; el corpus ya usaba "asa" 33× → se unifica, con concordancia `una manija→un asa`, `la manija→el asa`); `hacia adelante→hacia delante` (16×; ya había 48 "hacia delante"); `hacia afuera/adentro→hacia fuera/dentro`; `toma→coge` (asir objeto; "tomar" en España es beber/tomar decisión); `regresa→vuelve`.
- **Se MANTUVO `pantorrilla`** (válido en España y coincide con el nombre del grupo muscular en BD; cambiarlo a "gemelos" tocaría la taxonomía de `muscle_groups`, otro alcance). `agarrar` también se mantiene (estándar en España).
- **Migración 050 hace match por `name_en`** (no `name_es`) porque los name_es de prod pueden variar (ver 049); embebe el `instructions` jsonb completo por ejercicio. Idempotente. Incluye `DO` block que avisa si <62 filas casan por nombre.
- **025 NO se editó** (disciplina append-only de migraciones ya aplicadas); el estado final es 025 (español latino) + 050 (fix). El catálogo v6 sí es la fuente para futuros re-seeds.
