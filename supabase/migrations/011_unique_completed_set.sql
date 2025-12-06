
-- Crear constraint única
ALTER TABLE completed_sets
ADD CONSTRAINT unique_set_per_session
UNIQUE (session_id, exercise_id, set_number, routine_exercise_id);
