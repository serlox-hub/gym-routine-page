-- ============================================
-- MIGRACIÓN: Eliminar columnas de unidad por registro
-- La unidad de peso/medida se resuelve siempre en runtime desde
-- user_preferences.{weight_unit, measurement_unit}, igual que ya
-- ocurre con completed_sets.weight. Una sola fuente de verdad.
-- ============================================

ALTER TABLE body_weight_records DROP COLUMN IF EXISTS weight_unit;
ALTER TABLE body_measurements DROP COLUMN IF EXISTS unit;

-- ============================================
-- Reescribir RPC convert_user_measurements
-- Sin filtrado por p_old_unit (la columna ya no existe).
-- Multiplica todos los body_measurements del usuario por el factor.
-- ============================================

DROP FUNCTION IF EXISTS convert_user_measurements(NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION convert_user_measurements(
    p_factor NUMERIC
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE body_measurements
    SET value = ROUND(value * p_factor, 2)
    WHERE user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION convert_user_measurements(NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION convert_user_measurements(NUMERIC) TO authenticated;

-- ============================================
-- Reescribir RPC convert_user_weights
-- Idéntico al anterior excepto que body_weight_records ya no actualiza
-- weight_unit (la columna se eliminó); solo multiplica weight.
-- ============================================

CREATE OR REPLACE FUNCTION convert_user_weights(
    p_scope TEXT,
    p_factor NUMERIC,
    p_exercise_id INT DEFAULT NULL,
    p_old_unit TEXT DEFAULT NULL  -- conservado por compatibilidad de signatura, ignorado
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

    -- COMPLETED_SETS
    IF p_scope = 'exercise' THEN
        UPDATE completed_sets cs
        SET weight = ROUND(weight * p_factor, 2)
        FROM session_exercises se, workout_sessions ws
        WHERE cs.session_exercise_id = se.id
          AND cs.session_id = ws.id
          AND ws.user_id = v_user_id
          AND se.exercise_id = p_exercise_id
          AND cs.weight IS NOT NULL;
    ELSE
        UPDATE completed_sets cs
        SET weight = ROUND(weight * p_factor, 2)
        FROM session_exercises se, workout_sessions ws
        WHERE cs.session_exercise_id = se.id
          AND cs.session_id = ws.id
          AND ws.user_id = v_user_id
          AND cs.weight IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM user_exercise_overrides ueo
              WHERE ueo.user_id = v_user_id
                AND ueo.exercise_id = se.exercise_id
                AND ueo.weight_unit IS NOT NULL
          );
    END IF;

    -- EXERCISE_SESSION_STATS
    IF p_scope = 'exercise' THEN
        UPDATE exercise_session_stats ess
        SET
            best_weight  = CASE WHEN best_weight  IS NOT NULL THEN ROUND(best_weight  * p_factor, 2) END,
            best_1rm     = CASE WHEN best_1rm     IS NOT NULL THEN ROUND(best_1rm     * p_factor, 2) END,
            total_volume = CASE WHEN total_volume IS NOT NULL THEN ROUND(total_volume * p_factor, 2) END
        WHERE ess.user_id = v_user_id
          AND ess.exercise_id = p_exercise_id;
    ELSE
        UPDATE exercise_session_stats ess
        SET
            best_weight  = CASE WHEN best_weight  IS NOT NULL THEN ROUND(best_weight  * p_factor, 2) END,
            best_1rm     = CASE WHEN best_1rm     IS NOT NULL THEN ROUND(best_1rm     * p_factor, 2) END,
            total_volume = CASE WHEN total_volume IS NOT NULL THEN ROUND(total_volume * p_factor, 2) END
        WHERE ess.user_id = v_user_id
          AND NOT EXISTS (
              SELECT 1 FROM user_exercise_overrides ueo
              WHERE ueo.user_id = v_user_id
                AND ueo.exercise_id = ess.exercise_id
                AND ueo.weight_unit IS NOT NULL
          );
    END IF;

    -- BODY_WEIGHT_RECORDS (solo en scope=global)
    IF p_scope = 'global' THEN
        UPDATE body_weight_records
        SET weight = ROUND(weight * p_factor, 2)
        WHERE user_id = v_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION convert_user_weights(TEXT, NUMERIC, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION convert_user_weights(TEXT, NUMERIC, INT, TEXT) TO authenticated;
