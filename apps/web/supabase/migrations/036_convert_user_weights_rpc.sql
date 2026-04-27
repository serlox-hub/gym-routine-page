-- ============================================
-- MIGRACIÓN: RPC para convertir pesos del usuario al cambiar de unidad
-- Multiplica los pesos almacenados por un factor (kg↔lb) y mantiene
-- los stats agregados consistentes. Excluye ejercicios con override
-- propio cuando el cambio es global.
-- ============================================

CREATE OR REPLACE FUNCTION convert_user_weights(
    p_scope TEXT,                       -- 'global' o 'exercise'
    p_factor NUMERIC,                   -- factor multiplicativo (kg→lb = 2.20462262, lb→kg = 0.45359237)
    p_exercise_id INT DEFAULT NULL,     -- requerido si p_scope = 'exercise'
    p_old_unit TEXT DEFAULT NULL        -- requerido si p_scope = 'global' para body_weight_records
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_new_unit TEXT;
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
          AND cs.weight IS NOT NULL;
    ELSE
        -- scope = global: excluye ejercicios con override de unidad propio
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

    -- ============================================
    -- 2. EXERCISE_SESSION_STATS (best_weight, best_1rm, total_volume)
    -- Como todos los sets se multiplican por la misma constante, los flags
    -- is_pr_* no cambian (el ranking se preserva) — solo los valores numéricos.
    -- ============================================
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

    -- ============================================
    -- 3. BODY_WEIGHT_RECORDS (solo en scope=global)
    -- Convierte únicamente los registros que están en la unidad antigua,
    -- preservando los que ya tuvieran la unidad nueva.
    -- ============================================
    IF p_scope = 'global' AND p_old_unit IS NOT NULL THEN
        IF p_old_unit NOT IN ('kg', 'lb') THEN
            RAISE EXCEPTION 'Invalid p_old_unit: %. Must be ''kg'' or ''lb''.', p_old_unit;
        END IF;

        v_new_unit := CASE WHEN p_old_unit = 'kg' THEN 'lb' ELSE 'kg' END;

        UPDATE body_weight_records bwr
        SET
            weight = ROUND(weight * p_factor, 2),
            weight_unit = v_new_unit::weight_unit
        WHERE bwr.user_id = v_user_id
          AND bwr.weight_unit::text = p_old_unit;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir a usuarios autenticados invocar la función
REVOKE ALL ON FUNCTION convert_user_weights(TEXT, NUMERIC, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION convert_user_weights(TEXT, NUMERIC, INT, TEXT) TO authenticated;
