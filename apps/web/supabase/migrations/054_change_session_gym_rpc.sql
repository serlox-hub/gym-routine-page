-- ============================================
-- RPC change_session_gym: cambia el gimnasio de una sesión EN CURSO y, en la MISMA
-- transacción, aplica los pesos ya convertidos de sus series completadas.
--
-- Contexto: la unidad de peso se resuelve por (ejercicio, gym). Al mover una sesión a
-- un gym con distinta unidad para alguno de sus ejercicios, los pesos ya registrados
-- deben convertirse para preservar el peso real levantado. El cliente calcula los pesos
-- nuevos (tiene las unidades cacheadas) y los pasa aquí; esta función solo persiste,
-- de forma atómica: o cambian el gym Y los pesos, o no cambia nada.
--
-- p_weights: [{ "session_exercise_id": int, "set_number": int, "weight": numeric }, ...]
--   (vacío para un cambio de gym sin conversión). Identifica cada serie por el triple
--   (session_id, session_exercise_id, set_number), el mismo con el que upsertCompletedSet
--   hace onConflict (a nivel BD no hay constraint UNIQUE; solo índices no únicos + PK en id).
-- ============================================
CREATE OR REPLACE FUNCTION change_session_gym(
    p_session_id UUID,
    p_gym_id BIGINT,
    p_weights JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_owner UUID;
    w JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verificar que la sesión pertenece al usuario (la función es SECURITY DEFINER)
    SELECT user_id INTO v_owner FROM workout_sessions WHERE id = p_session_id;
    IF v_owner IS NULL OR v_owner <> v_user_id THEN
        RAISE EXCEPTION 'Session not found or not owned by user';
    END IF;

    -- Verificar que el gym destino (si no es NULL) es del usuario: la función bypassa RLS,
    -- así que valida TODAS sus entradas de identidad, no solo la sesión.
    IF p_gym_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM gyms WHERE id = p_gym_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Gym not found or not owned by user';
    END IF;

    -- 1. Cambiar el gym de la sesión
    UPDATE workout_sessions SET gym_id = p_gym_id WHERE id = p_session_id;

    -- 2. Aplicar los pesos ya convertidos (acotado a la sesión ya validada)
    FOR w IN SELECT * FROM jsonb_array_elements(p_weights)
    LOOP
        UPDATE completed_sets
        SET weight = (w->>'weight')::numeric
        WHERE session_id = p_session_id
          AND session_exercise_id = (w->>'session_exercise_id')::int
          AND set_number = (w->>'set_number')::smallint;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION change_session_gym(UUID, BIGINT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION change_session_gym(UUID, BIGINT, JSONB) TO authenticated;
