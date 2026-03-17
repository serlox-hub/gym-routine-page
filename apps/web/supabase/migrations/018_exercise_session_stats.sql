-- ============================================
-- MIGRACIÓN: Tabla exercise_session_stats
-- Objetivo: Stats pre-computados por ejercicio/sesión para PRs y gráficos
-- ============================================

CREATE TABLE exercise_session_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    session_date TIMESTAMPTZ NOT NULL,
    -- Métricas (nullable, se llenan según measurement_type del ejercicio)
    best_weight NUMERIC,
    best_reps SMALLINT,
    best_1rm NUMERIC,
    total_volume NUMERIC,
    total_sets SMALLINT NOT NULL DEFAULT 0,
    best_time_seconds INTEGER,
    best_distance_meters NUMERIC,
    best_pace_seconds INTEGER,
    -- Flags de PR (false si es primera sesión del ejercicio)
    is_pr_weight BOOLEAN NOT NULL DEFAULT FALSE,
    is_pr_reps BOOLEAN NOT NULL DEFAULT FALSE,
    is_pr_1rm BOOLEAN NOT NULL DEFAULT FALSE,
    is_pr_volume BOOLEAN NOT NULL DEFAULT FALSE,
    is_pr_time BOOLEAN NOT NULL DEFAULT FALSE,
    is_pr_distance BOOLEAN NOT NULL DEFAULT FALSE,
    is_pr_pace BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, exercise_id)
);

-- ============================================
-- ÍNDICES
-- ============================================

-- Gráficos de progresión por ejercicio (query principal)
CREATE INDEX idx_ess_exercise_date ON exercise_session_stats(exercise_id, session_date DESC);

-- Stats all-time por usuario y ejercicio
CREATE INDEX idx_ess_user_exercise ON exercise_session_stats(user_id, exercise_id);

-- Buscar stats de una sesión (para badges en historial)
CREATE INDEX idx_ess_session ON exercise_session_stats(session_id);

-- Buscar sesiones con PRs de un usuario
CREATE INDEX idx_ess_user_prs ON exercise_session_stats(user_id, session_date DESC)
    WHERE is_pr_weight OR is_pr_reps OR is_pr_1rm OR is_pr_volume
       OR is_pr_time OR is_pr_distance OR is_pr_pace;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE exercise_session_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ess_select" ON exercise_session_stats FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "ess_insert" ON exercise_session_stats FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "ess_update" ON exercise_session_stats FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "ess_delete" ON exercise_session_stats FOR DELETE
    USING (user_id = auth.uid());
