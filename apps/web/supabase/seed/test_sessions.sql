-- ============================================
-- SESIÓN 1: Hace 10 días
-- ============================================
INSERT INTO workout_sessions (id, routine_day_id, started_at, completed_at, duration_minutes, status, sensacion_general, notas)
VALUES (
    'a1b2c3d4-0001-0001-0001-000000000001',
    1,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days' + INTERVAL '65 minutes',
    65,
    'completed',
    3,
    'Primera sesión después de vacaciones, me costó un poco'
);

-- Dominadas Lastradas
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, weight, weight_unit, reps_completed, rir_actual, notas, performed_at)
VALUES
    ('a1b2c3d4-0001-0001-0001-000000000001', 8, 8, 1, 5, 'kg', 6, 2, NULL, NOW() - INTERVAL '10 days'),
    ('a1b2c3d4-0001-0001-0001-000000000001', 8, 8, 2, 5, 'kg', 5, 1, NULL, NOW() - INTERVAL '10 days'),
    ('a1b2c3d4-0001-0001-0001-000000000001', 8, 8, 3, 0, 'kg', 5, 0, 'Sin lastre, estaba muy cansado', NOW() - INTERVAL '10 days');

-- Remo en Polea
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, weight, weight_unit, reps_completed, rir_actual, notas, performed_at)
VALUES
    ('a1b2c3d4-0001-0001-0001-000000000001', 9, 9, 1, 100, 'lb', 10, 2, NULL, NOW() - INTERVAL '10 days'),
    ('a1b2c3d4-0001-0001-0001-000000000001', 9, 9, 2, 100, 'lb', 9, 1, NULL, NOW() - INTERVAL '10 days'),
    ('a1b2c3d4-0001-0001-0001-000000000001', 9, 9, 3, 100, 'lb', 8, 0, NULL, NOW() - INTERVAL '10 days');

-- Curl de Bíceps
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, weight, weight_unit, reps_completed, rir_actual, notas, performed_at)
VALUES
    ('a1b2c3d4-0001-0001-0001-000000000001', 12, 12, 1, 30, 'lb', 12, 3, NULL, NOW() - INTERVAL '10 days'),
    ('a1b2c3d4-0001-0001-0001-000000000001', 12, 12, 2, 30, 'lb', 11, 2, NULL, NOW() - INTERVAL '10 days'),
    ('a1b2c3d4-0001-0001-0001-000000000001', 12, 12, 3, 30, 'lb', 10, 1, NULL, NOW() - INTERVAL '10 days');

-- ============================================
-- SESIÓN 2: Hace 7 días
-- ============================================
INSERT INTO workout_sessions (id, routine_day_id, started_at, completed_at, duration_minutes, status, sensacion_general)
VALUES (
    'a1b2c3d4-0001-0001-0001-000000000002',
    1,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days' + INTERVAL '70 minutes',
    70,
    'completed',
    4
);

-- Dominadas Lastradas
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, weight, weight_unit, reps_completed, rir_actual, notas, performed_at)
VALUES
    ('a1b2c3d4-0001-0001-0001-000000000002', 8, 8, 1, 7.5, 'kg', 7, 2, NULL, NOW() - INTERVAL '7 days'),
    ('a1b2c3d4-0001-0001-0001-000000000002', 8, 8, 2, 7.5, 'kg', 6, 1, NULL, NOW() - INTERVAL '7 days'),
    ('a1b2c3d4-0001-0001-0001-000000000002', 8, 8, 3, 5, 'kg', 6, 1, NULL, NOW() - INTERVAL '7 days');

-- Remo en Polea
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, weight, weight_unit, reps_completed, rir_actual, notas, performed_at)
VALUES
    ('a1b2c3d4-0001-0001-0001-000000000002', 9, 9, 1, 110, 'lb', 10, 2, NULL, NOW() - INTERVAL '7 days'),
    ('a1b2c3d4-0001-0001-0001-000000000002', 9, 9, 2, 110, 'lb', 10, 1, NULL, NOW() - INTERVAL '7 days'),
    ('a1b2c3d4-0001-0001-0001-000000000002', 9, 9, 3, 110, 'lb', 9, 0, 'Buen pump', NOW() - INTERVAL '7 days');

-- Curl de Bíceps
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, weight, weight_unit, reps_completed, rir_actual, notas, performed_at)
VALUES
    ('a1b2c3d4-0001-0001-0001-000000000002', 12, 12, 1, 35, 'lb', 12, 2, NULL, NOW() - INTERVAL '7 days'),
    ('a1b2c3d4-0001-0001-0001-000000000002', 12, 12, 2, 35, 'lb', 11, 1, NULL, NOW() - INTERVAL '7 days'),
    ('a1b2c3d4-0001-0001-0001-000000000002', 12, 12, 3, 35, 'lb', 10, 0, NULL, NOW() - INTERVAL '7 days');

-- ============================================
-- SESIÓN 3: Hace 3 días
-- ============================================
INSERT INTO workout_sessions (id, routine_day_id, started_at, completed_at, duration_minutes, status, sensacion_general)
VALUES (
    'a1b2c3d4-0001-0001-0001-000000000003',
    1,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days' + INTERVAL '75 minutes',
    75,
    'completed',
    5
);

-- Dominadas Lastradas
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, weight, weight_unit, reps_completed, rir_actual, notas, performed_at)
VALUES
    ('a1b2c3d4-0001-0001-0001-000000000003', 8, 8, 1, 10, 'kg', 8, 2, 'PR!', NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-0001-0001-0001-000000000003', 8, 8, 2, 10, 'kg', 7, 1, NULL, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-0001-0001-0001-000000000003', 8, 8, 3, 7.5, 'kg', 6, 0, NULL, NOW() - INTERVAL '3 days');

-- Remo en Polea
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, weight, weight_unit, reps_completed, rir_actual, notas, performed_at)
VALUES
    ('a1b2c3d4-0001-0001-0001-000000000003', 9, 9, 1, 120, 'lb', 10, 2, NULL, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-0001-0001-0001-000000000003', 9, 9, 2, 120, 'lb', 10, 1, 'Subir peso próximo día', NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-0001-0001-0001-000000000003', 9, 9, 3, 120, 'lb', 9, 0, NULL, NOW() - INTERVAL '3 days');

-- Curl de Bíceps
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, weight, weight_unit, reps_completed, rir_actual, notas, performed_at)
VALUES
    ('a1b2c3d4-0001-0001-0001-000000000003', 12, 12, 1, 40, 'lb', 12, 2, NULL, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-0001-0001-0001-000000000003', 12, 12, 2, 40, 'lb', 11, 1, NULL, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-0001-0001-0001-000000000003', 12, 12, 3, 40, 'lb', 10, -1, 'Llegué al fallo', NOW() - INTERVAL '3 days');

-- Rueda Abdominal
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, reps_completed, rir_actual, notas, performed_at)
VALUES
    ('a1b2c3d4-0001-0001-0001-000000000003', 1, 1, 1, 12, 1, NULL, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-0001-0001-0001-000000000003', 1, 1, 2, 10, 0, 'Molestia leve espalda baja', NOW() - INTERVAL '3 days');

-- Hollow Body Hold
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, time_seconds, rir_actual, notas, performed_at)
VALUES
    ('a1b2c3d4-0001-0001-0001-000000000003', 7, 7, 1, 30, 2, NULL, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-0001-0001-0001-000000000003', 7, 7, 2, 25, 0, NULL, NOW() - INTERVAL '3 days');
