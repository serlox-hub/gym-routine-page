-- ============================================
-- SEED TEST DATA - Workout Sessions
-- ============================================
-- Ejecutar después de reset:
-- DOCKER_HOST="unix:///Users/sergio/.colima/default/docker.sock" docker exec -i supabase_db_gym-routine-page psql -U postgres -d postgres < supabase/seed_test_data.sql
--
-- Este script crea ~19 sesiones de entrenamiento PPL (Push/Pull/Legs)
-- distribuidas en las últimas 6 semanas con progresión de pesos.
-- ============================================

DO $$
DECLARE
    v_user_id UUID;
    v_session_id UUID;
    v_exercise_id INTEGER;
    v_base_date DATE := CURRENT_DATE;
BEGIN

-- Obtener el primer usuario (o crear uno si no existe)
SELECT id INTO v_user_id FROM auth.users LIMIT 1;

IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No hay usuarios en la base de datos. Crea un usuario primero.';
END IF;

RAISE NOTICE 'Insertando datos de prueba para usuario: %', v_user_id;

-- Limpiar datos anteriores del usuario
DELETE FROM completed_sets WHERE session_id IN (
    SELECT id FROM workout_sessions WHERE workout_sessions.user_id = v_user_id
);
DELETE FROM session_exercises WHERE session_id IN (
    SELECT id FROM workout_sessions WHERE workout_sessions.user_id = v_user_id
);
DELETE FROM workout_sessions WHERE workout_sessions.user_id = v_user_id;

-- ============================================
-- SEMANA -6
-- ============================================

-- Push (Lunes)
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '42 days' + TIME '10:00', v_base_date - INTERVAL '42 days' + TIME '11:15', 75, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 1, 0, 3, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 60, 8, v_base_date - INTERVAL '42 days' + TIME '10:10', 'kg', true),
    (v_session_id, v_exercise_id, 2, 65, 8, v_base_date - INTERVAL '42 days' + TIME '10:15', 'kg', true),
    (v_session_id, v_exercise_id, 3, 70, 6, v_base_date - INTERVAL '42 days' + TIME '10:20', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 5, 1, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 22, 10, v_base_date - INTERVAL '42 days' + TIME '10:30', 'kg', true),
    (v_session_id, v_exercise_id, 2, 24, 9, v_base_date - INTERVAL '42 days' + TIME '10:35', 'kg', true),
    (v_session_id, v_exercise_id, 3, 24, 8, v_base_date - INTERVAL '42 days' + TIME '10:40', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 3, 2, 3, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 40, 8, v_base_date - INTERVAL '42 days' + TIME '10:50', 'kg', true),
    (v_session_id, v_exercise_id, 2, 42.5, 7, v_base_date - INTERVAL '42 days' + TIME '10:55', 'kg', true),
    (v_session_id, v_exercise_id, 3, 42.5, 6, v_base_date - INTERVAL '42 days' + TIME '11:00', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 9, 3, 3, '12') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 10, 12, v_base_date - INTERVAL '42 days' + TIME '11:05', 'kg', true),
    (v_session_id, v_exercise_id, 2, 10, 12, v_base_date - INTERVAL '42 days' + TIME '11:08', 'kg', true),
    (v_session_id, v_exercise_id, 3, 10, 11, v_base_date - INTERVAL '42 days' + TIME '11:11', 'kg', true);

-- Pull (Miércoles)
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '40 days' + TIME '10:00', v_base_date - INTERVAL '40 days' + TIME '11:20', 80, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 4, 0, 3, '5') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 100, 5, v_base_date - INTERVAL '40 days' + TIME '10:15', 'kg', true),
    (v_session_id, v_exercise_id, 2, 110, 5, v_base_date - INTERVAL '40 days' + TIME '10:22', 'kg', true),
    (v_session_id, v_exercise_id, 3, 115, 4, v_base_date - INTERVAL '40 days' + TIME '10:30', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 10, 1, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 55, 10, v_base_date - INTERVAL '40 days' + TIME '10:40', 'kg', true),
    (v_session_id, v_exercise_id, 2, 60, 9, v_base_date - INTERVAL '40 days' + TIME '10:45', 'kg', true),
    (v_session_id, v_exercise_id, 3, 60, 8, v_base_date - INTERVAL '40 days' + TIME '10:50', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 6, 2, 3, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 60, 8, v_base_date - INTERVAL '40 days' + TIME '11:00', 'kg', true),
    (v_session_id, v_exercise_id, 2, 65, 7, v_base_date - INTERVAL '40 days' + TIME '11:05', 'kg', true),
    (v_session_id, v_exercise_id, 3, 65, 7, v_base_date - INTERVAL '40 days' + TIME '11:10', 'kg', true);

-- Legs (Viernes)
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '38 days' + TIME '10:00', v_base_date - INTERVAL '38 days' + TIME '11:30', 90, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 2, 0, 3, '6') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 80, 6, v_base_date - INTERVAL '38 days' + TIME '10:15', 'kg', true),
    (v_session_id, v_exercise_id, 2, 85, 5, v_base_date - INTERVAL '38 days' + TIME '10:25', 'kg', true),
    (v_session_id, v_exercise_id, 3, 90, 4, v_base_date - INTERVAL '38 days' + TIME '10:35', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 7, 1, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 120, 10, v_base_date - INTERVAL '38 days' + TIME '10:50', 'kg', true),
    (v_session_id, v_exercise_id, 2, 140, 10, v_base_date - INTERVAL '38 days' + TIME '10:55', 'kg', true),
    (v_session_id, v_exercise_id, 3, 150, 8, v_base_date - INTERVAL '38 days' + TIME '11:00', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 8, 2, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 40, 10, v_base_date - INTERVAL '38 days' + TIME '11:10', 'kg', true),
    (v_session_id, v_exercise_id, 2, 45, 9, v_base_date - INTERVAL '38 days' + TIME '11:15', 'kg', true),
    (v_session_id, v_exercise_id, 3, 45, 8, v_base_date - INTERVAL '38 days' + TIME '11:20', 'kg', true);

-- ============================================
-- SEMANA -5
-- ============================================

-- Push
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '35 days' + TIME '10:00', v_base_date - INTERVAL '35 days' + TIME '11:10', 70, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 1, 0, 3, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 62.5, 8, v_base_date - INTERVAL '35 days' + TIME '10:10', 'kg', true),
    (v_session_id, v_exercise_id, 2, 67.5, 7, v_base_date - INTERVAL '35 days' + TIME '10:15', 'kg', true),
    (v_session_id, v_exercise_id, 3, 72.5, 5, v_base_date - INTERVAL '35 days' + TIME '10:20', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 3, 1, 3, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 42.5, 8, v_base_date - INTERVAL '35 days' + TIME '10:35', 'kg', true),
    (v_session_id, v_exercise_id, 2, 45, 6, v_base_date - INTERVAL '35 days' + TIME '10:40', 'kg', true),
    (v_session_id, v_exercise_id, 3, 45, 5, v_base_date - INTERVAL '35 days' + TIME '10:45', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 12, 2, 3, '12') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 0, 12, v_base_date - INTERVAL '35 days' + TIME '10:55', 'kg', true),
    (v_session_id, v_exercise_id, 2, 5, 10, v_base_date - INTERVAL '35 days' + TIME '11:00', 'kg', true),
    (v_session_id, v_exercise_id, 3, 5, 9, v_base_date - INTERVAL '35 days' + TIME '11:05', 'kg', true);

-- Pull
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '33 days' + TIME '18:00', v_base_date - INTERVAL '33 days' + TIME '19:15', 75, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 11, 0, 3, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 0, 8, v_base_date - INTERVAL '33 days' + TIME '18:10', 'kg', true),
    (v_session_id, v_exercise_id, 2, 0, 7, v_base_date - INTERVAL '33 days' + TIME '18:15', 'kg', true),
    (v_session_id, v_exercise_id, 3, 5, 6, v_base_date - INTERVAL '33 days' + TIME '18:20', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 6, 1, 3, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 62.5, 8, v_base_date - INTERVAL '33 days' + TIME '18:30', 'kg', true),
    (v_session_id, v_exercise_id, 2, 67.5, 7, v_base_date - INTERVAL '33 days' + TIME '18:35', 'kg', true),
    (v_session_id, v_exercise_id, 3, 67.5, 6, v_base_date - INTERVAL '33 days' + TIME '18:40', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 54, 2, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 12, 10, v_base_date - INTERVAL '33 days' + TIME '18:50', 'kg', true),
    (v_session_id, v_exercise_id, 2, 14, 9, v_base_date - INTERVAL '33 days' + TIME '18:55', 'kg', true),
    (v_session_id, v_exercise_id, 3, 14, 8, v_base_date - INTERVAL '33 days' + TIME '19:00', 'kg', true);

-- Legs
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '31 days' + TIME '10:00', v_base_date - INTERVAL '31 days' + TIME '11:20', 80, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 2, 0, 3, '6') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 82.5, 6, v_base_date - INTERVAL '31 days' + TIME '10:15', 'kg', true),
    (v_session_id, v_exercise_id, 2, 87.5, 5, v_base_date - INTERVAL '31 days' + TIME '10:25', 'kg', true),
    (v_session_id, v_exercise_id, 3, 92.5, 4, v_base_date - INTERVAL '31 days' + TIME '10:35', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 56, 1, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 50, 10, v_base_date - INTERVAL '31 days' + TIME '10:50', 'kg', true),
    (v_session_id, v_exercise_id, 2, 55, 9, v_base_date - INTERVAL '31 days' + TIME '10:55', 'kg', true),
    (v_session_id, v_exercise_id, 3, 55, 8, v_base_date - INTERVAL '31 days' + TIME '11:00', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 58, 2, 2, '15') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 60, 15, v_base_date - INTERVAL '31 days' + TIME '11:10', 'kg', true),
    (v_session_id, v_exercise_id, 2, 70, 12, v_base_date - INTERVAL '31 days' + TIME '11:15', 'kg', true);

-- ============================================
-- SEMANA -4
-- ============================================

-- Push
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '28 days' + TIME '10:00', v_base_date - INTERVAL '28 days' + TIME '11:20', 80, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 1, 0, 4, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 65, 8, v_base_date - INTERVAL '28 days' + TIME '10:10', 'kg', true),
    (v_session_id, v_exercise_id, 2, 70, 7, v_base_date - INTERVAL '28 days' + TIME '10:18', 'kg', true),
    (v_session_id, v_exercise_id, 3, 75, 5, v_base_date - INTERVAL '28 days' + TIME '10:26', 'kg', true),
    (v_session_id, v_exercise_id, 4, 77.5, 4, v_base_date - INTERVAL '28 days' + TIME '10:34', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 5, 1, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 24, 10, v_base_date - INTERVAL '28 days' + TIME '10:45', 'kg', true),
    (v_session_id, v_exercise_id, 2, 26, 9, v_base_date - INTERVAL '28 days' + TIME '10:50', 'kg', true),
    (v_session_id, v_exercise_id, 3, 26, 8, v_base_date - INTERVAL '28 days' + TIME '10:55', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 3, 2, 3, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 45, 7, v_base_date - INTERVAL '28 days' + TIME '11:05', 'kg', true),
    (v_session_id, v_exercise_id, 2, 47.5, 6, v_base_date - INTERVAL '28 days' + TIME '11:10', 'kg', true),
    (v_session_id, v_exercise_id, 3, 47.5, 5, v_base_date - INTERVAL '28 days' + TIME '11:15', 'kg', true);

-- Pull
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '26 days' + TIME '10:00', v_base_date - INTERVAL '26 days' + TIME '11:15', 75, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 4, 0, 3, '5') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 110, 5, v_base_date - INTERVAL '26 days' + TIME '10:15', 'kg', true),
    (v_session_id, v_exercise_id, 2, 120, 4, v_base_date - INTERVAL '26 days' + TIME '10:25', 'kg', true),
    (v_session_id, v_exercise_id, 3, 125, 3, v_base_date - INTERVAL '26 days' + TIME '10:35', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 11, 1, 3, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 0, 9, v_base_date - INTERVAL '26 days' + TIME '10:45', 'kg', true),
    (v_session_id, v_exercise_id, 2, 5, 7, v_base_date - INTERVAL '26 days' + TIME '10:50', 'kg', true),
    (v_session_id, v_exercise_id, 3, 5, 6, v_base_date - INTERVAL '26 days' + TIME '10:55', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 6, 2, 2, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 65, 8, v_base_date - INTERVAL '26 days' + TIME '11:05', 'kg', true),
    (v_session_id, v_exercise_id, 2, 70, 6, v_base_date - INTERVAL '26 days' + TIME '11:10', 'kg', true);

-- Legs
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '24 days' + TIME '10:00', v_base_date - INTERVAL '24 days' + TIME '11:25', 85, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 2, 0, 3, '5') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 85, 5, v_base_date - INTERVAL '24 days' + TIME '10:15', 'kg', true),
    (v_session_id, v_exercise_id, 2, 90, 5, v_base_date - INTERVAL '24 days' + TIME '10:25', 'kg', true),
    (v_session_id, v_exercise_id, 3, 95, 4, v_base_date - INTERVAL '24 days' + TIME '10:35', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 7, 1, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 140, 10, v_base_date - INTERVAL '24 days' + TIME '10:50', 'kg', true),
    (v_session_id, v_exercise_id, 2, 160, 8, v_base_date - INTERVAL '24 days' + TIME '10:58', 'kg', true),
    (v_session_id, v_exercise_id, 3, 170, 6, v_base_date - INTERVAL '24 days' + TIME '11:05', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 8, 2, 2, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 45, 10, v_base_date - INTERVAL '24 days' + TIME '11:15', 'kg', true),
    (v_session_id, v_exercise_id, 2, 50, 8, v_base_date - INTERVAL '24 days' + TIME '11:20', 'kg', true);

-- ============================================
-- SEMANA -3
-- ============================================

-- Push
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '21 days' + TIME '10:00', v_base_date - INTERVAL '21 days' + TIME '11:15', 75, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 1, 0, 4, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 67.5, 8, v_base_date - INTERVAL '21 days' + TIME '10:10', 'kg', true),
    (v_session_id, v_exercise_id, 2, 72.5, 6, v_base_date - INTERVAL '21 days' + TIME '10:18', 'kg', true),
    (v_session_id, v_exercise_id, 3, 77.5, 5, v_base_date - INTERVAL '21 days' + TIME '10:26', 'kg', true),
    (v_session_id, v_exercise_id, 4, 80, 3, v_base_date - INTERVAL '21 days' + TIME '10:34', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 3, 1, 3, '7') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 47.5, 7, v_base_date - INTERVAL '21 days' + TIME '10:45', 'kg', true),
    (v_session_id, v_exercise_id, 2, 50, 5, v_base_date - INTERVAL '21 days' + TIME '10:52', 'kg', true),
    (v_session_id, v_exercise_id, 3, 50, 4, v_base_date - INTERVAL '21 days' + TIME '10:59', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 9, 2, 3, '12') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 12, 12, v_base_date - INTERVAL '21 days' + TIME '11:05', 'kg', true),
    (v_session_id, v_exercise_id, 2, 12, 11, v_base_date - INTERVAL '21 days' + TIME '11:08', 'kg', true),
    (v_session_id, v_exercise_id, 3, 12, 10, v_base_date - INTERVAL '21 days' + TIME '11:11', 'kg', true);

-- Pull
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '19 days' + TIME '18:00', v_base_date - INTERVAL '19 days' + TIME '19:20', 80, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 4, 0, 3, '5') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 115, 5, v_base_date - INTERVAL '19 days' + TIME '18:15', 'kg', true),
    (v_session_id, v_exercise_id, 2, 125, 4, v_base_date - INTERVAL '19 days' + TIME '18:25', 'kg', true),
    (v_session_id, v_exercise_id, 3, 130, 3, v_base_date - INTERVAL '19 days' + TIME '18:35', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 10, 1, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 60, 10, v_base_date - INTERVAL '19 days' + TIME '18:45', 'kg', true),
    (v_session_id, v_exercise_id, 2, 65, 8, v_base_date - INTERVAL '19 days' + TIME '18:50', 'kg', true),
    (v_session_id, v_exercise_id, 3, 65, 8, v_base_date - INTERVAL '19 days' + TIME '18:55', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 54, 2, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 14, 10, v_base_date - INTERVAL '19 days' + TIME '19:05', 'kg', true),
    (v_session_id, v_exercise_id, 2, 16, 8, v_base_date - INTERVAL '19 days' + TIME '19:10', 'kg', true),
    (v_session_id, v_exercise_id, 3, 16, 7, v_base_date - INTERVAL '19 days' + TIME '19:15', 'kg', true);

-- Legs
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '17 days' + TIME '10:00', v_base_date - INTERVAL '17 days' + TIME '11:30', 90, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 2, 0, 3, '5') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 87.5, 5, v_base_date - INTERVAL '17 days' + TIME '10:15', 'kg', true),
    (v_session_id, v_exercise_id, 2, 95, 4, v_base_date - INTERVAL '17 days' + TIME '10:25', 'kg', true),
    (v_session_id, v_exercise_id, 3, 100, 3, v_base_date - INTERVAL '17 days' + TIME '10:35', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 56, 1, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 55, 10, v_base_date - INTERVAL '17 days' + TIME '10:50', 'kg', true),
    (v_session_id, v_exercise_id, 2, 60, 9, v_base_date - INTERVAL '17 days' + TIME '10:58', 'kg', true),
    (v_session_id, v_exercise_id, 3, 60, 8, v_base_date - INTERVAL '17 days' + TIME '11:05', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 26, 2, 2, '12') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 80, 12, v_base_date - INTERVAL '17 days' + TIME '11:15', 'kg', true),
    (v_session_id, v_exercise_id, 2, 90, 10, v_base_date - INTERVAL '17 days' + TIME '11:22', 'kg', true);

-- ============================================
-- SEMANA -2
-- ============================================

-- Push
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '14 days' + TIME '10:00', v_base_date - INTERVAL '14 days' + TIME '11:25', 85, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 1, 0, 4, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 70, 8, v_base_date - INTERVAL '14 days' + TIME '10:10', 'kg', true),
    (v_session_id, v_exercise_id, 2, 75, 6, v_base_date - INTERVAL '14 days' + TIME '10:18', 'kg', true),
    (v_session_id, v_exercise_id, 3, 80, 5, v_base_date - INTERVAL '14 days' + TIME '10:26', 'kg', true),
    (v_session_id, v_exercise_id, 4, 82.5, 3, v_base_date - INTERVAL '14 days' + TIME '10:34', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 5, 1, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 26, 10, v_base_date - INTERVAL '14 days' + TIME '10:45', 'kg', true),
    (v_session_id, v_exercise_id, 2, 28, 8, v_base_date - INTERVAL '14 days' + TIME '10:52', 'kg', true),
    (v_session_id, v_exercise_id, 3, 28, 7, v_base_date - INTERVAL '14 days' + TIME '10:59', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 3, 2, 2, '6') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 50, 6, v_base_date - INTERVAL '14 days' + TIME '11:10', 'kg', true),
    (v_session_id, v_exercise_id, 2, 52.5, 5, v_base_date - INTERVAL '14 days' + TIME '11:17', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 12, 3, 2, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 10, 10, v_base_date - INTERVAL '14 days' + TIME '11:20', 'kg', true),
    (v_session_id, v_exercise_id, 2, 10, 9, v_base_date - INTERVAL '14 days' + TIME '11:23', 'kg', true);

-- Pull
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '12 days' + TIME '10:00', v_base_date - INTERVAL '12 days' + TIME '11:20', 80, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 4, 0, 3, '5') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 120, 5, v_base_date - INTERVAL '12 days' + TIME '10:15', 'kg', true),
    (v_session_id, v_exercise_id, 2, 130, 3, v_base_date - INTERVAL '12 days' + TIME '10:25', 'kg', true),
    (v_session_id, v_exercise_id, 3, 135, 2, v_base_date - INTERVAL '12 days' + TIME '10:35', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 11, 1, 3, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 5, 8, v_base_date - INTERVAL '12 days' + TIME '10:45', 'kg', true),
    (v_session_id, v_exercise_id, 2, 7.5, 6, v_base_date - INTERVAL '12 days' + TIME '10:52', 'kg', true),
    (v_session_id, v_exercise_id, 3, 7.5, 5, v_base_date - INTERVAL '12 days' + TIME '10:59', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 6, 2, 2, '7') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 70, 7, v_base_date - INTERVAL '12 days' + TIME '11:10', 'kg', true),
    (v_session_id, v_exercise_id, 2, 72.5, 6, v_base_date - INTERVAL '12 days' + TIME '11:15', 'kg', true);

-- Legs
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '10 days' + TIME '10:00', v_base_date - INTERVAL '10 days' + TIME '11:35', 95, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 2, 0, 3, '5') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 90, 5, v_base_date - INTERVAL '10 days' + TIME '10:15', 'kg', true),
    (v_session_id, v_exercise_id, 2, 97.5, 4, v_base_date - INTERVAL '10 days' + TIME '10:25', 'kg', true),
    (v_session_id, v_exercise_id, 3, 102.5, 3, v_base_date - INTERVAL '10 days' + TIME '10:35', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 7, 1, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 160, 10, v_base_date - INTERVAL '10 days' + TIME '10:50', 'kg', true),
    (v_session_id, v_exercise_id, 2, 180, 8, v_base_date - INTERVAL '10 days' + TIME '10:58', 'kg', true),
    (v_session_id, v_exercise_id, 3, 180, 7, v_base_date - INTERVAL '10 days' + TIME '11:05', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 8, 2, 2, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 50, 10, v_base_date - INTERVAL '10 days' + TIME '11:20', 'kg', true),
    (v_session_id, v_exercise_id, 2, 55, 8, v_base_date - INTERVAL '10 days' + TIME '11:27', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 13, 3, 2, '15') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 30, 15, v_base_date - INTERVAL '10 days' + TIME '11:30', 'kg', true),
    (v_session_id, v_exercise_id, 2, 35, 12, v_base_date - INTERVAL '10 days' + TIME '11:33', 'kg', true);

-- ============================================
-- SEMANA -1 (semana pasada)
-- ============================================

-- Push
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '7 days' + TIME '10:00', v_base_date - INTERVAL '7 days' + TIME '11:30', 90, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 1, 0, 4, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 72.5, 8, v_base_date - INTERVAL '7 days' + TIME '10:10', 'kg', true),
    (v_session_id, v_exercise_id, 2, 77.5, 6, v_base_date - INTERVAL '7 days' + TIME '10:18', 'kg', true),
    (v_session_id, v_exercise_id, 3, 82.5, 4, v_base_date - INTERVAL '7 days' + TIME '10:26', 'kg', true),
    (v_session_id, v_exercise_id, 4, 85, 3, v_base_date - INTERVAL '7 days' + TIME '10:34', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 5, 1, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 28, 10, v_base_date - INTERVAL '7 days' + TIME '10:45', 'kg', true),
    (v_session_id, v_exercise_id, 2, 30, 8, v_base_date - INTERVAL '7 days' + TIME '10:52', 'kg', true),
    (v_session_id, v_exercise_id, 3, 30, 7, v_base_date - INTERVAL '7 days' + TIME '10:59', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 3, 2, 3, '6') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 52.5, 6, v_base_date - INTERVAL '7 days' + TIME '11:10', 'kg', true),
    (v_session_id, v_exercise_id, 2, 55, 5, v_base_date - INTERVAL '7 days' + TIME '11:17', 'kg', true),
    (v_session_id, v_exercise_id, 3, 55, 4, v_base_date - INTERVAL '7 days' + TIME '11:24', 'kg', true);

-- Pull
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '5 days' + TIME '18:00', v_base_date - INTERVAL '5 days' + TIME '19:25', 85, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 4, 0, 3, '4') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 125, 4, v_base_date - INTERVAL '5 days' + TIME '18:15', 'kg', true),
    (v_session_id, v_exercise_id, 2, 135, 3, v_base_date - INTERVAL '5 days' + TIME '18:25', 'kg', true),
    (v_session_id, v_exercise_id, 3, 140, 2, v_base_date - INTERVAL '5 days' + TIME '18:35', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 11, 1, 3, '8') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 7.5, 8, v_base_date - INTERVAL '5 days' + TIME '18:45', 'kg', true),
    (v_session_id, v_exercise_id, 2, 10, 6, v_base_date - INTERVAL '5 days' + TIME '18:52', 'kg', true),
    (v_session_id, v_exercise_id, 3, 10, 5, v_base_date - INTERVAL '5 days' + TIME '18:59', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 6, 2, 2, '7') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 72.5, 7, v_base_date - INTERVAL '5 days' + TIME '19:10', 'kg', true),
    (v_session_id, v_exercise_id, 2, 75, 6, v_base_date - INTERVAL '5 days' + TIME '19:17', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 54, 3, 2, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 16, 10, v_base_date - INTERVAL '5 days' + TIME '19:20', 'kg', true),
    (v_session_id, v_exercise_id, 2, 18, 8, v_base_date - INTERVAL '5 days' + TIME '19:23', 'kg', true);

-- Legs
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '3 days' + TIME '10:00', v_base_date - INTERVAL '3 days' + TIME '11:40', 100, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 2, 0, 4, '5') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 92.5, 5, v_base_date - INTERVAL '3 days' + TIME '10:15', 'kg', true),
    (v_session_id, v_exercise_id, 2, 100, 4, v_base_date - INTERVAL '3 days' + TIME '10:25', 'kg', true),
    (v_session_id, v_exercise_id, 3, 105, 3, v_base_date - INTERVAL '3 days' + TIME '10:35', 'kg', true),
    (v_session_id, v_exercise_id, 4, 107.5, 2, v_base_date - INTERVAL '3 days' + TIME '10:45', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 7, 1, 3, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 170, 10, v_base_date - INTERVAL '3 days' + TIME '11:00', 'kg', true),
    (v_session_id, v_exercise_id, 2, 190, 8, v_base_date - INTERVAL '3 days' + TIME '11:08', 'kg', true),
    (v_session_id, v_exercise_id, 3, 200, 6, v_base_date - INTERVAL '3 days' + TIME '11:16', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 8, 2, 2, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 55, 10, v_base_date - INTERVAL '3 days' + TIME '11:25', 'kg', true),
    (v_session_id, v_exercise_id, 2, 60, 8, v_base_date - INTERVAL '3 days' + TIME '11:30', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 26, 3, 2, '10') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 100, 10, v_base_date - INTERVAL '3 days' + TIME '11:35', 'kg', true),
    (v_session_id, v_exercise_id, 2, 110, 8, v_base_date - INTERVAL '3 days' + TIME '11:40', 'kg', true);

-- ============================================
-- SEMANA ACTUAL
-- ============================================

-- Push (Ayer)
INSERT INTO workout_sessions (user_id, started_at, completed_at, duration_minutes, status)
VALUES (v_user_id, v_base_date - INTERVAL '1 day' + TIME '10:00', v_base_date - INTERVAL '1 day' + TIME '11:20', 80, 'completed')
RETURNING id INTO v_session_id;

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 1, 0, 3, '7') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 75, 7, v_base_date - INTERVAL '1 day' + TIME '10:10', 'kg', true),
    (v_session_id, v_exercise_id, 2, 80, 5, v_base_date - INTERVAL '1 day' + TIME '10:18', 'kg', true),
    (v_session_id, v_exercise_id, 3, 82.5, 4, v_base_date - INTERVAL '1 day' + TIME '10:26', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 61, 1, 3, '12') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 40, 12, v_base_date - INTERVAL '1 day' + TIME '10:40', 'kg', true),
    (v_session_id, v_exercise_id, 2, 45, 10, v_base_date - INTERVAL '1 day' + TIME '10:45', 'kg', true),
    (v_session_id, v_exercise_id, 3, 45, 10, v_base_date - INTERVAL '1 day' + TIME '10:50', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 3, 2, 2, '6') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 55, 6, v_base_date - INTERVAL '1 day' + TIME '11:00', 'kg', true),
    (v_session_id, v_exercise_id, 2, 57.5, 4, v_base_date - INTERVAL '1 day' + TIME '11:08', 'kg', true);

INSERT INTO session_exercises (session_id, exercise_id, sort_order, series, reps) VALUES (v_session_id, 9, 3, 2, '12') RETURNING id INTO v_exercise_id;
INSERT INTO completed_sets (session_id, session_exercise_id, set_number, weight, reps_completed, performed_at, weight_unit, completed) VALUES
    (v_session_id, v_exercise_id, 1, 14, 12, v_base_date - INTERVAL '1 day' + TIME '11:15', 'kg', true),
    (v_session_id, v_exercise_id, 2, 14, 11, v_base_date - INTERVAL '1 day' + TIME '11:18', 'kg', true);

RAISE NOTICE 'Datos de prueba insertados correctamente';
RAISE NOTICE 'Sesiones: 19, Ejercicios: ~63, Series: ~179';

END $$;
