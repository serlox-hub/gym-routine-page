-- ============================================
-- PASO 3: Activar políticas RLS restrictivas
-- Ejecutar DESPUÉS de migrar todos los datos
-- ============================================

-- Eliminar políticas antiguas (single-user)
DROP POLICY IF EXISTS "Allow all for anon" ON exercises;
DROP POLICY IF EXISTS "Allow all for anon" ON exercise_muscles;
DROP POLICY IF EXISTS "Allow all for anon" ON routines;
DROP POLICY IF EXISTS "Allow all for anon" ON routine_days;
DROP POLICY IF EXISTS "Allow all for anon" ON routine_blocks;
DROP POLICY IF EXISTS "Allow all for anon" ON routine_exercises;
DROP POLICY IF EXISTS "Allow all for anon" ON workout_sessions;
DROP POLICY IF EXISTS "Allow all for anon" ON completed_sets;

-- Eliminar políticas nuevas si existen (para idempotencia)
DROP POLICY IF EXISTS "Users can view own exercises" ON exercises;
DROP POLICY IF EXISTS "Users can create own exercises" ON exercises;
DROP POLICY IF EXISTS "Users can update own exercises" ON exercises;
DROP POLICY IF EXISTS "Users can delete own exercises" ON exercises;
DROP POLICY IF EXISTS "Users can view exercise muscles for own exercises" ON exercise_muscles;
DROP POLICY IF EXISTS "Users can manage exercise muscles for own exercises" ON exercise_muscles;
DROP POLICY IF EXISTS "Users can update exercise muscles for own exercises" ON exercise_muscles;
DROP POLICY IF EXISTS "Users can delete exercise muscles for own exercises" ON exercise_muscles;
DROP POLICY IF EXISTS "Users can view own routines" ON routines;
DROP POLICY IF EXISTS "Users can create own routines" ON routines;
DROP POLICY IF EXISTS "Users can update own routines" ON routines;
DROP POLICY IF EXISTS "Users can delete own routines" ON routines;
DROP POLICY IF EXISTS "Users can view routine days for own routines" ON routine_days;
DROP POLICY IF EXISTS "Users can manage routine days for own routines" ON routine_days;
DROP POLICY IF EXISTS "Users can update routine days for own routines" ON routine_days;
DROP POLICY IF EXISTS "Users can delete routine days for own routines" ON routine_days;
DROP POLICY IF EXISTS "Users can view routine blocks for own routines" ON routine_blocks;
DROP POLICY IF EXISTS "Users can manage routine blocks for own routines" ON routine_blocks;
DROP POLICY IF EXISTS "Users can update routine blocks for own routines" ON routine_blocks;
DROP POLICY IF EXISTS "Users can delete routine blocks for own routines" ON routine_blocks;
DROP POLICY IF EXISTS "Users can view routine exercises for own routines" ON routine_exercises;
DROP POLICY IF EXISTS "Users can manage routine exercises for own routines" ON routine_exercises;
DROP POLICY IF EXISTS "Users can update routine exercises for own routines" ON routine_exercises;
DROP POLICY IF EXISTS "Users can delete routine exercises for own routines" ON routine_exercises;
DROP POLICY IF EXISTS "Users can view own sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Users can view completed sets for own sessions" ON completed_sets;
DROP POLICY IF EXISTS "Users can manage completed sets for own sessions" ON completed_sets;
DROP POLICY IF EXISTS "Users can update completed sets for own sessions" ON completed_sets;
DROP POLICY IF EXISTS "Users can delete completed sets for own sessions" ON completed_sets;

-- ============================================
-- EXERCISES
-- ============================================
CREATE POLICY "Users can view own exercises"
    ON exercises FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exercises"
    ON exercises FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises"
    ON exercises FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises"
    ON exercises FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- EXERCISE_MUSCLES (hereda de exercises)
-- ============================================
CREATE POLICY "Users can view exercise muscles for own exercises"
    ON exercise_muscles FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM exercises WHERE exercises.id = exercise_muscles.exercise_id AND exercises.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage exercise muscles for own exercises"
    ON exercise_muscles FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM exercises WHERE exercises.id = exercise_muscles.exercise_id AND exercises.user_id = auth.uid()
    ));

CREATE POLICY "Users can update exercise muscles for own exercises"
    ON exercise_muscles FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM exercises WHERE exercises.id = exercise_muscles.exercise_id AND exercises.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete exercise muscles for own exercises"
    ON exercise_muscles FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM exercises WHERE exercises.id = exercise_muscles.exercise_id AND exercises.user_id = auth.uid()
    ));

-- ============================================
-- ROUTINES
-- ============================================
CREATE POLICY "Users can view own routines"
    ON routines FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own routines"
    ON routines FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines"
    ON routines FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own routines"
    ON routines FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- ROUTINE_DAYS (hereda de routines)
-- ============================================
CREATE POLICY "Users can view routine days for own routines"
    ON routine_days FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM routines WHERE routines.id = routine_days.routine_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage routine days for own routines"
    ON routine_days FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM routines WHERE routines.id = routine_days.routine_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can update routine days for own routines"
    ON routine_days FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM routines WHERE routines.id = routine_days.routine_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete routine days for own routines"
    ON routine_days FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM routines WHERE routines.id = routine_days.routine_id AND routines.user_id = auth.uid()
    ));

-- ============================================
-- ROUTINE_BLOCKS (hereda de routine_days → routines)
-- ============================================
CREATE POLICY "Users can view routine blocks for own routines"
    ON routine_blocks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM routine_days
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_days.id = routine_blocks.routine_day_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage routine blocks for own routines"
    ON routine_blocks FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM routine_days
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_days.id = routine_blocks.routine_day_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can update routine blocks for own routines"
    ON routine_blocks FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM routine_days
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_days.id = routine_blocks.routine_day_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete routine blocks for own routines"
    ON routine_blocks FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM routine_days
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_days.id = routine_blocks.routine_day_id AND routines.user_id = auth.uid()
    ));

-- ============================================
-- ROUTINE_EXERCISES (hereda de routine_blocks → routine_days → routines)
-- ============================================
CREATE POLICY "Users can view routine exercises for own routines"
    ON routine_exercises FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM routine_blocks
        JOIN routine_days ON routine_days.id = routine_blocks.routine_day_id
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_blocks.id = routine_exercises.routine_block_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage routine exercises for own routines"
    ON routine_exercises FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM routine_blocks
        JOIN routine_days ON routine_days.id = routine_blocks.routine_day_id
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_blocks.id = routine_exercises.routine_block_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can update routine exercises for own routines"
    ON routine_exercises FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM routine_blocks
        JOIN routine_days ON routine_days.id = routine_blocks.routine_day_id
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_blocks.id = routine_exercises.routine_block_id AND routines.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete routine exercises for own routines"
    ON routine_exercises FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM routine_blocks
        JOIN routine_days ON routine_days.id = routine_blocks.routine_day_id
        JOIN routines ON routines.id = routine_days.routine_id
        WHERE routine_blocks.id = routine_exercises.routine_block_id AND routines.user_id = auth.uid()
    ));

-- ============================================
-- WORKOUT_SESSIONS
-- ============================================
CREATE POLICY "Users can view own sessions"
    ON workout_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
    ON workout_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON workout_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON workout_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- COMPLETED_SETS (hereda de workout_sessions)
-- ============================================
CREATE POLICY "Users can view completed sets for own sessions"
    ON completed_sets FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = completed_sets.session_id AND workout_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage completed sets for own sessions"
    ON completed_sets FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = completed_sets.session_id AND workout_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can update completed sets for own sessions"
    ON completed_sets FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = completed_sets.session_id AND workout_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete completed sets for own sessions"
    ON completed_sets FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM workout_sessions WHERE workout_sessions.id = completed_sets.session_id AND workout_sessions.user_id = auth.uid()
    ));
