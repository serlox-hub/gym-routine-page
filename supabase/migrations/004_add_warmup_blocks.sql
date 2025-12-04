-- ============================================
-- Añadir bloques de calentamiento para cada día
-- Los ejercicios de calentamiento son simples checklists
-- ============================================

-- Primero añadimos ejercicios de calentamiento a la tabla exercises (IDs 36-41)
INSERT INTO exercises (nombre, equipment_id, measurement_type) VALUES
    ('Rotación externa con goma', 13, 'reps_per_side'),
    ('Pull-aparts con banda', 13, 'reps_only'),
    ('Círculos de brazos', 12, 'reps_only'),
    ('Sentadilla sin peso', 12, 'reps_only'),
    ('Balanceos de pierna', 12, 'reps_per_side'),
    ('Puente de glúteos', 12, 'reps_only');

-- Bloques de calentamiento (IDs 14-17, orden 0 para que aparezcan primero)
INSERT INTO routine_blocks (routine_day_id, nombre, orden, duracion_min) VALUES
    (1, 'Calentamiento', 0, 4),
    (2, 'Calentamiento', 0, 5),
    (3, 'Calentamiento', 0, 4),
    (4, 'Calentamiento', 0, 4);

-- Ejercicios de calentamiento Día 1 (upper body)
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, notas, es_calentamiento) VALUES
    (14, 36, 1, 1, '15/lado', NULL, 0, 'Activación de manguito rotador', TRUE),
    (14, 37, 2, 1, '15', NULL, 0, 'Activación de espalda alta', TRUE),
    (14, 38, 3, 1, '10+10', NULL, 0, 'Adelante + atrás', TRUE),
    (14, 9, 4, 1, '5', NULL, 0, 'Serie de aproximación sin peso', TRUE);

-- Ejercicios de calentamiento Día 2 (lower body)
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, notas, es_calentamiento) VALUES
    (15, 39, 1, 1, '10', NULL, 0, 'Sentadilla profunda', TRUE),
    (15, 40, 2, 1, '10/lado', NULL, 0, 'Adelante-atrás', TRUE),
    (15, 41, 3, 1, '10', NULL, 0, 'Activación de glúteos', TRUE),
    (15, 31, 4, 1, '8', NULL, 0, 'Serie de aproximación 50% peso', TRUE);

-- Ejercicios de calentamiento Día 3 (upper body - hombros/pecho)
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, notas, es_calentamiento) VALUES
    (16, 36, 1, 1, '15/lado', NULL, 0, 'Activación de manguito rotador', TRUE),
    (16, 37, 2, 1, '15', NULL, 0, 'Activación de espalda alta', TRUE),
    (16, 38, 3, 1, '10+10', NULL, 0, 'Adelante + atrás', TRUE),
    (16, 20, 4, 1, '8', NULL, 0, 'Serie de aproximación 50% peso', TRUE);

-- Ejercicios de calentamiento Día 4 (upper body - espalda/brazos)
INSERT INTO routine_exercises (routine_block_id, exercise_id, orden, series, reps, rir, descanso_seg, notas, es_calentamiento) VALUES
    (17, 36, 1, 1, '15/lado', NULL, 0, 'Activación de manguito rotador', TRUE),
    (17, 37, 2, 1, '15', NULL, 0, 'Activación de espalda alta', TRUE),
    (17, 38, 3, 1, '10+10', NULL, 0, 'Adelante + atrás', TRUE),
    (17, 12, 4, 1, '8', NULL, 0, 'Serie de aproximación 50% peso', TRUE);
