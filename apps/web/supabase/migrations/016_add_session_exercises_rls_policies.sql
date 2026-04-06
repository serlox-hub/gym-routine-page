-- Crear políticas RLS para session_exercises
-- La tabla tenía RLS activado pero solo la política "Allow all for anon" (eliminada en 014)
-- Sin políticas, todo acceso quedaba bloqueado

DROP POLICY IF EXISTS "Users can view session exercises for own sessions" ON session_exercises;
DROP POLICY IF EXISTS "Users can manage session exercises for own sessions" ON session_exercises;
DROP POLICY IF EXISTS "Users can update session exercises for own sessions" ON session_exercises;
DROP POLICY IF EXISTS "Users can delete session exercises for own sessions" ON session_exercises;

CREATE POLICY "Users can view session exercises for own sessions"
    ON session_exercises FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_exercises.session_id AND workout_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage session exercises for own sessions"
    ON session_exercises FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_exercises.session_id AND workout_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can update session exercises for own sessions"
    ON session_exercises FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_exercises.session_id AND workout_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete session exercises for own sessions"
    ON session_exercises FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_exercises.session_id AND workout_sessions.user_id = auth.uid()
    ));
