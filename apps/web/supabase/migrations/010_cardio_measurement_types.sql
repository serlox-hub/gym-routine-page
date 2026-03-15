-- Añadir tipos de medición para cardio
ALTER TYPE measurement_type ADD VALUE IF NOT EXISTS 'level_time';
ALTER TYPE measurement_type ADD VALUE IF NOT EXISTS 'level_distance';
ALTER TYPE measurement_type ADD VALUE IF NOT EXISTS 'level_calories';
ALTER TYPE measurement_type ADD VALUE IF NOT EXISTS 'distance_time';

-- Añadir columna level para resistencia/inclinación en máquinas de cardio
ALTER TABLE completed_sets ADD COLUMN IF NOT EXISTS level SMALLINT;
