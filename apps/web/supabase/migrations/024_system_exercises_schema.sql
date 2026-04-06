-- ============================================
-- MIGRACIÓN: Ejercicios del sistema + refactor de unidades
-- ============================================

-- 1. Nuevas columnas en exercises
ALTER TABLE exercises RENAME COLUMN name TO name_es;
ALTER TABLE exercises ADD COLUMN name_en TEXT;
ALTER TABLE exercises ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE;
-- instructions ya existe como TEXT, cambiar a JSONB (los datos custom del usuario se pierden intencionalmente)
ALTER TABLE exercises DROP COLUMN IF EXISTS instructions;
ALTER TABLE exercises ADD COLUMN instructions JSONB;
ALTER TABLE exercises ADD COLUMN equipment TEXT;

-- 2. Eliminar time_unit y distance_unit (se deducen del valor en la UI)
-- Mantener weight_unit como nullable: NULL = usa preferencia del usuario, valor = override
ALTER TABLE exercises DROP COLUMN IF EXISTS time_unit;
ALTER TABLE exercises DROP COLUMN IF EXISTS distance_unit;
-- weight_unit ya existe, hacerla nullable con NULL como default para nuevos ejercicios
ALTER TABLE exercises ALTER COLUMN weight_unit DROP DEFAULT;
ALTER TABLE exercises ALTER COLUMN weight_unit DROP NOT NULL;

-- 3. Tabla de músculos secundarios
CREATE TABLE exercise_secondary_muscles (
    exercise_id INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_group_id INT NOT NULL REFERENCES muscle_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, muscle_group_id)
);

CREATE INDEX idx_exercise_secondary_muscles_exercise ON exercise_secondary_muscles(exercise_id);
CREATE INDEX idx_exercise_secondary_muscles_muscle ON exercise_secondary_muscles(muscle_group_id);

-- RLS para exercise_secondary_muscles (lectura pública, como muscle_groups)
ALTER TABLE exercise_secondary_muscles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all"
    ON exercise_secondary_muscles FOR SELECT
    USING (true);

-- Solo el sistema puede insertar/actualizar (via migraciones), no los usuarios
-- No se crean policies de INSERT/UPDATE/DELETE para usuarios

-- 4. Ajustar RLS de exercises para incluir ejercicios del sistema
DROP POLICY IF EXISTS "Users can view own exercises" ON exercises;
CREATE POLICY "Users can view own and system exercises"
    ON exercises FOR SELECT
    USING (auth.uid() = user_id OR is_system = true);

-- Proteger ejercicios del sistema de modificación
DROP POLICY IF EXISTS "Users can update own exercises" ON exercises;
CREATE POLICY "Users can update own exercises"
    ON exercises FOR UPDATE
    USING (auth.uid() = user_id AND is_system = false);

DROP POLICY IF EXISTS "Users can delete own exercises" ON exercises;
CREATE POLICY "Users can delete own exercises"
    ON exercises FOR DELETE
    USING (auth.uid() = user_id AND is_system = false);

-- 5. Índices
CREATE INDEX idx_exercises_system ON exercises(is_system) WHERE is_system = true;
CREATE INDEX idx_exercises_equipment ON exercises(equipment);
