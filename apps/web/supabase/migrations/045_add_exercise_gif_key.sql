-- ============================================
-- MIGRACIÓN 045: columna gif_key para animaciones de ejercicios
-- ============================================
-- Almacena el id de producto de Gym Visual (compra pedido 57847, licencia N-CRFL).
-- La URL pública del GIF se construye en @gym/shared a partir de gif_key:
--   <SUPABASE_URL>/storage/v1/object/public/exercise-gifs/gif/<gif_key>_<size>.gif
--   size ∈ {360, 720}  (subidos ya al bucket, 532 objetos bajo el prefijo gif/)
-- Ejercicios que comparten animación comparten gif_key (mismo asset).
-- gif_key NULL = sin animación disponible (p. ej. Spanish Squat, no existe en Gym Visual).

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gif_key TEXT;

COMMENT ON COLUMN exercises.gif_key IS
  'Id de producto Gym Visual. URL pública: <storage>/exercise-gifs/gif/<gif_key>_<360|720>.gif';

-- Índice opcional: normalmente se filtra por is_system/muscle, no por gif_key,
-- pero ayuda si algún día se listan ejercicios "con animación".
CREATE INDEX IF NOT EXISTS idx_exercises_gif_key ON exercises(gif_key) WHERE gif_key IS NOT NULL;
