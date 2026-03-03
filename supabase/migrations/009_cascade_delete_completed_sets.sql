-- Cambiar FK de completed_sets.session_exercise_id para que borre en cascada
-- al eliminar un ejercicio de la sesión
ALTER TABLE completed_sets
  DROP CONSTRAINT completed_sets_session_exercise_id_fkey,
  ADD CONSTRAINT completed_sets_session_exercise_id_fkey
    FOREIGN KEY (session_exercise_id)
    REFERENCES session_exercises(id)
    ON DELETE CASCADE;
