-- Añadir campo superset_group para agrupar ejercicios en supersets/circuitos
-- NULL = ejercicio individual (comportamiento normal)
-- 1, 2, 3... = ID del grupo de superset dentro del bloque

ALTER TABLE routine_exercises ADD COLUMN superset_group INTEGER DEFAULT NULL;

-- Índice para consultas rápidas de ejercicios por superset dentro de un bloque
CREATE INDEX idx_routine_exercises_superset ON routine_exercises(routine_block_id, superset_group);

COMMENT ON COLUMN routine_exercises.superset_group IS 'Agrupa ejercicios en supersets. NULL = individual, mismo número = mismo superset';
