-- ============================================
-- MIGRACIÓN: Re-linkear ejercicios custom restantes + nuevos ejercicios de sistema
-- ============================================

-- 1. Renombrar jalón neutro actual a "estrecho" + añadir instrucciones
UPDATE exercises
SET name_es = 'Jalón al pecho agarre neutro estrecho',
    name_en = 'Close Neutral-Grip Lat Pulldown',
    instructions = '{
      "es": {
        "setup": "Coloca un agarre neutro estrecho (triángulo o barra V) en la polea alta. Siéntate con los muslos bien sujetos bajo las almohadillas y agarra con las palmas enfrentadas.",
        "execution": "Tira del agarre hacia el pecho inferior/esternón llevando los codos cerca del cuerpo. Aprieta los dorsales abajo y vuelve controlando el peso hasta extensión completa.",
        "cues": ["Codos pegados al cuerpo", "Tira hacia el esternón, no hacia la barbilla", "Inclina ligeramente el torso hacia atrás"]
      },
      "en": {
        "setup": "Attach a close neutral-grip handle (triangle or V-bar) to the high pulley. Sit with thighs secured under the pads and grab with palms facing each other.",
        "execution": "Pull the handle down toward your lower chest/sternum keeping elbows close to your body. Squeeze your lats at the bottom and return the weight under control to full extension.",
        "cues": ["Keep elbows tight to your body", "Pull toward the sternum, not the chin", "Slight torso lean back"]
      }
    }'::jsonb
WHERE id = 505;

-- 2. Crear nuevos ejercicios de sistema
INSERT INTO exercises (name_es, name_en, measurement_type, weight_unit, is_system, muscle_group_id, equipment_type_id, instructions)
VALUES
  ('Jalón al pecho agarre neutro ancho', 'Wide Neutral-Grip Lat Pulldown', 'weight_reps', NULL,
   true,
   (SELECT id FROM muscle_groups WHERE name_es = 'Espalda'),
   (SELECT id FROM equipment_types WHERE key = 'cable'),
   '{
     "es": {
       "setup": "Coloca un agarre neutro ancho en la polea alta. Siéntate con los muslos bien sujetos bajo las almohadillas y agarra con las palmas enfrentadas.",
       "execution": "Tira del agarre hacia el pecho superior arqueando ligeramente la espalda. Aprieta los dorsales abajo y vuelve controlando el peso hasta extensión completa de brazos.",
       "cues": ["Codos hacia abajo y ligeramente hacia atrás", "Pecho alto, no encorvar la espalda", "Pausa breve abajo para máxima contracción"]
     },
     "en": {
       "setup": "Attach a wide neutral-grip handle to the high pulley. Sit with thighs secured under the pads and grab the handle with palms facing each other.",
       "execution": "Pull the handle down to your upper chest while slightly arching your back. Squeeze your lats at the bottom and return the weight under control to full arm extension.",
       "cues": ["Drive elbows down and slightly back", "Keep chest up, avoid rounding your back", "Brief pause at the bottom for peak contraction"]
     }
   }'::jsonb),
  ('Remo en máquina T', 'T-Bar Row Machine', 'weight_reps', NULL,
   true,
   (SELECT id FROM muscle_groups WHERE name_es = 'Espalda'),
   (SELECT id FROM equipment_types WHERE key = 'machine'),
   '{
     "es": {
       "setup": "Apoya el pecho en la almohadilla de la máquina T-bar. Agarra las asas con ambas manos y desbloquea el peso.",
       "execution": "Tira de las asas hacia el pecho manteniendo el torso apoyado en la almohadilla. Aprieta las escápulas arriba y baja el peso de forma controlada.",
       "cues": ["Pecho siempre en contacto con la almohadilla", "Aprieta escápulas al final del tirón", "No usar impulso ni balanceo"]
     },
     "en": {
       "setup": "Rest your chest on the machine pad. Grab the handles with both hands and unlock the weight.",
       "execution": "Pull the handles toward your chest while keeping your torso pressed against the pad. Squeeze your shoulder blades at the top and lower the weight under control.",
       "cues": ["Keep chest pressed against the pad throughout", "Squeeze shoulder blades at peak contraction", "No momentum or swinging"]
     }
   }'::jsonb);

-- 3. Mapeo de ejercicios custom → sistema
CREATE TEMP TABLE exercise_migration_map_2 (
    old_exercise_id INT,
    new_exercise_id INT NOT NULL
);

INSERT INTO exercise_migration_map_2 (old_exercise_id, new_exercise_id) VALUES
    (12,  521),  -- Remo Alto en Polea Agarre Prono → Remo en polea alta
    (17,  592),  -- Curl Bayesian en Polea → Curl bayesiano en polea
    (239, 506),  -- Jalón Ancho en Polea Agarre Prono → Jalón al pecho agarre ancho
    (245, 715),  -- Plancha Frontal → Plancha frontal
    (246, 467),  -- Press banca plano con barra → Press de banca con barra
    (247, 516),  -- Remo en polea → Remo en polea baja sentado
    (250, 484),  -- Peck deck en máquina → Aperturas en máquina pec deck
    (257, 526),  -- Remo con barra pendlay → Remo Pendlay
    (259, 505),  -- Jalón ancho neutro → Jalón al pecho agarre neutro estrecho
    (263, 573),  -- Curl bíceps con barra → Curl con barra recta
    (267, 629),  -- Sentadilla trasera con barra → Sentadilla con barra alta
    (269, 646),  -- Extensiones de cuádriceps → Extensión de cuádriceps en máquina
    (271, 657),  -- Curl femoral tumbado → Curl femoral tumbado en máquina
    (274, 698),  -- Elevación talones de pie Smith → Elevación de talones en máquina Smith
    (275, 694),  -- Elevación talones sentado → Elevación de talones sentado en máquina
    (292, 658);  -- Curl femoral sentado → Curl femoral sentado en máquina

-- Remo T en Máquina → nuevo ejercicio (resuelto por subquery)
INSERT INTO exercise_migration_map_2 (old_exercise_id, new_exercise_id)
SELECT 240, id FROM exercises WHERE name_es = 'Remo en máquina T' AND is_system = true;

-- Verificación: todos los mapeos deben tener destino
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM exercise_migration_map_2 WHERE new_exercise_id IS NULL) THEN
    RAISE EXCEPTION 'Hay mapeos sin ejercicio destino';
  END IF;
  IF (SELECT count(*) FROM exercise_migration_map_2) != 17 THEN
    RAISE EXCEPTION 'Se esperaban 17 mapeos, hay %', (SELECT count(*) FROM exercise_migration_map_2);
  END IF;
END $$;

-- 4. Re-linkear routine_exercises
UPDATE routine_exercises re
SET exercise_id = m.new_exercise_id
FROM exercise_migration_map_2 m
WHERE re.exercise_id = m.old_exercise_id;

-- 5. Re-linkear session_exercises
UPDATE session_exercises se
SET exercise_id = m.new_exercise_id
FROM exercise_migration_map_2 m
WHERE se.exercise_id = m.old_exercise_id;

-- 6. Re-linkear exercise_session_stats
UPDATE exercise_session_stats ess
SET exercise_id = m.new_exercise_id
FROM exercise_migration_map_2 m
WHERE ess.exercise_id = m.old_exercise_id;

-- 7. Soft-delete los ejercicios custom migrados
UPDATE exercises
SET deleted_at = NOW()
FROM exercise_migration_map_2 m
WHERE exercises.id = m.old_exercise_id
AND exercises.deleted_at IS NULL;

DROP TABLE exercise_migration_map_2;
