-- ============================================
-- MIGRACIÓN 048: unificar duplicados de Espalda + GIF a 3 ejercicios fuera del seed
-- ============================================
-- Producción tenía 3 ejercicios de sistema añadidos en 2026-04 que NO están en el seed:
--   Close Neutral-Grip Lat Pulldown, Wide Neutral-Grip Lat Pulldown, T-Bar Row Machine.
-- Análisis de duplicados (por uso real):
--   • 'Close Neutral-Grip Lat Pulldown' (neutro estrecho) == 'V-Bar Lat Pulldown' (barra V).
--     Se conserva el nombre "neutro estrecho"; se retira "barra V" (0 referencias).
--   • 'T-Bar Row Machine' (máquina T) == 'T-Bar Row' (barra T).
--     Se conserva "máquina T" (tiene historial); se retira "barra T" (0 referencias).
--   • 'Wide Neutral-Grip Lat Pulldown' (neutro ancho) NO es duplicado de 'Wide-Grip Lat Pulldown'
--     (ancho prono, agarre distinto) → se conserva con su propio GIF (ancho neutro).
-- Los retirados (V-Bar, T-Bar Row) tienen 0 usos en rutinas/sesiones/stats/overrides,
-- por eso no hace falta repuntar referencias.

-- 1. GIF a los 3 ejercicios que se quedan (assets ya en Storage)
UPDATE exercises SET gif_key = '5623'  WHERE name_en = 'Close Neutral-Grip Lat Pulldown' AND is_system = true;  -- animación V-bar (neutro estrecho)
UPDATE exercises SET gif_key = '10247' WHERE name_en = 'Wide Neutral-Grip Lat Pulldown'  AND is_system = true;  -- Cable Wide Neutral Grip Pulldown (neutro ancho)
UPDATE exercises SET gif_key = '2645'  WHERE name_en = 'T-Bar Row Machine'               AND is_system = true;  -- animación T-bar row (máquina T)

-- 2. Retirar los duplicados vacíos (soft-delete; conservan gif_key pero quedan ocultos)
UPDATE exercises SET deleted_at = now()
 WHERE name_en IN ('V-Bar Lat Pulldown', 'T-Bar Row') AND is_system = true AND deleted_at IS NULL;
