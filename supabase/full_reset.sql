-- ============================================
-- SCRIPT DE RESET COMPLETO
-- Ejecutar en Supabase SQL Editor para resetear la BD
-- ============================================

-- Eliminar todas las tablas en orden (por dependencias)
DROP TABLE IF EXISTS completed_sets CASCADE;
DROP TABLE IF EXISTS workout_sessions CASCADE;
DROP TABLE IF EXISTS routine_exercises CASCADE;
DROP TABLE IF EXISTS routine_blocks CASCADE;
DROP TABLE IF EXISTS routine_days CASCADE;
DROP TABLE IF EXISTS routines CASCADE;
DROP TABLE IF EXISTS exercise_muscles CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS grip_widths CASCADE;
DROP TABLE IF EXISTS grip_types CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS equipment_types CASCADE;
DROP TABLE IF EXISTS muscles CASCADE;
DROP TABLE IF EXISTS muscle_groups CASCADE;

-- Eliminar tipos enum
DROP TYPE IF EXISTS measurement_type CASCADE;
DROP TYPE IF EXISTS weight_unit CASCADE;
DROP TYPE IF EXISTS session_status CASCADE;

-- Ahora ejecuta en orden:
-- 1. 001_create_tables.sql
-- 2. 002_seed_data.sql
-- 3. 003_seed_exercises_routine.sql
-- ============================================
-- FASE 1: Modelo de Datos para Gym Tracker
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- TIPOS ENUM
-- ============================================

CREATE TYPE measurement_type AS ENUM (
    'weight_reps',      -- Peso × Repeticiones (ej: 50kg × 10)
    'reps_only',        -- Solo repeticiones (ej: dominadas sin peso)
    'reps_per_side',    -- Repeticiones por lado (ej: 10/lado)
    'time',             -- Tiempo (ej: 30 seg)
    'time_per_side',    -- Tiempo por lado (ej: 30 seg/lado)
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
    default_weight_unit weight_unit DEFAULT 'lb', -- Unidad por defecto (barras/mancuernas = kg, máquinas/poleas = lb)
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
    measurement_type measurement_type DEFAULT 'weight_reps',
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
    es_calentamiento BOOLEAN DEFAULT FALSE,
    measurement_type measurement_type -- Override del tipo de medición (opcional)
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
    status session_status DEFAULT 'in_progress',
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
    weight DECIMAL(6,2),
    weight_unit weight_unit DEFAULT 'kg',
    reps_completed SMALLINT,
    time_seconds INT, -- Para ejercicios isométricos/tiempo
    distance_meters DECIMAL(6,2), -- Para ejercicios de distancia
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
-- ============================================
-- FASE 1: Datos iniciales (seed)
-- Ejecutar DESPUÉS de 001_create_tables.sql
-- ============================================

-- ============================================
-- GRUPOS MUSCULARES
-- ============================================

INSERT INTO muscle_groups (nombre, categoria) VALUES
    ('Core', 'Core'),
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

-- ============================================
-- MÚSCULOS ESPECÍFICOS
-- ============================================

INSERT INTO muscles (nombre, muscle_group_id, nombre_corto) VALUES
    -- Core
    ('Recto abdominal', 1, 'Abdominales'),
    ('Transverso abdominal', 1, 'Transverso'),
    ('Oblicuos', 1, 'Oblicuos'),
    ('Serrato anterior', 1, 'Serrato'),
    ('Erectores espinales', 1, 'Erectores'),
    ('Psoas ilíaco', 1, 'Psoas'),

    -- Espalda
    ('Dorsal ancho', 2, 'Dorsales'),
    ('Trapecio inferior', 2, 'Trapecio inf'),
    ('Trapecio medio', 2, 'Trapecio med'),
    ('Trapecio superior', 2, 'Trapecio sup'),
    ('Romboides', 2, 'Romboides'),
    ('Redondo mayor', 2, 'Redondo may'),
    ('Redondo menor', 2, 'Redondo men'),
    ('Infraespinoso', 2, 'Infraespinoso'),

    -- Pecho
    ('Pectoral mayor (porción clavicular)', 3, 'Pecho sup'),
    ('Pectoral mayor (porción esternal)', 3, 'Pecho med'),
    ('Pectoral mayor (porción abdominal)', 3, 'Pecho inf'),
    ('Pectoral menor', 3, 'Pec menor'),

    -- Hombros
    ('Deltoides anterior', 4, 'Delt ant'),
    ('Deltoides lateral', 4, 'Delt lat'),
    ('Deltoides posterior', 4, 'Delt post'),

    -- Bíceps
    ('Bíceps braquial (cabeza larga)', 5, 'Bíceps largo'),
    ('Bíceps braquial (cabeza corta)', 5, 'Bíceps corto'),
    ('Bíceps braquial', 5, 'Bíceps'),
    ('Braquial', 5, 'Braquial'),
    ('Braquiorradial', 7, 'Braquiorradial'),

    -- Tríceps
    ('Tríceps (cabeza larga)', 6, 'Tríceps largo'),
    ('Tríceps (cabeza lateral)', 6, 'Tríceps lat'),
    ('Tríceps (cabeza medial)', 6, 'Tríceps med'),
    ('Tríceps braquial', 6, 'Tríceps'),

    -- Piernas
    ('Cuádriceps', 8, 'Cuádriceps'),
    ('Recto femoral', 8, 'Recto fem'),
    ('Vasto lateral', 8, 'Vasto lat'),
    ('Isquiotibiales', 9, 'Isquios'),
    ('Glúteo mayor', 10, 'Glúteo'),
    ('Gemelos', 11, 'Gemelos'),
    ('Sóleo', 11, 'Sóleo');

-- ============================================
-- TIPOS DE EQUIPAMIENTO
-- ============================================

INSERT INTO equipment_types (nombre) VALUES
    ('Barra'),
    ('Mancuernas'),
    ('Polea'),
    ('Máquina'),
    ('Peso corporal'),
    ('Banda elástica'),
    ('Kettlebell'),
    ('Rueda abdominal'),
    ('Banco');

-- ============================================
-- EQUIPAMIENTO ESPECÍFICO
-- ============================================

INSERT INTO equipment (nombre, equipment_type_id, default_weight_unit) VALUES
    -- Barras (id 1-4) - kg por defecto
    ('Barra olímpica', 1, 'kg'),
    ('Barra recta corta', 1, 'kg'),
    ('Barra EZ', 1, 'kg'),
    ('Barra hexagonal', 1, 'kg'),

    -- Mancuernas (id 5) - kg por defecto
    ('Mancuernas', 2, 'kg'),

    -- Poleas (id 6-7) - lb por defecto (máquinas de gym)
    ('Polea', 3, 'lb'),
    ('Cable cruzado', 3, 'lb'),

    -- Máquina (id 8) - lb por defecto
    ('Máquina', 4, 'lb'),

    -- Peso corporal (id 9-11) - kg (peso adicional como cinturón)
    ('Barra de dominadas', 5, 'kg'),
    ('Paralelas', 5, 'kg'),
    ('Suelo', 5, 'kg'),

    -- Otros (id 12-14)
    ('Banda de resistencia', 6, 'kg'),
    ('Rueda abdominal', 8, 'kg'),
    ('Banco', 9, 'kg');

-- ============================================
-- TIPOS DE AGARRE
-- ============================================

INSERT INTO grip_types (nombre) VALUES
    ('Prono'),
    ('Supino'),
    ('Neutro'),
    ('Mixto'),
    ('Semi-supino'),
    ('Falso (thumbless)');

-- ============================================
-- APERTURAS DE AGARRE
-- ============================================

INSERT INTO grip_widths (nombre) VALUES
    ('Cerrado'),
    ('Medio'),
    ('Ancho'),
    ('N/A');
-- ============================================
-- FASE 1: Ejercicios y Rutina de Hipertrofia
-- Ejecutar DESPUÉS de 002_seed_data.sql
-- ============================================

-- ============================================
-- EJERCICIOS
-- ============================================

-- Core
INSERT INTO exercises (nombre, equipment_id, grip_type_id, grip_width_id, altura_polea, measurement_type) VALUES
    ('Rueda Abdominal', 13, NULL, NULL, NULL, 'weight_reps'),
    ('Bicho Muerto', 11, NULL, NULL, NULL, 'reps_per_side'),
    ('Press Pallof', 6, 3, 1, 'Media', 'reps_per_side'),
    ('Perro-Pájaro Lento', 11, NULL, NULL, NULL, 'reps_per_side'),
    ('Crunch en Polea', 6, 3, 1, 'Alta', 'weight_reps'),
    ('Plancha Lateral', 11, NULL, NULL, NULL, 'time_per_side'),
    ('Hollow Body Hold', 11, NULL, NULL, NULL, 'time'),
    ('Paseo del Granjero', 5, 3, 4, NULL, 'distance');

-- Espalda
INSERT INTO exercises (nombre, equipment_id, grip_type_id, grip_width_id, altura_polea) VALUES
    ('Dominadas Lastradas', 9, 1, 3, NULL),
    ('Remo con Mancuerna', 5, 3, 4, NULL),
    ('Jalón al Pecho', 8, 3, 1, 'Alta'),
    ('Remo Alto en Polea', 6, 1, 3, 'Alta'),
    ('Jalón Estrecho', 8, 3, 1, 'Alta');

-- Bíceps
INSERT INTO exercises (nombre, equipment_id, grip_type_id, grip_width_id, altura_polea) VALUES
    ('Curl Inclinado con Mancuernas', 5, 2, 4, NULL),
    ('Curl con Barra EZ', 3, 5, 2, NULL),
    ('Curl Martillo Inclinado', 5, 3, 4, NULL),
    ('Curl Bayesiano en Polea', 6, 2, 4, 'Baja');

-- Hombros
INSERT INTO exercises (nombre, equipment_id, grip_type_id, grip_width_id, altura_polea) VALUES
    ('Elevación Lateral en Polea (Desde Atrás)', 6, 3, 4, 'Baja'),
    ('Tirón a la Cara', 6, 3, 2, 'Alta'),
    ('Press de Hombro con Mancuernas', 5, 3, 4, NULL),
    ('Elevación Lateral en Polea 1 Brazo (Desde Atrás)', 6, 3, 4, 'Baja'),
    ('Elevaciones en Y (Banco Inclinado)', 5, 3, 4, NULL),
    ('Aperturas Inversas en Máquina', 8, 3, 4, NULL),
    ('Elevación Lateral en Polea (Bilateral)', 6, 3, 4, 'Baja');

-- Pecho
INSERT INTO exercises (nombre, equipment_id, grip_type_id, grip_width_id, altura_polea) VALUES
    ('Fondos Lastrados', 10, 3, 3, NULL),
    ('Press Inclinado con Mancuernas', 5, 1, 4, NULL);

-- Tríceps
INSERT INTO exercises (nombre, equipment_id, grip_type_id, grip_width_id, altura_polea) VALUES
    ('Extensión de Tríceps sobre Cabeza en Polea', 6, 3, 1, 'Baja'),
    ('Extensión de Tríceps en Polea con Cuerda', 6, 3, 1, 'Alta'),
    ('Extensión de Tríceps sobre Cabeza con Cuerda', 6, 3, 1, 'Baja'),
    ('Extensión de Tríceps en Polea (Barra V)', 6, 5, 1, 'Alta');

-- Piernas
INSERT INTO exercises (nombre, equipment_id, grip_type_id, grip_width_id, altura_polea) VALUES
    ('Prensa de Piernas Inclinada', 8, NULL, NULL, NULL),
    ('Empuje de Cadera', 1, NULL, NULL, NULL),
    ('Peso Muerto Rumano', 1, 1, 2, NULL),
    ('Curl Femoral Tumbado', 8, NULL, NULL, NULL),
    ('Abducción de Cadera', 8, NULL, NULL, NULL);

-- ============================================
-- MÚSCULOS POR EJERCICIO (principales y secundarios)
-- ============================================

-- Rueda Abdominal (id=1)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (1, 1, TRUE), (1, 3, FALSE), (1, 4, FALSE), (1, 7, FALSE), (1, 5, FALSE);

-- Bicho Muerto (id=2)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (2, 2, TRUE), (2, 1, FALSE), (2, 3, FALSE), (2, 6, FALSE);

-- Press Pallof (id=3)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (3, 3, TRUE), (3, 2, FALSE), (3, 1, FALSE);

-- Perro-Pájaro (id=4)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (4, 5, TRUE), (4, 2, FALSE), (4, 35, FALSE);

-- Crunch en Polea (id=5)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (5, 1, TRUE), (5, 3, FALSE);

-- Plancha Lateral (id=6)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (6, 3, TRUE), (6, 2, FALSE);

-- Hollow Body Hold (id=7)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (7, 1, TRUE), (7, 2, FALSE), (7, 3, FALSE), (7, 6, FALSE);

-- Paseo del Granjero (id=8)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (8, 1, TRUE), (8, 10, FALSE), (8, 5, FALSE), (8, 3, FALSE);

-- Dominadas Lastradas (id=9)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (9, 7, TRUE), (9, 24, FALSE), (9, 25, FALSE), (9, 12, FALSE), (9, 11, FALSE), (9, 8, FALSE);

-- Remo con Mancuerna (id=10)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (10, 7, TRUE), (10, 11, FALSE), (10, 9, FALSE), (10, 12, FALSE), (10, 24, FALSE), (10, 25, FALSE);

-- Jalón al Pecho (id=11)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (11, 7, TRUE), (11, 12, FALSE), (11, 24, FALSE), (11, 25, FALSE), (11, 11, FALSE);

-- Remo Alto en Polea (id=12)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (12, 9, TRUE), (12, 11, FALSE), (12, 21, FALSE), (12, 24, FALSE);

-- Jalón Estrecho (id=13)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (13, 7, TRUE), (13, 12, FALSE), (13, 24, FALSE), (13, 25, FALSE), (13, 11, FALSE);

-- Curl Inclinado con Mancuernas (id=14)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (14, 22, TRUE), (14, 23, FALSE), (14, 25, FALSE), (14, 26, FALSE);

-- Curl con Barra EZ (id=15)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (15, 24, TRUE), (15, 25, FALSE), (15, 26, FALSE);

-- Curl Martillo Inclinado (id=16)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (16, 25, TRUE), (16, 26, FALSE), (16, 24, FALSE);

-- Curl Bayesiano en Polea (id=17)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (17, 22, TRUE), (17, 23, FALSE), (17, 25, FALSE);

-- Elevación Lateral en Polea (Desde Atrás) (id=18)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (18, 20, TRUE), (18, 19, FALSE), (18, 10, FALSE);

-- Tirón a la Cara (id=19)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (19, 21, TRUE), (19, 9, FALSE), (19, 11, FALSE), (19, 14, FALSE), (19, 13, FALSE);

-- Press de Hombro con Mancuernas (id=20)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (20, 19, TRUE), (20, 20, FALSE), (20, 30, FALSE), (20, 10, FALSE), (20, 4, FALSE);

-- Elevación Lateral en Polea 1 Brazo (id=21)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (21, 20, TRUE), (21, 19, FALSE), (21, 10, FALSE);

-- Elevaciones en Y (id=22)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (22, 8, TRUE), (22, 21, FALSE), (22, 11, FALSE), (22, 4, FALSE);

-- Aperturas Inversas en Máquina (id=23)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (23, 21, TRUE), (23, 9, FALSE), (23, 11, FALSE);

-- Elevación Lateral en Polea Bilateral (id=24)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (24, 20, TRUE), (24, 19, FALSE), (24, 10, FALSE);

-- Fondos Lastrados (id=25)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (25, 17, TRUE), (25, 30, FALSE), (25, 19, FALSE), (25, 4, FALSE);

-- Press Inclinado con Mancuernas (id=26)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (26, 15, TRUE), (26, 19, FALSE), (26, 30, FALSE);

-- Extensión de Tríceps sobre Cabeza en Polea (id=27)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (27, 27, TRUE), (27, 28, FALSE), (27, 29, FALSE);

-- Extensión de Tríceps en Polea con Cuerda (id=28)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (28, 28, TRUE), (28, 29, FALSE);

-- Extensión de Tríceps sobre Cabeza con Cuerda (id=29)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (29, 27, TRUE), (29, 28, FALSE), (29, 29, FALSE);

-- Extensión de Tríceps en Polea (Barra V) (id=30)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (30, 28, TRUE), (30, 29, FALSE);

-- Prensa de Piernas (id=31)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (31, 31, TRUE), (31, 35, FALSE), (31, 34, FALSE);

-- Hip Thrust (id=32)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (32, 35, TRUE), (32, 34, FALSE), (32, 5, FALSE);

-- Peso Muerto Rumano (id=33)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (33, 34, TRUE), (33, 35, FALSE), (33, 5, FALSE);

-- Curl Femoral Tumbado (id=34)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (34, 34, TRUE), (34, 36, FALSE);

-- Abducción de Cadera (id=35)
INSERT INTO exercise_muscles (exercise_id, muscle_id, es_principal) VALUES
    (35, 35, TRUE);

-- ============================================
-- RUTINA DE HIPERTROFIA
-- ============================================

INSERT INTO routines (nombre, descripcion, objetivo, frecuencia_dias) VALUES
    ('Rutina Hipertrofia - Brazos/Hombros + Core + Postura',
     'Rutina para ectomorfo con 10+ años experiencia. Foco: 60% brazos/hombros, 40% core/postura',
     'Hipertrofia',
     4);

-- ============================================
-- DÍAS DE LA RUTINA
-- ============================================

INSERT INTO routine_days (routine_id, dia_numero, nombre, duracion_estimada_min, orden) VALUES
    (1, 1, 'Core + Espalda + Bíceps + Laterales', 85, 1),
    (1, 2, 'Core + Piernas + Glúteos', 80, 2),
    (1, 3, 'Core + Hombros + Pecho + Tríceps', 83, 3),
    (1, 4, 'Core + Espalda Alta + Brazos + Postura', 85, 4);

-- ============================================
-- BLOQUES DÍA 1
-- ============================================

INSERT INTO routine_blocks (routine_day_id, nombre, orden, duracion_min) VALUES
    (1, 'Core', 1, 7),
    (1, 'Espalda', 2, 22),
    (1, 'Bíceps', 3, 18),
    (1, 'Hombros/Postura', 4, 12);

-- Ejercicios Día 1 - Core
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, tempo, tempo_razon, notas, es_calentamiento) VALUES
    (1, 1, 1, 3, '6-10', 2, 60, '1-0-3-1', 'Excéntrico lento (3s) para máxima tensión en anti-extensión. Pausa 1s en stretch.', 'Core tenso todo el movimiento. Evitar colapso lumbar. Máximo estiramiento controlado.', FALSE),
    (1, 2, 2, 2, '10/lado', 1, 45, '2-1-2-0', 'Movimiento controlado bilateral. Pausa 1s en extensión para activación máxima.', 'Lumbar pegada al suelo siempre. Movimiento lento y controlado.', FALSE);

-- Ejercicios Día 1 - Espalda
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, tempo, tempo_razon, notas, es_calentamiento) VALUES
    (2, 9, 1, 4, '5-8', 2, 150, '1-1-3-0', 'Concéntrico explosivo para máxima carga. Excéntrico 3s para hipertrofia de dorsales. Sin pausa abajo para mantener tensión.', 'Retracción escapular PRIMERO, luego tirar. Squeeze 1s arriba. Estiramiento completo abajo.', FALSE),
    (2, 10, 2, 3, '8-10', 2, 90, '1-1-2-0', 'Tempo estándar compuesto. Squeeze 1s en contracción para activación de dorsales/romboides.', 'Torso estable, evitar rotación. Estiramiento completo abajo.', FALSE),
    (2, 11, 3, 2, '10-12', 1, 60, '1-1-2-1', 'Pausa 1s arriba para stretch de dorsales. Squeeze 1s abajo.', 'Sin momentum ni balanceo. Activar dorsales primero.', FALSE);

-- Ejercicios Día 1 - Bíceps
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, tempo, tempo_razon, notas, es_calentamiento) VALUES
    (3, 14, 1, 3, '8-10', 1, 90, '1-1-3-1', 'EJERCICIO EN STRETCH - Excéntrico 3s + pausa 1s abajo maximiza estímulo en cabeza larga (Pedrosa 2023).', 'Banco a 45°. MÁXIMO STRETCH abajo es la clave. Sin swing.', FALSE),
    (3, 15, 2, 3, '8-10', 1, 90, '1-1-2-0', 'Tempo estándar aislamiento. Sin pausa abajo para tensión constante.', 'Codos fijos pegados al cuerpo. No balancear. Contracción completa arriba.', FALSE),
    (3, 16, 3, 2, '10-12', 1, 60, '1-1-3-1', 'EJERCICIO EN STRETCH - Mismo principio que incline curl. Maximiza braquial.', 'Banco a 45°. Estiramiento completo abajo.', FALSE);

-- Ejercicios Día 1 - Hombros/Postura
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, tempo, tempo_razon, notas, es_calentamiento) VALUES
    (4, 18, 1, 3, '12-15', 1, 75, '1-1-3-1', 'EJERCICIO EN STRETCH - Cable desde atrás + excéntrico 3s maximiza tensión en posición baja (Kassiano 2023).', 'Cable cruza por DETRÁS del cuerpo. Lean away ligero. Squeeze 1s arriba. Elevar hasta paralelo al suelo.', FALSE),
    (4, 19, 2, 3, '15-20', 1, 60, '1-2-2-0', 'Pausa 2s en contracción para activación de rotadores externos y rear delt.', 'Codos ALTOS. Rotación externa al final del movimiento. Crítico para salud del hombro.', FALSE);

-- ============================================
-- BLOQUES DÍA 2
-- ============================================

INSERT INTO routine_blocks (routine_day_id, nombre, orden, duracion_min) VALUES
    (2, 'Core', 1, 5),
    (2, 'Piernas', 2, 55);

-- Ejercicios Día 2 - Core
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, tempo, tempo_razon, notas, es_calentamiento) VALUES
    (5, 3, 1, 2, '10/lado', 1, 45, '2-2-2-0', 'Anti-rotación requiere tiempo bajo tensión. Pausa 2s con brazos extendidos para máxima activación.', 'Core rígido, resistir rotación. Extensión completa de brazos.', FALSE),
    (5, 4, 2, 2, '8/lado', 1, 45, '3-2-3-0', 'Ejercicio de estabilidad - tempo lento (3s) mejora control motor y activación profunda.', 'Columna neutral. Pausa 2s en extensión completa.', FALSE);

-- Ejercicios Día 2 - Piernas
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, tempo, tempo_razon, notas, es_calentamiento) VALUES
    (6, 31, 1, 4, '10', 2, 120, '1-0-2-0', 'Compuesto pesado - concéntrico explosivo, excéntrico controlado 2s. Sin pausas para tensión continua.', 'Pies ancho de hombros en CENTRO de plataforma. Puntas ligeramente hacia afuera. Bajar hasta 90° de rodilla mínimo. NO bloquear rodillas arriba.', FALSE),
    (6, 32, 2, 4, '8-10', 2, 120, '1-2-2-0', 'Pausa 2s arriba CRÍTICA para activación máxima de glúteos en contracción pico.', 'Espalda alta apoyada en banco. Barra con pad en cadera. Pies ancho de hombros, rodillas a 90° arriba. Empujar con TALONES. Squeeze glúteos 2s arriba.', FALSE),
    (6, 33, 3, 3, '8-12', 2, 120, '1-0-3-1', 'EJERCICIO EN STRETCH - Excéntrico 3s + pausa 1s abajo maximiza estímulo en isquiotibiales.', 'Bisagra de cadera, NO sentadilla. Barra pegada a piernas. Columna neutral SIEMPRE.', FALSE),
    (6, 34, 4, 3, '10-12', 1, 90, '1-1-3-0', 'Excéntrico 3s clave para isquiotibiales. Sin pausa abajo para tensión constante.', 'Control en excéntrico (clave). Sin momentum. Caderas pegadas al banco.', FALSE),
    (6, 35, 5, 2, '15', 1, 45, '1-1-2-0', 'Tempo estándar aislamiento. Squeeze 1s en apertura máxima.', 'Control total. Sin inclinar torso.', FALSE);

-- ============================================
-- BLOQUES DÍA 3
-- ============================================

INSERT INTO routine_blocks (routine_day_id, nombre, orden, duracion_min) VALUES
    (3, 'Core', 1, 6),
    (3, 'Hombros (PRIORIDAD)', 2, 20),
    (3, 'Pecho + Tríceps', 3, 30);

-- Ejercicios Día 3 - Core
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, tempo, tempo_razon, notas, es_calentamiento) VALUES
    (7, 5, 1, 2, '10-12', 1, 45, '1-1-2-0', 'Tempo estándar. Squeeze 1s en contracción máxima.', 'Flexión desde COSTILLAS, no desde cadera. Control en subida.', FALSE),
    (7, 6, 2, 2, '30s/lado', 0, 45, 'isométrico', 'Ejercicio isométrico - 30s es óptimo para activación sin fatiga excesiva.', 'Hombros apilados. Cadera elevada (no hundida). Core completamente rígido.', FALSE);

-- Ejercicios Día 3 - Hombros
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, tempo, tempo_razon, notas, es_calentamiento) VALUES
    (8, 20, 1, 3, '6-8', 2, 120, '1-0-2-0', 'Compuesto pesado - concéntrico explosivo para máxima carga. Excéntrico 2s controlado.', 'Columna neutral (sin arquear). Codos debajo de muñecas. ROM completo.', FALSE),
    (8, 21, 2, 4, '12-15', 1, 75, '1-1-3-1', 'EJERCICIO EN STRETCH - Excéntrico 3s + pausa 1s abajo. Máxima tensión en deltoides lateral.', 'Lean away del cable (inclinar cuerpo alejándose). Cable cruza por DETRÁS del cuerpo. Elevar hasta paralelo al suelo.', FALSE),
    (8, 22, 3, 2, '10-12', 1, 60, '2-2-2-0', 'Ejercicio postural - tempo lento 2s y pausa 2s para activación de trapecio inferior.', 'Banco a 30-45°. Pecho apoyado. Brazos en forma de Y. Pulgares hacia el techo. Peso MUY ligero.', FALSE);

-- Ejercicios Día 3 - Pecho + Tríceps
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, tempo, tempo_razon, notas, es_calentamiento) VALUES
    (9, 25, 1, 3, '6-10', 2, 120, '1-0-3-1', 'EJERCICIO EN STRETCH para pecho - Excéntrico 3s + pausa 1s abajo en stretch.', 'Inclinar torso 30° hacia adelante para énfasis en pecho. Bajar hasta sentir stretch en pecho.', FALSE),
    (9, 26, 2, 2, '8-10', 2, 90, '1-0-2-1', 'Pausa 1s abajo para stretch de pecho. Excéntrico 2s controlado.', 'Banco a 30°. Sin arquear lumbar. Stretch en pecho abajo.', FALSE),
    (9, 27, 3, 3, '10-12', 1, 90, '1-1-3-1', 'EJERCICIO EN STRETCH - Excéntrico 3s + pausa 1s en stretch. Clave para cabeza larga del tríceps.', 'MÁXIMO STRETCH arriba (hombro en flexión). Codos fijos. De espaldas a la polea.', FALSE),
    (9, 28, 4, 3, '10-12', 1, 60, '1-1-2-0', 'Tempo estándar aislamiento. Sin pausa arriba para tensión constante.', 'Codos pegados al cuerpo. Separar la cuerda abajo. Squeeze 1s.', FALSE);

-- ============================================
-- BLOQUES DÍA 4
-- ============================================

INSERT INTO routine_blocks (routine_day_id, nombre, orden, duracion_min) VALUES
    (4, 'Core', 1, 7),
    (4, 'Espalda Alta + Postura', 2, 20),
    (4, 'Brazos', 3, 28),
    (4, 'Laterales Finisher', 4, 5);

-- Ejercicios Día 4 - Core
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, tempo, tempo_razon, notas, es_calentamiento) VALUES
    (10, 7, 1, 2, '20-30s', 0, 45, 'isométrico', 'Ejercicio isométrico - 20-30s es óptimo para anti-extensión.', 'Lumbar PEGADA al suelo. Hombros elevados. Piernas extendidas.', FALSE),
    (10, 8, 2, 2, '40m', 1, 60, 'continuo', 'Ejercicio de carga continua - mantener tensión durante todo el recorrido.', 'Peso pesado (40-50% peso corporal por mano). Postura erecta. Hombros hacia atrás y abajo. Core rígido.', FALSE);

-- Ejercicios Día 4 - Espalda Alta + Postura
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, tempo, tempo_razon, notas, es_calentamiento) VALUES
    (11, 12, 1, 4, '10-12', 2, 90, '1-1-2-1', 'Squeeze 1s en contracción para trapecios. Pausa 1s en stretch.', 'Codos a 90° (altos). Squeeze escapular. Excelente para postura.', FALSE),
    (11, 13, 2, 3, '10-12', 2, 90, '1-1-2-1', 'Pausa 1s arriba para stretch de dorsales. Squeeze 1s abajo.', 'Sin inclinarse hacia atrás excesivamente. Activar dorsales primero.', FALSE),
    (11, 19, 3, 3, '15-20', 1, 60, '1-2-2-0', 'Pausa 2s en contracción CRÍTICA para rotadores externos.', 'Rotación externa al FINAL del movimiento. Codos altos. Crítico para postura.', FALSE),
    (11, 23, 4, 2, '12-15', 1, 60, '1-1-3-0', 'Excéntrico 3s para deltoides posterior. Sin pausa al frente.', 'Foco en deltoides posterior. Squeeze 1s en contracción.', FALSE);

-- Ejercicios Día 4 - Brazos
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, tempo, tempo_razon, notas, es_calentamiento) VALUES
    (12, 17, 1, 3, '10-12', 1, 90, '1-1-3-1', 'EJERCICIO EN STRETCH - El más importante para cabeza larga. Excéntrico 3s + pausa 1s en stretch máximo.', 'Brazo DETRÁS del cuerpo (clave). MÁXIMO STRETCH. De espaldas a la polea.', FALSE),
    (12, 16, 2, 3, '10-12', 1, 60, '1-1-3-1', 'EJERCICIO EN STRETCH - Mismo principio. Maximiza braquial en estiramiento.', 'Banco a 45°. Estiramiento completo abajo.', FALSE),
    (12, 29, 3, 3, '10-12', 1, 90, '1-1-3-1', 'EJERCICIO EN STRETCH - Clave para cabeza larga del tríceps. Excéntrico 3s + pausa 1s.', 'De espaldas a la polea. MÁXIMO STRETCH. Codos fijos.', FALSE),
    (12, 30, 4, 2, '12-15', 1, 60, '1-1-2-0', 'Tempo estándar. Sin pausa arriba para tensión constante.', 'Trabaja cabeza lateral. Codos fijos. Squeeze 1s abajo.', FALSE);

-- Ejercicios Día 4 - Laterales Finisher
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, tempo, tempo_razon, notas, es_calentamiento) VALUES
    (13, 24, 1, 3, '15-20', 1, 45, '1-0-2-0', 'Burnout metabólico - tempo fluido sin pausas para acumulación de metabolitos.', 'Cables cruzados: mano derecha agarra cable izquierdo y viceversa. Elevar hasta paralelo. Reps continuas al fallo.', FALSE);
