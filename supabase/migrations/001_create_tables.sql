-- ============================================
-- FASE 1: Modelo de Datos para Gym Tracker
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- TABLAS DE CATÁLOGOS (datos maestros)
-- ============================================

-- Grupos musculares
CREATE TABLE muscle_groups (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    categoria TEXT
);

-- Músculos específicos
CREATE TABLE muscles (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    muscle_group_id INT REFERENCES muscle_groups(id),
    nombre_corto TEXT
);

-- Tipos de equipamiento
CREATE TABLE equipment_types (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

-- Equipamiento específico
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    equipment_type_id INT REFERENCES equipment_types(id),
    UNIQUE(nombre, equipment_type_id)
);

-- Tipos de agarre
CREATE TABLE grip_types (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

-- Aperturas de agarre
CREATE TABLE grip_widths (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

-- ============================================
-- TABLAS DE EJERCICIOS
-- ============================================

-- Catálogo de ejercicios
CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    equipment_id INT REFERENCES equipment(id),
    grip_type_id INT REFERENCES grip_types(id),
    grip_width_id INT REFERENCES grip_widths(id),
    altura_polea TEXT,
    instrucciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Músculos trabajados por ejercicio (N:M)
CREATE TABLE exercise_muscles (
    exercise_id INT REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_id INT REFERENCES muscles(id),
    es_principal BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (exercise_id, muscle_id)
);

-- ============================================
-- TABLAS DE RUTINAS
-- ============================================

-- Rutinas
CREATE TABLE routines (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    objetivo TEXT,
    frecuencia_dias INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Días de la rutina
CREATE TABLE routine_days (
    id SERIAL PRIMARY KEY,
    routine_id INT REFERENCES routines(id) ON DELETE CASCADE,
    dia_numero SMALLINT NOT NULL,
    nombre TEXT NOT NULL,
    duracion_estimada_min INT,
    orden SMALLINT,
    UNIQUE(routine_id, dia_numero)
);

-- Bloques dentro de cada día
CREATE TABLE routine_blocks (
    id SERIAL PRIMARY KEY,
    routine_day_id INT REFERENCES routine_days(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    orden SMALLINT NOT NULL,
    duracion_min INT
);

-- Ejercicios dentro de cada bloque
CREATE TABLE routine_exercises (
    id SERIAL PRIMARY KEY,
    routine_block_id INT REFERENCES routine_blocks(id) ON DELETE CASCADE,
    exercise_id INT REFERENCES exercises(id),
    orden SMALLINT NOT NULL,
    series SMALLINT NOT NULL,
    reps TEXT NOT NULL,
    rir SMALLINT,
    descanso_seg INT,
    tempo TEXT,
    tempo_razon TEXT,
    notas TEXT,
    es_calentamiento BOOLEAN DEFAULT FALSE
);

-- ============================================
-- TABLAS DE SESIONES (tracking)
-- ============================================

-- Sesiones de entrenamiento
CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_day_id INT REFERENCES routine_days(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_minutes SMALLINT,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    notas TEXT,
    sensacion_general SMALLINT CHECK (sensacion_general BETWEEN 1 AND 5)
);

-- Series completadas
CREATE TABLE completed_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    routine_exercise_id INT REFERENCES routine_exercises(id),
    exercise_id INT REFERENCES exercises(id),
    set_number SMALLINT NOT NULL,
    weight_kg DECIMAL(6,2),
    reps_completed SMALLINT,
    rir_actual SMALLINT,
    completed BOOLEAN DEFAULT FALSE,
    notas TEXT,
    performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_completed_sets_exercise ON completed_sets(exercise_id, performed_at DESC);
CREATE INDEX idx_completed_sets_session ON completed_sets(session_id);
CREATE INDEX idx_sessions_date ON workout_sessions(started_at DESC);
CREATE INDEX idx_sessions_routine_day ON workout_sessions(routine_day_id, started_at DESC);
CREATE INDEX idx_routine_exercises_block ON routine_exercises(routine_block_id);
CREATE INDEX idx_routine_blocks_day ON routine_blocks(routine_day_id);
CREATE INDEX idx_exercise_muscles_exercise ON exercise_muscles(exercise_id);

-- ============================================
-- ROW LEVEL SECURITY (deshabilitado por ahora - single user)
-- ============================================

-- Por ahora permitimos acceso público ya que es single-user
-- Cuando añadas auth, habilita RLS y crea políticas

ALTER TABLE muscle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE grip_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE grip_widths ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_sets ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para single-user (permitir todo con anon key)
CREATE POLICY "Allow all for anon" ON muscle_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON muscles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON equipment_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON equipment FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON grip_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON grip_widths FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON exercises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON exercise_muscles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON routines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON routine_days FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON routine_blocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON routine_exercises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON workout_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON completed_sets FOR ALL USING (true) WITH CHECK (true);
