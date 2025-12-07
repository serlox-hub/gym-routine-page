-- ============================================
-- MIGRACIÓN: Crear tabla session_exercises
-- Guarda snapshot de ejercicios de cada sesión
-- ============================================

-- ============================================
-- 1. CREAR TABLA session_exercises
-- ============================================

CREATE TABLE session_exercises (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id INT REFERENCES exercises(id),
    routine_exercise_id INT REFERENCES routine_exercises(id),  -- NULL para extras
    sort_order SMALLINT NOT NULL,
    series SMALLINT NOT NULL,
    reps TEXT NOT NULL,
    rir SMALLINT,
    rest_seconds INT,
    tempo TEXT,
    notes TEXT,
    superset_group INT,
    is_extra BOOLEAN DEFAULT FALSE,
    block_name TEXT,  -- 'Calentamiento', 'Principal', 'Añadido'

    UNIQUE(session_id, sort_order)
);

CREATE INDEX idx_session_exercises_session ON session_exercises(session_id);
CREATE INDEX idx_session_exercises_exercise ON session_exercises(exercise_id);

-- Habilitar RLS
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON session_exercises FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE session_exercises IS 'Snapshot de ejercicios realizados en cada sesión. Independiente de cambios en routine_exercises.';
COMMENT ON COLUMN session_exercises.routine_exercise_id IS 'Referencia al ejercicio original de la rutina. NULL si fue añadido como extra.';
COMMENT ON COLUMN session_exercises.is_extra IS 'TRUE si el ejercicio fue añadido durante la sesión, no venía de la rutina.';

-- ============================================
-- 2. MIGRAR DATOS HISTÓRICOS
-- Crear session_exercises para sesiones existentes
-- ============================================

-- Crear session_exercises para cada combinación única de session + ejercicio
INSERT INTO session_exercises (
    session_id,
    exercise_id,
    routine_exercise_id,
    sort_order,
    series,
    reps,
    rir,
    rest_seconds,
    tempo,
    notes,
    superset_group,
    is_extra,
    block_name
)
SELECT DISTINCT ON (cs.session_id, COALESCE(cs.routine_exercise_id, -cs.exercise_id))
    cs.session_id,
    COALESCE(re.exercise_id, cs.exercise_id),
    cs.routine_exercise_id,
    ROW_NUMBER() OVER (
        PARTITION BY cs.session_id
        ORDER BY COALESCE(re.sort_order, 9999), MIN(cs.performed_at)
    )::SMALLINT,
    COALESCE(re.series, 3),
    COALESCE(re.reps, '8-12'),
    re.rir,
    re.rest_seconds,
    re.tempo,
    re.notes,
    re.superset_group,
    cs.routine_exercise_id IS NULL,
    COALESCE(rb.name, CASE WHEN cs.routine_exercise_id IS NULL THEN 'Añadido' ELSE 'Principal' END)
FROM completed_sets cs
LEFT JOIN routine_exercises re ON cs.routine_exercise_id = re.id
LEFT JOIN routine_blocks rb ON re.routine_block_id = rb.id
GROUP BY
    cs.session_id,
    cs.routine_exercise_id,
    cs.exercise_id,
    re.exercise_id,
    re.sort_order,
    re.series,
    re.reps,
    re.rir,
    re.rest_seconds,
    re.tempo,
    re.notes,
    re.superset_group,
    rb.name
ORDER BY cs.session_id, COALESCE(cs.routine_exercise_id, -cs.exercise_id), MIN(cs.performed_at);

-- ============================================
-- 3. MODIFICAR completed_sets
-- ============================================

-- Añadir nueva columna
ALTER TABLE completed_sets ADD COLUMN session_exercise_id INT REFERENCES session_exercises(id);

-- Actualizar completed_sets con los nuevos session_exercise_id
UPDATE completed_sets cs
SET session_exercise_id = se.id
FROM session_exercises se
WHERE cs.session_id = se.session_id
  AND (
    (cs.routine_exercise_id IS NOT NULL AND cs.routine_exercise_id = se.routine_exercise_id)
    OR
    (cs.routine_exercise_id IS NULL AND cs.exercise_id = se.exercise_id AND se.is_extra = TRUE)
  );

-- Verificar que todos los completed_sets tienen session_exercise_id
DO $$
DECLARE
    orphan_count INT;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM completed_sets
    WHERE session_exercise_id IS NULL;

    IF orphan_count > 0 THEN
        RAISE NOTICE 'Warning: % completed_sets sin session_exercise_id', orphan_count;
    END IF;
END $$;

-- Hacer session_exercise_id NOT NULL
ALTER TABLE completed_sets ALTER COLUMN session_exercise_id SET NOT NULL;

-- Eliminar constraint antigua
ALTER TABLE completed_sets DROP CONSTRAINT IF EXISTS unique_set_per_session;

-- Eliminar columnas obsoletas
ALTER TABLE completed_sets DROP COLUMN routine_exercise_id;
ALTER TABLE completed_sets DROP COLUMN exercise_id;

-- Crear nuevo constraint único para upsert
ALTER TABLE completed_sets
ADD CONSTRAINT unique_set_per_session_exercise
UNIQUE (session_id, session_exercise_id, set_number);

-- Crear índice para la nueva FK
CREATE INDEX idx_completed_sets_session_exercise ON completed_sets(session_exercise_id);
