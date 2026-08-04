# Catálogo de color tokens

Referencia de consulta (no invariante): los **nombres exactos** de los tokens de color por
categoría, para elegir token al escribir un componente. Las **reglas** de uso (nunca hardcodear
hex/rgba, añadir todo color nuevo a ambos `styles.js`, el gotcha del alpha del lima `success`,
etc.) viven en `CLAUDE.md` → "Color System" — esas sí son invariantes.

Fuente de verdad del **valor** de cada token: `apps/web/src/lib/styles.js` y
`apps/gym-native/src/lib/styles.js` (objeto `colors`, idéntico en ambos).

## Categorías

- **Fondos:** `bgPrimary`, `bgSecondary`, `bgAlt`, `bgTertiary`, `bgHover`
- **Texto:** `textPrimary`, `textSecondary`, `textMuted`, `textLight`, `textDisabled`, `textDark`, `white`, `black`
- **Acentos:** `success`, `warning`, `danger`, `purple`, `purpleAccent`, `teal`, `pink`, `orange` (acento naranja + dropset), `gold`, `actionPrimary` (lima = acción primaria), `gifBg` (panel claro para GIFs)
- **Fondos semánticos (alpha):** `purpleBg`, `purpleAccentBg`, `successBg`, `successBgSubtle`, `warningBg`, `orangeBg`, `goldBg`, `dangerBg`, `actionPrimaryBg`, `overlay`, `overlaySoft`
- **Bordes:** `border`, `borderSubtle`

⚠️ **NO existen** tokens `accent`/`accentHover`/`accentBg`/`accentBgSubtle` — el acento naranja es
`orange`/`orangeBg`; la acción primaria (lima) es `actionPrimary`/`actionPrimaryBg`.
