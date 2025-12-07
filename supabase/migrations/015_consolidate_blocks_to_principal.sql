-- ============================================
-- Consolidar bloques no estándar a "Principal"
-- Los únicos bloques válidos son "Calentamiento" y "Principal"
-- Además, unificar bloques duplicados del mismo tipo en cada día
-- ============================================

-- Paso 1: Renombrar bloques no estándar a "Principal"
UPDATE routine_blocks
SET name = 'Principal'
WHERE name NOT IN ('Calentamiento', 'Principal');

-- Paso 2: Para cada día, mover ejercicios de bloques duplicados al primer bloque de ese tipo
-- y recalcular el sort_order para mantener el orden correcto
WITH duplicates AS (
    -- Identificar bloques duplicados (no el primero de cada tipo por día)
    SELECT rb.id, rb.routine_day_id, rb.name,
           ROW_NUMBER() OVER (PARTITION BY rb.routine_day_id, rb.name ORDER BY rb.sort_order) as rn
    FROM routine_blocks rb
),
first_blocks AS (
    -- Obtener el primer bloque de cada tipo por día
    SELECT routine_day_id, name, id as first_block_id
    FROM duplicates
    WHERE rn = 1
),
exercise_new_order AS (
    -- Calcular nuevo sort_order para ejercicios que se van a mover
    SELECT re.id as exercise_id,
           fb.first_block_id as new_block_id,
           (SELECT COALESCE(MAX(re2.sort_order), 0)
            FROM routine_exercises re2
            WHERE re2.routine_block_id = fb.first_block_id) +
           ROW_NUMBER() OVER (PARTITION BY fb.first_block_id ORDER BY rb.sort_order, re.sort_order) as new_sort_order
    FROM routine_exercises re
    JOIN routine_blocks rb ON re.routine_block_id = rb.id
    JOIN duplicates d ON rb.id = d.id
    JOIN first_blocks fb ON rb.routine_day_id = fb.routine_day_id AND rb.name = fb.name
    WHERE d.rn > 1  -- Solo ejercicios de bloques duplicados
)
UPDATE routine_exercises re
SET routine_block_id = eno.new_block_id,
    sort_order = eno.new_sort_order
FROM exercise_new_order eno
WHERE re.id = eno.exercise_id;

-- Paso 3: Eliminar bloques vacíos (los duplicados que ya no tienen ejercicios)
DELETE FROM routine_blocks rb
WHERE NOT EXISTS (
    SELECT 1 FROM routine_exercises re WHERE re.routine_block_id = rb.id
)
AND EXISTS (
    -- Solo eliminar si hay otro bloque del mismo tipo en el mismo día
    SELECT 1 FROM routine_blocks rb2
    WHERE rb2.routine_day_id = rb.routine_day_id
    AND rb2.name = rb.name
    AND rb2.id != rb.id
);
