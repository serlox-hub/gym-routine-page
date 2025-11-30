-- Sesión de prueba completada hace 3 días
INSERT INTO workout_sessions (id, routine_day_id, started_at, completed_at, duration_minutes, status, sensacion_general)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    1, -- Core + Espalda + Bíceps
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days' + INTERVAL '75 minutes',
    75,
    'completed',
    4
);

-- Series completadas para varios ejercicios

-- Rueda Abdominal (exercise_id=1, reps_only)
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, reps_completed, performed_at)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 1, 1, 1, 12, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 1, 1, 2, 10, NOW() - INTERVAL '3 days');

-- Bicho Muerto (exercise_id=2, reps_per_side)
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, reps_completed, performed_at)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2, 2, 1, 8, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2, 2, 2, 8, NOW() - INTERVAL '3 days');

-- Dominadas Lastradas (exercise_id=8, weight_reps)
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, weight, weight_unit, reps_completed, performed_at)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 8, 8, 1, 10, 'kg', 8, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 8, 8, 2, 10, 'kg', 7, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 8, 8, 3, 7.5, 'kg', 6, NOW() - INTERVAL '3 days');

-- Remo en Polea (exercise_id=9, weight_reps, lb)
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, weight, weight_unit, reps_completed, performed_at)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9, 9, 1, 120, 'lb', 10, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9, 9, 2, 120, 'lb', 9, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9, 9, 3, 110, 'lb', 10, NOW() - INTERVAL '3 days');

-- Hollow Body Hold (exercise_id=7, time)
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, time_seconds, performed_at)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 7, 7, 1, 25, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 7, 7, 2, 22, NOW() - INTERVAL '3 days');

-- Plancha Lateral (exercise_id=6, time_per_side)
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, time_seconds, performed_at)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 6, 6, 1, 30, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 6, 6, 2, 28, NOW() - INTERVAL '3 days');

-- Curl de Bíceps en Polea (exercise_id=12, weight_reps, lb)
INSERT INTO completed_sets (session_id, routine_exercise_id, exercise_id, set_number, weight, weight_unit, reps_completed, performed_at)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 12, 12, 1, 40, 'lb', 12, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 12, 12, 2, 40, 'lb', 11, NOW() - INTERVAL '3 days'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 12, 12, 3, 35, 'lb', 12, NOW() - INTERVAL '3 days');
