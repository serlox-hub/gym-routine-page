-- ============================================
-- ESQUEMA CONSOLIDADO - Gym Tracker
-- Versión final del modelo de datos
-- Generado a partir de migraciones 001-016
-- ============================================

-- ============================================
-- TIPOS ENUM
-- ============================================

CREATE TYPE measurement_type AS ENUM (
    'weight_reps',      -- Peso × Repeticiones (ej: 50kg × 10)
    'reps_only',        -- Solo repeticiones (ej: dominadas sin peso)
    'time',             -- Tiempo (ej: 30 seg)
    'distance'          -- Distancia con peso opcional (ej: 40m)
);

CREATE TYPE weight_unit AS ENUM ('kg', 'lb');

CREATE TYPE session_status AS ENUM ('in_progress', 'completed', 'abandoned');

-- ============================================
-- TABLAS DE CATÁLOGOS (datos maestros)
-- ============================================

-- Grupos musculares
CREATE TABLE muscle_groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT
);

-- ============================================
-- TABLAS DE EJERCICIOS
-- ============================================

-- Catálogo de ejercicios
CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    instructions TEXT,
    measurement_type measurement_type DEFAULT 'weight_reps',
    weight_unit TEXT DEFAULT 'kg',
    muscle_group_id INT REFERENCES muscle_groups(id),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN exercises.muscle_group_id IS 'Grupo muscular principal del ejercicio';

-- ============================================
-- TABLAS DE RUTINAS
-- ============================================

-- Rutinas
CREATE TABLE routines (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    goal TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Días de la rutina
CREATE TABLE routine_days (
    id SERIAL PRIMARY KEY,
    routine_id INT REFERENCES routines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    estimated_duration_min INT,
    sort_order SMALLINT
);

-- Bloques dentro de cada día (solo "Calentamiento" y "Principal")
CREATE TABLE routine_blocks (
    id SERIAL PRIMARY KEY,
    routine_day_id INT REFERENCES routine_days(id) ON DELETE CASCADE,
    name TEXT NOT NULL,  -- 'Calentamiento' o 'Principal'
    sort_order SMALLINT NOT NULL,
    duration_min INT
);

-- Ejercicios dentro de cada bloque
CREATE TABLE routine_exercises (
    id SERIAL PRIMARY KEY,
    routine_block_id INT REFERENCES routine_blocks(id) ON DELETE CASCADE,
    exercise_id INT REFERENCES exercises(id),
    sort_order SMALLINT NOT NULL,
    series SMALLINT NOT NULL,
    reps TEXT NOT NULL,
    rir SMALLINT,
    rest_seconds INT,
    tempo TEXT,
    tempo_razon TEXT,
    notes TEXT,
    superset_group INTEGER DEFAULT NULL,
    measurement_type measurement_type  -- Override del tipo de medición (opcional)
);

COMMENT ON COLUMN routine_exercises.superset_group IS 'Agrupa ejercicios en supersets. NULL = individual, mismo número = mismo superset';

-- ============================================
-- TABLAS DE SESIONES (tracking)
-- ============================================

-- Sesiones de entrenamiento
CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_day_id INT REFERENCES routine_days(id),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_minutes SMALLINT,
    status session_status DEFAULT 'in_progress',
    notes TEXT,
    overall_feeling SMALLINT CHECK (overall_feeling BETWEEN 1 AND 5)
);

-- Ejercicios realizados en cada sesión (snapshot independiente de routine_exercises)
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

COMMENT ON TABLE session_exercises IS 'Snapshot de ejercicios realizados en cada sesión. Independiente de cambios en routine_exercises.';
COMMENT ON COLUMN session_exercises.routine_exercise_id IS 'Referencia al ejercicio original de la rutina. NULL si fue añadido como extra.';
COMMENT ON COLUMN session_exercises.is_extra IS 'TRUE si el ejercicio fue añadido durante la sesión, no venía de la rutina.';

-- Series completadas
CREATE TABLE completed_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    session_exercise_id INT NOT NULL REFERENCES session_exercises(id),
    set_number SMALLINT NOT NULL,
    weight DECIMAL(6,2),
    weight_unit weight_unit DEFAULT 'kg',
    reps_completed SMALLINT,
    time_seconds INT,           -- Para ejercicios isométricos/tiempo
    distance_meters DECIMAL(6,2), -- Para ejercicios de distancia
    rir_actual SMALLINT,
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    performed_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_set_per_session_exercise UNIQUE (session_id, session_exercise_id, set_number)
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_exercises_user ON exercises(user_id);
CREATE INDEX idx_exercises_muscle_group ON exercises(muscle_group_id);
CREATE INDEX idx_routines_user ON routines(user_id);
CREATE INDEX idx_workout_sessions_user ON workout_sessions(user_id);
CREATE INDEX idx_sessions_date ON workout_sessions(started_at DESC);
CREATE INDEX idx_sessions_routine_day ON workout_sessions(routine_day_id, started_at DESC);
CREATE INDEX idx_routine_exercises_block ON routine_exercises(routine_block_id);
CREATE INDEX idx_routine_exercises_superset ON routine_exercises(routine_block_id, superset_group);
CREATE INDEX idx_routine_blocks_day ON routine_blocks(routine_day_id);
CREATE INDEX idx_session_exercises_session ON session_exercises(session_id);
CREATE INDEX idx_session_exercises_exercise ON session_exercises(exercise_id);
CREATE INDEX idx_completed_sets_session ON completed_sets(session_id);
CREATE INDEX idx_completed_sets_session_exercise ON completed_sets(session_exercise_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE muscle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_sets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS - MUSCLE_GROUPS (lectura pública)
-- ============================================

CREATE POLICY "Allow read for all" ON muscle_groups FOR SELECT USING (true);

-- ============================================
-- POLÍTICAS RLS - EXERCISES
-- ============================================

CREATE POLICY "Users can view own exercises"
    ON exercises FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exercises"
    ON exercises FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises"
    ON exercises FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises"
    ON exercises FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS - ROUTINES
-- ============================================

CREATE POLICY "Users can view own routines"
    ON routines FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own routines"
    ON routines FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines"
    ON routines FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own routines"
    ON routines FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS - ROUTINE_DAYS (hereda de routines)
-- ============================================

CREATE POLICY "Users can view routine days for own routines"
    ON routine_days FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM routines WHERE routines.id = routine_days.routine_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage routine days for own routines"
    ON routine_days FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM routines WHERE routines.id = routine_days.routine_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can update routine days for own routines"
    ON routine_days FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM routines WHERE routines.id = routine_days.routine_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete routine days for own routines"
    ON routine_days FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM routines WHERE routines.id = routine_days.routine_id AND routines.user_id = auth.uid()
    ));

-- ============================================
-- POLÍTICAS RLS - ROUTINE_BLOCKS (hereda de routine_days → routines)
-- ============================================

CREATE POLICY "Users can view routine blocks for own routines"
    ON routine_blocks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM routine_days
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_days.id = routine_blocks.routine_day_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage routine blocks for own routines"
    ON routine_blocks FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM routine_days
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_days.id = routine_blocks.routine_day_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can update routine blocks for own routines"
    ON routine_blocks FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM routine_days
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_days.id = routine_blocks.routine_day_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete routine blocks for own routines"
    ON routine_blocks FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM routine_days
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_days.id = routine_blocks.routine_day_id AND routines.user_id = auth.uid()
    ));

-- ============================================
-- POLÍTICAS RLS - ROUTINE_EXERCISES (hereda de routine_blocks → routine_days → routines)
-- ============================================

CREATE POLICY "Users can view routine exercises for own routines"
    ON routine_exercises FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM routine_blocks
        JOIN routine_days ON routine_days.id = routine_blocks.routine_day_id
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_blocks.id = routine_exercises.routine_block_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage routine exercises for own routines"
    ON routine_exercises FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM routine_blocks
        JOIN routine_days ON routine_days.id = routine_blocks.routine_day_id
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_blocks.id = routine_exercises.routine_block_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can update routine exercises for own routines"
    ON routine_exercises FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM routine_blocks
        JOIN routine_days ON routine_days.id = routine_blocks.routine_day_id
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_blocks.id = routine_exercises.routine_block_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete routine exercises for own routines"
    ON routine_exercises FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM routine_blocks
        JOIN routine_days ON routine_days.id = routine_blocks.routine_day_id
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_blocks.id = routine_exercises.routine_block_id AND routines.user_id = auth.uid()
    ));

-- ============================================
-- POLÍTICAS RLS - WORKOUT_SESSIONS
-- ============================================

CREATE POLICY "Users can view own sessions"
    ON workout_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
    ON workout_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON workout_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON workout_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS - SESSION_EXERCISES (hereda de workout_sessions)
-- ============================================

CREATE POLICY "Users can view session exercises for own sessions"
    ON session_exercises FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_exercises.session_id AND workout_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage session exercises for own sessions"
    ON session_exercises FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_exercises.session_id AND workout_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can update session exercises for own sessions"
    ON session_exercises FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_exercises.session_id AND workout_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete session exercises for own sessions"
    ON session_exercises FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_exercises.session_id AND workout_sessions.user_id = auth.uid()
    ));

-- ============================================
-- POLÍTICAS RLS - COMPLETED_SETS (hereda de workout_sessions)
-- ============================================

CREATE POLICY "Users can view completed sets for own sessions"
    ON completed_sets FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = completed_sets.session_id AND workout_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage completed sets for own sessions"
    ON completed_sets FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = completed_sets.session_id AND workout_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can update completed sets for own sessions"
    ON completed_sets FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = completed_sets.session_id AND workout_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete completed sets for own sessions"
    ON completed_sets FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = completed_sets.session_id AND workout_sessions.user_id = auth.uid()
    ));

-- ============================================
-- DATOS INICIALES - GRUPOS MUSCULARES
-- ============================================

INSERT INTO muscle_groups (name, category) VALUES
    ('Abdominales', 'Abdominales'),
    ('Espalda', 'Superior'),
    ('Pecho', 'Superior'),
    ('Hombros', 'Superior'),
    ('Bíceps', 'Superior'),
    ('Tríceps', 'Superior'),
    ('Antebrazo', 'Superior'),
    ('Cuádriceps', 'Inferior'),
    ('Isquiotibiales', 'Inferior'),
    ('Glúteos', 'Inferior'),
    ('Pantorrillas', 'Inferior');
