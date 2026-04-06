-- ============================================
-- MIGRACIÓN: Re-linkear ejercicios del usuario 27a765cf a ejercicios del sistema
-- ============================================

-- Mapeo: ejercicio custom del usuario → ejercicio del sistema (por name_es del sistema)

CREATE TEMP TABLE exercise_migration_map (
    old_exercise_id INT,
    new_exercise_name_es TEXT
);

INSERT INTO exercise_migration_map (old_exercise_id, new_exercise_name_es) VALUES
    -- Match directo
    (1, 'Rueda abdominal'),
    (6, 'Plancha lateral'),
    (7, 'Hollow hold'),
    (15, 'Curl con barra EZ'),
    (26, 'Press inclinado con mancuernas'),
    (28, 'Extensión de tríceps en polea con cuerda'),
    (29, 'Extensión de tríceps sobre cabeza en polea con cuerda'),
    (30, 'Extensión de tríceps en polea con barra V'),
    (31, 'Prensa de piernas inclinada'),
    (33, 'Peso muerto rumano con barra'),
    (34, 'Curl femoral tumbado en máquina'),
    (35, 'Abducción de cadera en máquina'),
    (41, 'Puente de glúteos'),
    (32, 'Hip thrust en máquina'),
    (10, 'Remo con mancuernas en banco inclinado'),
    (345, 'Sentadilla hack en máquina'),
    (354, 'Elevación de piernas colgado'),
    (249, 'Curl en banco predicador con barra EZ'),
    (346, 'Hiperextensiones con peso'),
    -- Match aproximado (mismo ejercicio, nombre distinto)
    (2, 'Dead bug'),
    (3, 'Pallof press en polea'),
    (5, 'Crunch en máquina de polea'),
    (9, 'Dominadas'),
    (13, 'Jalón al pecho agarre neutro'),
    (14, 'Curl en banco inclinado con mancuernas'),
    (19, 'Face pull en polea'),
    (20, 'Press de hombros con mancuernas sentado'),
    (23, 'Pájaros en máquina pec deck inversa'),
    (25, 'Fondos en paralelas'),
    (8, 'Paseo del granjero'),
    (248, 'Remo en polea alta'),
    -- Ejercicios añadidos al seed por el usuario
    (4, 'Perro-pájaro'),
    (16, 'Curl martillo inclinado con mancuernas'),
    (22, 'Elevaciones en Y en banco inclinado'),
    (36, 'Rotación externa con banda'),
    (37, 'Pull-apart con banda'),
    (18, 'Elevaciones laterales en polea');

-- ============================================
-- 1. Migrar weight_unit overrides (ejercicios que estaban en lb)
-- Guardar como user_preference ANTES de re-linkear
-- ============================================

-- Primero, construir el JSON de overrides con los nuevos exercise_ids
-- Solo inserta si hay ejercicios con lb (evita error con jsonb_object_agg vacío)
INSERT INTO user_preferences (user_id, key, value)
SELECT
    '27a765cf-c3a6-4c98-94d9-21c2f3dec2a0'::uuid,
    'exercise_weight_unit_overrides',
    jsonb_object_agg(sys.id::text, old_ex.weight_unit)
FROM exercise_migration_map m
JOIN exercises old_ex ON old_ex.id = m.old_exercise_id
JOIN exercises sys ON sys.name_es = m.new_exercise_name_es AND sys.is_system = true
WHERE old_ex.weight_unit IS NOT NULL AND old_ex.weight_unit != 'kg'
HAVING count(*) > 0
ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================
-- 2. Re-linkear todas las tablas que referencian exercise_id
-- ============================================

-- routine_exercises
UPDATE routine_exercises re
SET exercise_id = sys.id
FROM exercise_migration_map m
JOIN exercises sys ON sys.name_es = m.new_exercise_name_es AND sys.is_system = true
WHERE re.exercise_id = m.old_exercise_id;

-- session_exercises
UPDATE session_exercises se
SET exercise_id = sys.id
FROM exercise_migration_map m
JOIN exercises sys ON sys.name_es = m.new_exercise_name_es AND sys.is_system = true
WHERE se.exercise_id = m.old_exercise_id;

-- exercise_session_stats
UPDATE exercise_session_stats ess
SET exercise_id = sys.id
FROM exercise_migration_map m
JOIN exercises sys ON sys.name_es = m.new_exercise_name_es AND sys.is_system = true
WHERE ess.exercise_id = m.old_exercise_id;

-- ============================================
-- 3. Soft-delete los ejercicios custom migrados
-- ============================================

UPDATE exercises
SET deleted_at = NOW()
FROM exercise_migration_map m
WHERE exercises.id = m.old_exercise_id
AND exercises.deleted_at IS NULL;

DROP TABLE exercise_migration_map;
