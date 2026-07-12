-- ============================================
-- MIGRACIÓN: Gimnasios (gyms) + tracking de progreso por gimnasio
-- Objetivo: cada sesión se asocia a un gimnasio. Los PRs y stats se calculan
-- DENTRO del contexto de cada gym, para que cambiar de gimnasio no genere falsos
-- bajones ni falsos PRs (el peso nominal no es comparable entre gyms distintos).
-- ============================================

-- ============================================
-- TABLA gyms
-- ============================================
CREATE TABLE gyms (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,                                    -- nullable: el gym por defecto usa label i18n
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gyms_user ON gyms(user_id);
-- Como máximo un gym por defecto por usuario
CREATE UNIQUE INDEX idx_gyms_one_default ON gyms(user_id) WHERE is_default;

-- RLS
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gyms_select" ON gyms FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "gyms_insert" ON gyms FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "gyms_update" ON gyms FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "gyms_delete" ON gyms FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- COLUMNAS gym_id (desnormalizado, igual que user_id)
-- ============================================
ALTER TABLE workout_sessions       ADD COLUMN gym_id BIGINT REFERENCES gyms(id) ON DELETE SET NULL;
ALTER TABLE exercise_session_stats ADD COLUMN gym_id BIGINT REFERENCES gyms(id) ON DELETE SET NULL;

CREATE INDEX idx_ws_gym ON workout_sessions(gym_id);
CREATE INDEX idx_ess_gym_exercise_date ON exercise_session_stats(gym_id, exercise_id, session_date DESC);

-- ============================================
-- BACKFILL: 1 gym por defecto por cada usuario con sesiones; asignar histórico
-- ============================================
INSERT INTO gyms (user_id, is_default)
SELECT DISTINCT user_id, TRUE FROM workout_sessions WHERE user_id IS NOT NULL;

UPDATE workout_sessions ws
SET gym_id = g.id
FROM gyms g
WHERE g.user_id = ws.user_id AND g.is_default;

UPDATE exercise_session_stats ess
SET gym_id = g.id
FROM gyms g
WHERE g.user_id = ess.user_id AND g.is_default;

-- ============================================
-- RPC start_workout_session: aceptar p_gym_id
-- (DROP de la versión previa: añadir un parámetro crea una sobrecarga y deja
--  ambiguas las llamadas existentes)
-- ============================================
DROP FUNCTION IF EXISTS start_workout_session(INT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION start_workout_session(
  p_routine_day_id INT DEFAULT NULL,
  p_routine_name TEXT DEFAULT NULL,
  p_day_name TEXT DEFAULT NULL,
  p_exercises JSONB DEFAULT '[]'::JSONB,
  p_gym_id BIGINT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session workout_sessions%ROWTYPE;
BEGIN
  INSERT INTO workout_sessions (routine_day_id, routine_name, day_name, status, user_id, gym_id)
  VALUES (p_routine_day_id, p_routine_name, p_day_name, 'in_progress', auth.uid(), p_gym_id)
  RETURNING * INTO v_session;

  IF jsonb_array_length(p_exercises) > 0 THEN
    INSERT INTO session_exercises (
      session_id, exercise_id, routine_exercise_id, sort_order,
      series, reps, rir, rest_seconds, notes,
      superset_group, is_extra, is_warmup
    )
    SELECT
      v_session.id,
      (item->>'exercise_id')::INT,
      (item->>'routine_exercise_id')::INT,
      (item->>'sort_order')::INT,
      (item->>'series')::INT,
      (item->>'reps')::TEXT,
      (item->>'rir')::INT,
      (item->>'rest_seconds')::INT,
      item->>'notes',
      (item->>'superset_group')::INT,
      COALESCE((item->>'is_extra')::BOOLEAN, false),
      COALESCE((item->>'is_warmup')::BOOLEAN, false)
    FROM jsonb_array_elements(p_exercises) AS item;
  END IF;

  RETURN json_build_object(
    'id', v_session.id,
    'routine_day_id', v_session.routine_day_id,
    'gym_id', v_session.gym_id,
    'status', v_session.status,
    'started_at', v_session.started_at,
    'session_exercises', (
      SELECT COALESCE(json_agg(
        json_build_object('id', se.id, 'exercise_id', se.exercise_id, 'sort_order', se.sort_order)
        ORDER BY se.sort_order
      ), '[]'::JSON)
      FROM session_exercises se
      WHERE se.session_id = v_session.id
    )
  );
END;
$$;

-- ============================================
-- RPC recalculate_exercise_prs: recalcular POR GIMNASIO
-- Cada gym tiene su propia secuencia cronológica de récords, así que todas las
-- ventanas/subconsultas se restringen a (exercise_id, user, gym_id).
-- Se usa `IS NOT DISTINCT FROM` para que un gym_id NULL agrupe consigo mismo.
-- (DROP de la versión previa por el cambio de firma, ver nota arriba)
-- ============================================
DROP FUNCTION IF EXISTS recalculate_exercise_prs(INT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION recalculate_exercise_prs(
    p_exercise_id INT,
    p_after_date TIMESTAMPTZ,
    p_gym_id BIGINT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Reset flags y pr_rep_counts desde la fecha indicada (solo ese gym).
    UPDATE exercise_session_stats
    SET is_pr_weight = FALSE,
        is_pr_reps = FALSE,
        is_pr_1rm = FALSE,
        is_pr_volume = FALSE,
        is_pr_time = FALSE,
        is_pr_distance = FALSE,
        is_pr_pace = FALSE,
        pr_rep_counts = NULL
    WHERE exercise_id = p_exercise_id
      AND user_id = auth.uid()
      AND gym_id IS NOT DISTINCT FROM p_gym_id
      AND session_date >= p_after_date;

    -- PR de peso (heaviest ever, cualquier rep count)
    WITH ranked AS (
        SELECT id, best_weight,
            MAX(best_weight) OVER (ORDER BY session_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id AND best_weight IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_weight = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_weight > r.prev_max
      AND ess.session_date >= p_after_date;

    -- PR de reps
    WITH ranked AS (
        SELECT id, best_reps,
            MAX(best_reps) OVER (ORDER BY session_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id AND best_reps IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_reps = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_reps > r.prev_max
      AND ess.session_date >= p_after_date;

    -- PR de 1RM
    WITH ranked AS (
        SELECT id, best_1rm,
            MAX(best_1rm) OVER (ORDER BY session_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id AND best_1rm IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_1rm = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_1rm > r.prev_max
      AND ess.session_date >= p_after_date;

    -- PR de volumen
    WITH ranked AS (
        SELECT id, total_volume,
            MAX(total_volume) OVER (ORDER BY session_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id AND total_volume IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_volume = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.total_volume > r.prev_max
      AND ess.session_date >= p_after_date;

    -- PR de tiempo
    WITH ranked AS (
        SELECT id, best_time_seconds,
            MAX(best_time_seconds) OVER (ORDER BY session_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id AND best_time_seconds IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_time = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_time_seconds > r.prev_max
      AND ess.session_date >= p_after_date;

    -- PR de distancia
    WITH ranked AS (
        SELECT id, best_distance_meters,
            MAX(best_distance_meters) OVER (ORDER BY session_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max,
            ROW_NUMBER() OVER (ORDER BY session_date) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id AND best_distance_meters IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_distance = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_distance_meters > r.prev_max
      AND ess.session_date >= p_after_date;

    -- PR de pace (menor = mejor)
    WITH ranked AS (
        SELECT id, best_pace_seconds,
            MIN(best_pace_seconds) OVER (ORDER BY session_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_min,
            ROW_NUMBER() OVER (ORDER BY session_date) AS rn
        FROM exercise_session_stats
        WHERE exercise_id = p_exercise_id AND user_id = auth.uid()
          AND gym_id IS NOT DISTINCT FROM p_gym_id AND best_pace_seconds IS NOT NULL
    )
    UPDATE exercise_session_stats ess SET is_pr_pace = TRUE
    FROM ranked r WHERE ess.id = r.id AND r.rn > 1 AND r.best_pace_seconds < r.prev_min
      AND ess.session_date >= p_after_date;

    -- pr_rep_counts (modelo Strong/Hevy CON dominancia), restringido al gym
    WITH unnested AS (
        SELECT
            ess.id AS ess_id,
            ess.session_date,
            (kv.key)::SMALLINT AS rep_count,
            (kv.value)::NUMERIC AS weight
        FROM exercise_session_stats ess,
             LATERAL jsonb_each_text(ess.best_per_reps) kv
        WHERE ess.exercise_id = p_exercise_id
          AND ess.user_id = auth.uid()
          AND ess.gym_id IS NOT DISTINCT FROM p_gym_id
          AND ess.best_per_reps IS NOT NULL
    ),
    enriched AS (
        SELECT
            u.ess_id,
            u.session_date,
            u.rep_count,
            u.weight,
            (SELECT MAX(p.weight) FROM unnested p
              WHERE p.session_date < u.session_date
                AND p.rep_count >= u.rep_count) AS prev_envelope,
            (SELECT MAX(p.weight) FROM unnested p
              WHERE p.ess_id = u.ess_id
                AND p.rep_count > u.rep_count) AS same_session_dom,
            DENSE_RANK() OVER (ORDER BY u.session_date) AS exercise_session_rank
        FROM unnested u
    ),
    prs AS (
        SELECT ess_id, rep_count
        FROM enriched
        WHERE exercise_session_rank > 1
          AND session_date >= p_after_date
          AND weight > GREATEST(COALESCE(prev_envelope, 0), COALESCE(same_session_dom, 0))
    ),
    aggregated AS (
        SELECT ess_id, array_agg(rep_count ORDER BY rep_count) AS pr_rcs
        FROM prs
        GROUP BY ess_id
    )
    UPDATE exercise_session_stats ess
    SET pr_rep_counts = aggregated.pr_rcs
    FROM aggregated
    WHERE ess.id = aggregated.ess_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
