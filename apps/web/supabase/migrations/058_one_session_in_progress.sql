-- Una sola sesión `in_progress` por usuario, garantizada por la BD.
-- Rationale, medición del bug y gotchas en `docs/DECISIONS.md` (issue #30).

-- 1. Resolver los duplicados que ya existan. Se queda la que TIENE SERIES, no la más
--    reciente: el duplicado nace de un toque accidental justo después de entrar, así que la
--    espuria es precisamente la última creada y la vieja es la que lleva el entrenamiento
--    real. Quedarse con la reciente conservaría la basura y dejaría el trabajo del usuario
--    inalcanzable (el historial solo muestra `completed`). Desempate: la más reciente.
--    No se borra nada: las perdedoras pasan a `abandoned`, que ya es invisible en la UI,
--    y sus series siguen en la BD por si hay que rescatarlas a mano.
WITH ranked AS (
  SELECT ws.id,
         row_number() OVER (
           PARTITION BY ws.user_id
           ORDER BY (SELECT count(*) FROM completed_sets cs WHERE cs.session_id = ws.id) DESC,
                    ws.started_at DESC,
                    ws.id DESC
         ) AS rn
  FROM workout_sessions ws
  WHERE ws.status = 'in_progress' AND ws.user_id IS NOT NULL
)
UPDATE workout_sessions ws
SET status = 'abandoned',
    completed_at = COALESCE(ws.completed_at, now())
FROM ranked
WHERE ws.id = ranked.id AND ranked.rn > 1;

-- 2. El invariante. Índice PARCIAL: solo restringe las que están en curso, así que un usuario
--    puede acumular todas las `completed`/`abandoned` que quiera.
CREATE UNIQUE INDEX IF NOT EXISTS workout_sessions_one_in_progress_per_user
  ON workout_sessions (user_id)
  WHERE status = 'in_progress';

-- 3. Que el error sea legible en vez de un 23505 con el nombre del índice.
--    La comprobación previa cubre el caso normal; el EXCEPTION cubre la carrera real (dos
--    peticiones simultáneas), donde el índice es lo único que decide. Ambas ramas levantan el
--    mismo token `session_already_in_progress`, que es el contrato que mira el cliente.
CREATE OR REPLACE FUNCTION "public"."start_workout_session"("p_routine_day_id" integer DEFAULT NULL::integer, "p_routine_name" "text" DEFAULT NULL::"text", "p_day_name" "text" DEFAULT NULL::"text", "p_exercises" "jsonb" DEFAULT '[]'::"jsonb", "p_gym_id" bigint DEFAULT NULL::bigint) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_session workout_sessions%ROWTYPE;
BEGIN
  -- Sin usuario no se escribe nada. Verificado antes de este guard: con solo la anon key el
  -- RPC devolvía 200 e insertaba una fila con `user_id NULL`, y el índice único no las limita
  -- (en un índice los NULL son distintos entre sí), o sea basura escribible sin autenticar.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM workout_sessions
    WHERE user_id = auth.uid() AND status = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'session_already_in_progress' USING ERRCODE = 'P0001';
  END IF;

  BEGIN
    INSERT INTO workout_sessions (routine_day_id, routine_name, day_name, status, user_id, gym_id)
    VALUES (p_routine_day_id, p_routine_name, p_day_name, 'in_progress', auth.uid(), p_gym_id)
    RETURNING * INTO v_session;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'session_already_in_progress' USING ERRCODE = 'P0001';
  END;

  IF jsonb_array_length(p_exercises) > 0 THEN
    INSERT INTO session_exercises (
      session_id, exercise_id, routine_exercise_id, sort_order,
      series, target_field, reps, level, rir, rest_seconds, notes,
      superset_group, is_extra, is_warmup
    )
    SELECT
      v_session.id,
      (item->>'exercise_id')::INT,
      (item->>'routine_exercise_id')::INT,
      (item->>'sort_order')::INT,
      (item->>'series')::INT,
      (item->>'target_field')::measurement_field,
      (item->>'reps')::TEXT,
      (item->>'level')::SMALLINT,
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
