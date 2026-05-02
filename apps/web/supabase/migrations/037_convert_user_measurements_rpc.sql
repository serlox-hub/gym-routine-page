-- ============================================
-- MIGRACIÓN: RPC para convertir medidas corporales del usuario al cambiar de unidad
-- Multiplica los valores almacenados por un factor (cm↔in) y actualiza
-- la columna unit únicamente en los registros que estuvieran en la unidad antigua.
-- ============================================

CREATE OR REPLACE FUNCTION convert_user_measurements(
    p_factor NUMERIC,    -- factor multiplicativo (cm→in = 0.39370079, in→cm = 2.54)
    p_old_unit TEXT      -- 'cm' o 'in'
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_new_unit TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_old_unit NOT IN ('cm', 'in') THEN
        RAISE EXCEPTION 'Invalid p_old_unit: %. Must be ''cm'' or ''in''.', p_old_unit;
    END IF;

    v_new_unit := CASE WHEN p_old_unit = 'cm' THEN 'in' ELSE 'cm' END;

    UPDATE body_measurements
    SET
        value = ROUND(value * p_factor, 2),
        unit = v_new_unit
    WHERE user_id = v_user_id
      AND unit = p_old_unit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION convert_user_measurements(NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION convert_user_measurements(NUMERIC, TEXT) TO authenticated;
