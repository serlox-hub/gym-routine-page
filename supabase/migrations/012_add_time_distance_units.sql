-- Añadir unidades de tiempo y distancia a ejercicios
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS time_unit text DEFAULT 's';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS distance_unit text DEFAULT 'm';

-- Nuevo tipo de medición: distancia × ritmo
ALTER TYPE measurement_type ADD VALUE IF NOT EXISTS 'distance_pace';

-- Columna para ritmo (pace) en completed_sets (segundos por unidad de distancia)
ALTER TABLE completed_sets ADD COLUMN IF NOT EXISTS pace_seconds INTEGER;
