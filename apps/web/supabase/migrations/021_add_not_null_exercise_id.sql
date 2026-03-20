-- Añadir NOT NULL a exercise_id en routine_exercises y session_exercises.
-- Estas FK nunca deberian ser null (un ejercicio de rutina/sesion sin ejercicio no tiene sentido).

ALTER TABLE routine_exercises ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE session_exercises ALTER COLUMN exercise_id SET NOT NULL;
