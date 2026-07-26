-- ============================================
-- MIGRACIÓN: Unidad de peso por (ejercicio, gimnasio)
-- Antes la unidad se resolvía por ejercicio (user_exercise_overrides.weight_unit)
-- o global. Pero la MISMA máquina puede estar en lb en un gym y en kg en otro
-- (p. ej. remo con placas en lb vs discos en kg). Como los stats YA están
-- segregados por gimnasio (migración 044), la unidad pasa a vivir en
-- (usuario, ejercicio, gym): cada serie (ejercicio, gym) queda internamente
-- coherente sin necesidad de normalizar a una unidad canónica.
-- Resolución en runtime: unidad(ejercicio,gym) > preferencia global > 'kg'.
--
-- notes sigue en user_exercise_overrides (es por ejercicio, agnóstico al gym).
-- Solo se separa la unidad para no fragmentar las notas por gimnasio.
-- ============================================

-- ============================================
-- TABLA user_exercise_gym_units
-- ============================================
CREATE TABLE user_exercise_gym_units (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    gym_id BIGINT NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    weight_unit TEXT NOT NULL CHECK (weight_unit IN ('kg', 'lb')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, exercise_id, gym_id)
);

-- RLS
ALTER TABLE user_exercise_gym_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uegu_select" ON user_exercise_gym_units FOR SELECT
    USING (user_id = auth.uid());
CREATE POLICY "uegu_insert" ON user_exercise_gym_units FOR INSERT
    WITH CHECK (user_id = auth.uid());
CREATE POLICY "uegu_update" ON user_exercise_gym_units FOR UPDATE
    USING (user_id = auth.uid());
CREATE POLICY "uegu_delete" ON user_exercise_gym_units FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- BACKFILL: overrides por-ejercicio actuales → (ejercicio, gym por defecto)
-- Todo el histórico está en el gym por defecto (backfill de la 044), así que
-- mapear la unidad por-ejercicio al default gym preserva el display actual.
-- ============================================
-- Garantiza un gym por defecto para usuarios con override de unidad pero sin gym.
-- La 044 solo creó gyms para usuarios con SESIONES; un override de unidad puede
-- existir sin ninguna sesión (se fija desde la ficha del ejercicio). Sin esto, el
-- JOIN de abajo no daría fila y esa unidad se perdería justo antes del DROP COLUMN.
INSERT INTO gyms (user_id, is_default)
SELECT DISTINCT ueo.user_id, TRUE
FROM user_exercise_overrides ueo
WHERE ueo.weight_unit IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM gyms g WHERE g.user_id = ueo.user_id AND g.is_default);

INSERT INTO user_exercise_gym_units (user_id, exercise_id, gym_id, weight_unit)
SELECT ueo.user_id, ueo.exercise_id, g.id, ueo.weight_unit
FROM user_exercise_overrides ueo
JOIN gyms g ON g.user_id = ueo.user_id AND g.is_default
WHERE ueo.weight_unit IS NOT NULL
ON CONFLICT DO NOTHING;

-- La unidad ya no vive en user_exercise_overrides (esa tabla queda solo para notas)
ALTER TABLE user_exercise_overrides DROP COLUMN weight_unit;

-- ============================================
-- RPC convert_user_weights: la conversión por ejercicio pasa a ser por (ejercicio, gym)
--   - scope 'exercise' requiere p_gym_id y restringe completed_sets/stats a ese gym.
--   - scope 'global' excluye los (ejercicio, gym) con unidad explícita en la tabla
--     nueva (antes la exclusión era por ejercicio, mirando user_exercise_overrides).
-- Firma nueva (añade p_gym_id) => DROP + CREATE.
-- ============================================
DROP FUNCTION IF EXISTS convert_user_weights(TEXT, NUMERIC, INT, TEXT);

CREATE OR REPLACE FUNCTION convert_user_weights(
    p_scope TEXT,                       -- 'global' o 'exercise'
    p_factor NUMERIC,                   -- factor multiplicativo (kg→lb = 2.20462262, lb→kg = 0.45359237)
    p_exercise_id INT DEFAULT NULL,     -- requerido si p_scope = 'exercise'
    p_old_unit TEXT DEFAULT NULL,       -- conservado por compatibilidad de firma, ignorado (ver 038)
    p_gym_id BIGINT DEFAULT NULL        -- requerido si p_scope = 'exercise'
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_scope NOT IN ('global', 'exercise') THEN
        RAISE EXCEPTION 'Invalid scope: %. Must be ''global'' or ''exercise''.', p_scope;
    END IF;

    IF p_scope = 'exercise' AND p_exercise_id IS NULL THEN
        RAISE EXCEPTION 'p_exercise_id is required for scope=exercise';
    END IF;

    IF p_scope = 'exercise' AND p_gym_id IS NULL THEN
        RAISE EXCEPTION 'p_gym_id is required for scope=exercise';
    END IF;

    -- ============================================
    -- 1. COMPLETED_SETS
    -- ============================================
    IF p_scope = 'exercise' THEN
        UPDATE completed_sets cs
        SET weight = ROUND(weight * p_factor, 2)
        FROM session_exercises se, workout_sessions ws
        WHERE cs.session_exercise_id = se.id
          AND cs.session_id = ws.id
          AND ws.user_id = v_user_id
          AND se.exercise_id = p_exercise_id
          AND ws.gym_id = p_gym_id
          AND cs.weight IS NOT NULL;
    ELSE
        -- scope = global: excluye los (ejercicio, gym) con unidad explícita propia
        UPDATE completed_sets cs
        SET weight = ROUND(weight * p_factor, 2)
        FROM session_exercises se, workout_sessions ws
        WHERE cs.session_exercise_id = se.id
          AND cs.session_id = ws.id
          AND ws.user_id = v_user_id
          AND cs.weight IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM user_exercise_gym_units u
              WHERE u.user_id = v_user_id
                AND u.exercise_id = se.exercise_id
                AND u.gym_id = ws.gym_id
          );
    END IF;

    -- ============================================
    -- 2. EXERCISE_SESSION_STATS (best_weight, best_1rm, total_volume)
    -- Todos los sets del scope se multiplican por la misma constante => los flags
    -- is_pr_* no cambian (se preserva el ranking); solo cambian los valores.
    -- ============================================
    IF p_scope = 'exercise' THEN
        UPDATE exercise_session_stats ess
        SET
            best_weight  = CASE WHEN best_weight  IS NOT NULL THEN ROUND(best_weight  * p_factor, 2) END,
            best_1rm     = CASE WHEN best_1rm     IS NOT NULL THEN ROUND(best_1rm     * p_factor, 2) END,
            total_volume = CASE WHEN total_volume IS NOT NULL THEN ROUND(total_volume * p_factor, 2) END
        WHERE ess.user_id = v_user_id
          AND ess.exercise_id = p_exercise_id
          AND ess.gym_id = p_gym_id;
    ELSE
        UPDATE exercise_session_stats ess
        SET
            best_weight  = CASE WHEN best_weight  IS NOT NULL THEN ROUND(best_weight  * p_factor, 2) END,
            best_1rm     = CASE WHEN best_1rm     IS NOT NULL THEN ROUND(best_1rm     * p_factor, 2) END,
            total_volume = CASE WHEN total_volume IS NOT NULL THEN ROUND(total_volume * p_factor, 2) END
        WHERE ess.user_id = v_user_id
          AND NOT EXISTS (
              SELECT 1 FROM user_exercise_gym_units u
              WHERE u.user_id = v_user_id
                AND u.exercise_id = ess.exercise_id
                AND u.gym_id = ess.gym_id
          );
    END IF;

    -- ============================================
    -- 3. BODY_WEIGHT_RECORDS (solo en scope=global)
    -- body_weight_records.weight_unit se eliminó en la 038: solo se multiplica el
    -- peso (p_old_unit se conserva en la firma por compatibilidad pero se ignora).
    -- ============================================
    IF p_scope = 'global' THEN
        UPDATE body_weight_records
        SET weight = ROUND(weight * p_factor, 2)
        WHERE user_id = v_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir a usuarios autenticados invocar la función
REVOKE ALL ON FUNCTION convert_user_weights(TEXT, NUMERIC, INT, TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION convert_user_weights(TEXT, NUMERIC, INT, TEXT, BIGINT) TO authenticated;
