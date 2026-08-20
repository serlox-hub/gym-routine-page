


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."measurement_field" AS ENUM (
    'weight',
    'reps',
    'time',
    'distance',
    'calories',
    'level',
    'pace'
);


ALTER TYPE "public"."measurement_field" OWNER TO "postgres";


CREATE TYPE "public"."session_status" AS ENUM (
    'in_progress',
    'completed',
    'abandoned'
);


ALTER TYPE "public"."session_status" OWNER TO "postgres";


CREATE TYPE "public"."weight_unit" AS ENUM (
    'kg',
    'lb'
);


ALTER TYPE "public"."weight_unit" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."change_session_gym"("p_session_id" "uuid", "p_gym_id" bigint, "p_weights" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."change_session_gym"("p_session_id" "uuid", "p_gym_id" bigint, "p_weights" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_user_measurements"("p_factor" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."convert_user_measurements"("p_factor" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_user_weights"("p_scope" "text", "p_factor" numeric, "p_exercise_id" integer DEFAULT NULL::integer, "p_old_unit" "text" DEFAULT NULL::"text", "p_gym_id" bigint DEFAULT NULL::bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."convert_user_weights"("p_scope" "text", "p_factor" numeric, "p_exercise_id" integer, "p_old_unit" "text", "p_gym_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_set_routine_exercise_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT r.user_id INTO NEW.user_id
    FROM routine_days rd
    JOIN routines r ON r.id = rd.routine_id
    WHERE rd.id = NEW.routine_day_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_set_routine_exercise_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_routine_exercise_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.routine_day_id IS DISTINCT FROM OLD.routine_day_id THEN
    SELECT r.user_id INTO NEW.user_id
    FROM routine_days rd
    JOIN routines r ON r.id = rd.routine_id
    WHERE rd.id = NEW.routine_day_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_sync_routine_exercise_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_feedback"() RETURNS TABLE("id" bigint, "user_id" "uuid", "user_email" "text", "type" "text", "message" "text", "app_version" "text", "platform" "text", "created_at" timestamp with time zone, "resolved_at" timestamp with time zone, "resolved_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    RETURN QUERY
    SELECT
        f.id,
        f.user_id,
        u.email::TEXT AS user_email,
        f.type,
        f.message,
        f.app_version,
        f.platform,
        f.created_at,
        f.resolved_at,
        f.resolved_by
    FROM user_feedback f
    LEFT JOIN auth.users u ON u.id = f.user_id
    ORDER BY
        (f.resolved_at IS NOT NULL) ASC,  -- pendientes primero
        f.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_all_feedback"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_users"() RETURNS TABLE("id" "uuid", "email" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Verificar que el usuario es admin
    IF NOT EXISTS (
        SELECT 1 FROM user_settings
        WHERE user_id = auth.uid()
        AND key = 'is_admin'
        AND value = 'true'
    ) THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    RETURN QUERY
    SELECT u.id, u.email::TEXT, u.created_at
    FROM auth.users u
    ORDER BY u.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_all_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("check_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_settings
        WHERE user_id = check_user_id
        AND key = 'is_admin'
        AND value = 'true'
    );
$$;


ALTER FUNCTION "public"."is_admin"("check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_exercise_prs"("p_exercise_id" integer, "p_after_date" timestamp with time zone, "p_gym_id" bigint DEFAULT NULL::bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."recalculate_exercise_prs"("p_exercise_id" integer, "p_after_date" timestamp with time zone, "p_gym_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_routine_days"("day_orders" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verificar que el usuario tiene acceso a estos días
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(day_orders) AS item
    WHERE NOT EXISTS (
      SELECT 1 FROM routine_days rd
      JOIN routines r ON r.id = rd.routine_id
      WHERE rd.id = (item->>'id')::int
        AND r.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado a uno o más días';
  END IF;

  -- Actualizar todos los sort_order en una sola operación
  UPDATE routine_days rd
  SET sort_order = (item->>'sort_order')::int
  FROM jsonb_array_elements(day_orders) AS item
  WHERE rd.id = (item->>'id')::int;
END;
$$;


ALTER FUNCTION "public"."reorder_routine_days"("day_orders" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reorder_routine_days"("day_orders" "jsonb") IS 'Reordena días de rutina en batch. Recibe JSONB array de {id, sort_order}';



CREATE OR REPLACE FUNCTION "public"."reorder_routine_exercises"("exercise_orders" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(exercise_orders) AS item
    WHERE NOT EXISTS (
      SELECT 1 FROM routine_exercises re
      JOIN routine_days rd ON rd.id = re.routine_day_id
      JOIN routines r ON r.id = rd.routine_id
      WHERE re.id = (item->>'id')::int
        AND r.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado a uno o más ejercicios';
  END IF;

  UPDATE routine_exercises re
  SET sort_order = (item->>'sort_order')::int
  FROM jsonb_array_elements(exercise_orders) AS item
  WHERE re.id = (item->>'id')::int;
END;
$$;


ALTER FUNCTION "public"."reorder_routine_exercises"("exercise_orders" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reorder_routine_exercises"("exercise_orders" "jsonb") IS 'Reordena ejercicios de rutina en batch. Recibe JSONB array de {id, sort_order}';



CREATE OR REPLACE FUNCTION "public"."reorder_session_exercises"("exercise_orders" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verificar que el usuario tiene acceso a estos ejercicios de sesión
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(exercise_orders) AS item
    WHERE NOT EXISTS (
      SELECT 1 FROM session_exercises se
      JOIN workout_sessions ws ON ws.id = se.session_id
      WHERE se.id = (item->>'id')::int
        AND ws.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado a uno o más ejercicios de sesión';
  END IF;

  -- Paso 1: Poner valores negativos temporales para liberar los slots
  UPDATE session_exercises se
  SET sort_order = -(item->>'sort_order')::int
  FROM jsonb_array_elements(exercise_orders) AS item
  WHERE se.id = (item->>'id')::int;

  -- Paso 2: Asignar los valores finales positivos
  UPDATE session_exercises se
  SET sort_order = (item->>'sort_order')::int
  FROM jsonb_array_elements(exercise_orders) AS item
  WHERE se.id = (item->>'id')::int;
END;
$$;


ALTER FUNCTION "public"."reorder_session_exercises"("exercise_orders" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reorder_session_exercises"("exercise_orders" "jsonb") IS 'Reordena ejercicios de sesión en batch. Recibe JSONB array de {id, sort_order}';



CREATE OR REPLACE FUNCTION "public"."set_routine_block_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT r.user_id INTO NEW.user_id
    FROM routine_days rd
    JOIN routines r ON r.id = rd.routine_id
    WHERE rd.id = NEW.routine_day_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_routine_block_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_workout_session"("p_routine_day_id" integer DEFAULT NULL::integer, "p_routine_name" "text" DEFAULT NULL::"text", "p_day_name" "text" DEFAULT NULL::"text", "p_exercises" "jsonb" DEFAULT '[]'::"jsonb", "p_gym_id" bigint DEFAULT NULL::bigint) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."start_workout_session"("p_routine_day_id" integer, "p_routine_name" "text", "p_day_name" "text", "p_exercises" "jsonb", "p_gym_id" bigint) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."body_measurements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "measurement_type" "text" NOT NULL,
    "value" numeric(6,2) NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "body_measurements_value_check" CHECK (("value" > (0)::numeric))
);


ALTER TABLE "public"."body_measurements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."body_weight_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "weight" numeric(5,2) NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "body_weight_records_weight_check" CHECK (("weight" > (0)::numeric))
);


ALTER TABLE "public"."body_weight_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."completed_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "session_exercise_id" integer NOT NULL,
    "set_number" smallint NOT NULL,
    "weight" numeric(6,2),
    "reps_completed" smallint,
    "time_seconds" integer,
    "distance_meters" numeric(6,2),
    "calories_burned" integer,
    "rir_actual" smallint,
    "completed" boolean DEFAULT false,
    "notes" "text",
    "performed_at" timestamp with time zone DEFAULT "now"(),
    "video_url" "text",
    "level" smallint,
    "pace_seconds" integer,
    "set_type" "text" DEFAULT 'normal'::"text"
);


ALTER TABLE "public"."completed_sets" OWNER TO "postgres";


COMMENT ON COLUMN "public"."completed_sets"."calories_burned" IS 'Calorías quemadas (tipos CALORIES / LEVEL_CALORIES)';



COMMENT ON COLUMN "public"."completed_sets"."video_url" IS 'Key del video en MinIO (opcional)';



COMMENT ON COLUMN "public"."completed_sets"."level" IS 'Nivel/resistencia de la máquina (tipos LEVEL_*)';



CREATE TABLE IF NOT EXISTS "public"."equipment_types" (
    "id" integer NOT NULL,
    "key" "text" NOT NULL,
    "name_es" "text" NOT NULL,
    "name_en" "text" NOT NULL
);


ALTER TABLE "public"."equipment_types" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."equipment_types_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."equipment_types_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."equipment_types_id_seq" OWNED BY "public"."equipment_types"."id";



CREATE TABLE IF NOT EXISTS "public"."exercise_secondary_muscles" (
    "exercise_id" integer NOT NULL,
    "muscle_group_id" integer NOT NULL
);


ALTER TABLE "public"."exercise_secondary_muscles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercise_session_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "exercise_id" integer NOT NULL,
    "session_id" "uuid" NOT NULL,
    "session_date" timestamp with time zone NOT NULL,
    "best_weight" numeric,
    "best_reps" smallint,
    "best_1rm" numeric,
    "total_volume" numeric,
    "total_sets" smallint DEFAULT 0 NOT NULL,
    "best_time_seconds" integer,
    "best_distance_meters" numeric,
    "best_pace_seconds" integer,
    "is_pr_weight" boolean DEFAULT false NOT NULL,
    "is_pr_reps" boolean DEFAULT false NOT NULL,
    "is_pr_1rm" boolean DEFAULT false NOT NULL,
    "is_pr_volume" boolean DEFAULT false NOT NULL,
    "is_pr_time" boolean DEFAULT false NOT NULL,
    "is_pr_distance" boolean DEFAULT false NOT NULL,
    "is_pr_pace" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "best_per_reps" "jsonb",
    "pr_rep_counts" smallint[],
    "gym_id" bigint
);


ALTER TABLE "public"."exercise_session_stats" OWNER TO "postgres";


COMMENT ON COLUMN "public"."exercise_session_stats"."best_per_reps" IS 'Mejor peso de esta sesión por número exacto de reps. Ej: {"1": 120, "5": 100}. NULL si no aplica (no weight_reps o sesión sin sets válidos).';



COMMENT ON COLUMN "public"."exercise_session_stats"."pr_rep_counts" IS 'Rep counts de esta sesión que superaron el récord histórico previo. NULL si no hubo rep-PRs.';



CREATE TABLE IF NOT EXISTS "public"."exercises" (
    "id" integer NOT NULL,
    "name_es" "text" NOT NULL,
    "muscle_group_id" integer,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "name_en" "text",
    "is_system" boolean DEFAULT false NOT NULL,
    "instructions" "jsonb",
    "equipment_type_id" integer,
    "gif_key" "text",
    "tracked_fields" "public"."measurement_field"[] DEFAULT '{weight,reps}'::"public"."measurement_field"[] NOT NULL,
    CONSTRAINT "exercises_tracked_fields_len" CHECK ((("array_length"("tracked_fields", 1) >= 1) AND ("array_length"("tracked_fields", 1) <= 3)))
);


ALTER TABLE "public"."exercises" OWNER TO "postgres";


COMMENT ON COLUMN "public"."exercises"."muscle_group_id" IS 'Grupo muscular principal del ejercicio';



COMMENT ON COLUMN "public"."exercises"."gif_key" IS 'Id de producto Gym Visual. URL pública: <storage>/exercise-gifs/gif/<gif_key>_<360|720>.gif';



COMMENT ON COLUMN "public"."exercises"."tracked_fields" IS 'Campos que se registran en cada serie. La app los normaliza al leerlos (orden canónico), así que el orden guardado aquí es irrelevante.';



CREATE SEQUENCE IF NOT EXISTS "public"."exercises_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."exercises_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exercises_id_seq" OWNED BY "public"."exercises"."id";



CREATE TABLE IF NOT EXISTS "public"."gyms" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text",
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gyms" OWNER TO "postgres";


ALTER TABLE "public"."gyms" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."gyms_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."muscle_groups" (
    "id" integer NOT NULL,
    "name_es" "text" NOT NULL,
    "category" "text",
    "name_en" "text"
);


ALTER TABLE "public"."muscle_groups" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."muscle_groups_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."muscle_groups_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."muscle_groups_id_seq" OWNED BY "public"."muscle_groups"."id";



CREATE TABLE IF NOT EXISTS "public"."routine_days" (
    "id" integer NOT NULL,
    "routine_id" integer,
    "name" "text" NOT NULL,
    "estimated_duration_min" integer,
    "sort_order" smallint
);


ALTER TABLE "public"."routine_days" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."routine_days_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."routine_days_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."routine_days_id_seq" OWNED BY "public"."routine_days"."id";



CREATE TABLE IF NOT EXISTS "public"."routine_exercises" (
    "id" integer NOT NULL,
    "exercise_id" integer NOT NULL,
    "sort_order" smallint NOT NULL,
    "series" smallint NOT NULL,
    "reps" "text" NOT NULL,
    "rir" smallint,
    "rest_seconds" integer,
    "notes" "text",
    "superset_group" integer,
    "user_id" "uuid" NOT NULL,
    "routine_day_id" integer NOT NULL,
    "is_warmup" boolean DEFAULT false,
    "target_field" "public"."measurement_field",
    "level" smallint,
    CONSTRAINT "routine_exercises_level_non_negative" CHECK ((("level" IS NULL) OR ("level" >= 0))),
    CONSTRAINT "routine_exercises_target_field_prescribable" CHECK ((("target_field" IS NULL) OR ("target_field" = ANY (ARRAY['reps'::"public"."measurement_field", 'time'::"public"."measurement_field", 'distance'::"public"."measurement_field", 'calories'::"public"."measurement_field"]))))
);


ALTER TABLE "public"."routine_exercises" OWNER TO "postgres";


COMMENT ON COLUMN "public"."routine_exercises"."superset_group" IS 'Agrupa ejercicios en supersets. NULL = individual, mismo número = mismo superset';



COMMENT ON COLUMN "public"."routine_exercises"."target_field" IS 'Campo del que habla el objetivo guardado en `reps` ("8-12" reps, "20min" de tiempo, "5km"). NULL = el ejercicio no mide nada prescribible y el objetivo es texto libre sin campo.';



COMMENT ON COLUMN "public"."routine_exercises"."level" IS 'Nivel de la máquina prescrito por la rutina. No es un resultado: es un ajuste que se pone antes de empezar, y es el progresable del cardio (juega el papel del peso).';



CREATE SEQUENCE IF NOT EXISTS "public"."routine_exercises_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."routine_exercises_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."routine_exercises_id_seq" OWNED BY "public"."routine_exercises"."id";



CREATE TABLE IF NOT EXISTS "public"."routines" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_favorite" boolean DEFAULT false,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."routines" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."routines_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."routines_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."routines_id_seq" OWNED BY "public"."routines"."id";



CREATE TABLE IF NOT EXISTS "public"."session_exercises" (
    "id" integer NOT NULL,
    "session_id" "uuid",
    "exercise_id" integer NOT NULL,
    "routine_exercise_id" integer,
    "sort_order" smallint NOT NULL,
    "series" smallint NOT NULL,
    "reps" "text" NOT NULL,
    "rir" smallint,
    "rest_seconds" integer,
    "notes" "text",
    "superset_group" integer,
    "is_extra" boolean DEFAULT false,
    "is_warmup" boolean DEFAULT false,
    "target_field" "public"."measurement_field",
    "level" smallint,
    CONSTRAINT "session_exercises_level_non_negative" CHECK ((("level" IS NULL) OR ("level" >= 0))),
    CONSTRAINT "session_exercises_target_field_prescribable" CHECK ((("target_field" IS NULL) OR ("target_field" = ANY (ARRAY['reps'::"public"."measurement_field", 'time'::"public"."measurement_field", 'distance'::"public"."measurement_field", 'calories'::"public"."measurement_field"]))))
);


ALTER TABLE "public"."session_exercises" OWNER TO "postgres";


COMMENT ON TABLE "public"."session_exercises" IS 'Snapshot de ejercicios realizados en cada sesión. Independiente de cambios en routine_exercises.';



COMMENT ON COLUMN "public"."session_exercises"."routine_exercise_id" IS 'Referencia al ejercicio original de la rutina. NULL si fue añadido como extra.';



COMMENT ON COLUMN "public"."session_exercises"."is_extra" IS 'TRUE si el ejercicio fue añadido durante la sesión, no venía de la rutina.';



COMMENT ON COLUMN "public"."session_exercises"."target_field" IS 'Snapshot de routine_exercises.target_field al iniciar la sesión.';



COMMENT ON COLUMN "public"."session_exercises"."level" IS 'Snapshot de routine_exercises.level al iniciar la sesión.';



CREATE SEQUENCE IF NOT EXISTS "public"."session_exercises_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."session_exercises_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."session_exercises_id_seq" OWNED BY "public"."session_exercises"."id";



CREATE TABLE IF NOT EXISTS "public"."user_exercise_gym_units" (
    "user_id" "uuid" NOT NULL,
    "exercise_id" integer NOT NULL,
    "gym_id" bigint NOT NULL,
    "weight_unit" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_exercise_gym_units_weight_unit_check" CHECK (("weight_unit" = ANY (ARRAY['kg'::"text", 'lb'::"text"])))
);


ALTER TABLE "public"."user_exercise_gym_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_exercise_overrides" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "exercise_id" integer NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_exercise_overrides" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_exercise_overrides_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_exercise_overrides_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_exercise_overrides_id_seq" OWNED BY "public"."user_exercise_overrides"."id";



CREATE TABLE IF NOT EXISTS "public"."user_feedback" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "app_version" "text",
    "platform" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    CONSTRAINT "user_feedback_message_check" CHECK ((("char_length"("message") <= 4000) AND ("length"("btrim"("message")) > 0))),
    CONSTRAINT "user_feedback_platform_check" CHECK (("platform" = ANY (ARRAY['web'::"text", 'native'::"text"]))),
    CONSTRAINT "user_feedback_type_check" CHECK (("type" = ANY (ARRAY['bug'::"text", 'suggestion'::"text"])))
);


ALTER TABLE "public"."user_feedback" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_feedback" IS 'Reportes de bugs y sugerencias enviados por los usuarios';



COMMENT ON COLUMN "public"."user_feedback"."resolved_at" IS 'Timestamp en el que un admin marcó el reporte como resuelto. NULL = pendiente.';



COMMENT ON COLUMN "public"."user_feedback"."resolved_by" IS 'Admin que marcó el reporte como resuelto.';



CREATE SEQUENCE IF NOT EXISTS "public"."user_feedback_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_feedback_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_feedback_id_seq" OWNED BY "public"."user_feedback"."id";



CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_preferences_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_preferences_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_preferences_id_seq" OWNED BY "public"."user_preferences"."id";



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "user_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_settings" IS 'Configuraciones y permisos de usuario en formato clave-valor';



CREATE TABLE IF NOT EXISTS "public"."workout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_day_id" integer,
    "user_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "duration_minutes" smallint,
    "status" "public"."session_status" DEFAULT 'in_progress'::"public"."session_status",
    "notes" "text",
    "overall_feeling" smallint,
    "routine_name" "text",
    "day_name" "text",
    "gym_id" bigint,
    CONSTRAINT "workout_sessions_overall_feeling_check" CHECK ((("overall_feeling" >= 1) AND ("overall_feeling" <= 5)))
);


ALTER TABLE "public"."workout_sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."equipment_types" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."equipment_types_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."exercises" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exercises_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."muscle_groups" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."muscle_groups_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."routine_days" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."routine_days_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."routine_exercises" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."routine_exercises_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."routines" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."routines_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."session_exercises" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."session_exercises_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_exercise_overrides" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_exercise_overrides_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_feedback" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_feedback_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_preferences" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_preferences_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."body_measurements"
    ADD CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."body_weight_records"
    ADD CONSTRAINT "body_weight_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."completed_sets"
    ADD CONSTRAINT "completed_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_types"
    ADD CONSTRAINT "equipment_types_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."equipment_types"
    ADD CONSTRAINT "equipment_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercise_secondary_muscles"
    ADD CONSTRAINT "exercise_secondary_muscles_pkey" PRIMARY KEY ("exercise_id", "muscle_group_id");



ALTER TABLE ONLY "public"."exercise_session_stats"
    ADD CONSTRAINT "exercise_session_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercise_session_stats"
    ADD CONSTRAINT "exercise_session_stats_session_id_exercise_id_key" UNIQUE ("session_id", "exercise_id");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gyms"
    ADD CONSTRAINT "gyms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muscle_groups"
    ADD CONSTRAINT "muscle_groups_name_key" UNIQUE ("name_es");



ALTER TABLE ONLY "public"."muscle_groups"
    ADD CONSTRAINT "muscle_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routine_days"
    ADD CONSTRAINT "routine_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routine_exercises"
    ADD CONSTRAINT "routine_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routines"
    ADD CONSTRAINT "routines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_exercises"
    ADD CONSTRAINT "session_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_exercises"
    ADD CONSTRAINT "session_exercises_session_id_sort_order_key" UNIQUE ("session_id", "sort_order");



ALTER TABLE ONLY "public"."completed_sets"
    ADD CONSTRAINT "unique_set_per_session_exercise" UNIQUE ("session_id", "session_exercise_id", "set_number");



ALTER TABLE ONLY "public"."user_exercise_gym_units"
    ADD CONSTRAINT "user_exercise_gym_units_pkey" PRIMARY KEY ("user_id", "exercise_id", "gym_id");



ALTER TABLE ONLY "public"."user_exercise_overrides"
    ADD CONSTRAINT "user_exercise_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_exercise_overrides"
    ADD CONSTRAINT "user_exercise_overrides_user_id_exercise_id_key" UNIQUE ("user_id", "exercise_id");



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key_key" UNIQUE ("user_id", "key");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id", "key");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_body_measurements_user_type_date" ON "public"."body_measurements" USING "btree" ("user_id", "measurement_type", "recorded_at" DESC);



CREATE INDEX "idx_body_weight_user_date" ON "public"."body_weight_records" USING "btree" ("user_id", "recorded_at" DESC);



CREATE INDEX "idx_completed_sets_session" ON "public"."completed_sets" USING "btree" ("session_id");



CREATE INDEX "idx_completed_sets_session_exercise" ON "public"."completed_sets" USING "btree" ("session_exercise_id");



CREATE INDEX "idx_ess_exercise_date" ON "public"."exercise_session_stats" USING "btree" ("exercise_id", "session_date" DESC);



CREATE INDEX "idx_ess_gym_exercise_date" ON "public"."exercise_session_stats" USING "btree" ("gym_id", "exercise_id", "session_date" DESC);



CREATE INDEX "idx_ess_pr_rep_counts" ON "public"."exercise_session_stats" USING "gin" ("pr_rep_counts") WHERE ("pr_rep_counts" IS NOT NULL);



CREATE INDEX "idx_ess_session" ON "public"."exercise_session_stats" USING "btree" ("session_id");



CREATE INDEX "idx_ess_user_exercise" ON "public"."exercise_session_stats" USING "btree" ("user_id", "exercise_id");



CREATE INDEX "idx_ess_user_prs" ON "public"."exercise_session_stats" USING "btree" ("user_id", "session_date" DESC) WHERE ("is_pr_weight" OR "is_pr_reps" OR "is_pr_1rm" OR "is_pr_volume" OR "is_pr_time" OR "is_pr_distance" OR "is_pr_pace");



CREATE INDEX "idx_exercise_secondary_muscles_exercise" ON "public"."exercise_secondary_muscles" USING "btree" ("exercise_id");



CREATE INDEX "idx_exercise_secondary_muscles_muscle" ON "public"."exercise_secondary_muscles" USING "btree" ("muscle_group_id");



CREATE INDEX "idx_exercises_equipment_type" ON "public"."exercises" USING "btree" ("equipment_type_id");



CREATE INDEX "idx_exercises_gif_key" ON "public"."exercises" USING "btree" ("gif_key") WHERE ("gif_key" IS NOT NULL);



CREATE INDEX "idx_exercises_muscle_group" ON "public"."exercises" USING "btree" ("muscle_group_id");



CREATE INDEX "idx_exercises_system" ON "public"."exercises" USING "btree" ("is_system") WHERE ("is_system" = true);



CREATE INDEX "idx_exercises_user" ON "public"."exercises" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_gyms_one_default" ON "public"."gyms" USING "btree" ("user_id") WHERE "is_default";



CREATE INDEX "idx_gyms_user" ON "public"."gyms" USING "btree" ("user_id");



CREATE INDEX "idx_routine_days_routine" ON "public"."routine_days" USING "btree" ("routine_id");



CREATE INDEX "idx_routine_exercises_day" ON "public"."routine_exercises" USING "btree" ("routine_day_id");



CREATE INDEX "idx_routine_exercises_day_superset" ON "public"."routine_exercises" USING "btree" ("routine_day_id", "superset_group");



CREATE INDEX "idx_routine_exercises_exercise" ON "public"."routine_exercises" USING "btree" ("exercise_id");



CREATE INDEX "idx_routine_exercises_user" ON "public"."routine_exercises" USING "btree" ("user_id");



CREATE INDEX "idx_routines_user" ON "public"."routines" USING "btree" ("user_id");



CREATE INDEX "idx_session_exercises_exercise" ON "public"."session_exercises" USING "btree" ("exercise_id");



CREATE INDEX "idx_session_exercises_session" ON "public"."session_exercises" USING "btree" ("session_id");



CREATE INDEX "idx_sessions_date" ON "public"."workout_sessions" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_sessions_routine_day" ON "public"."workout_sessions" USING "btree" ("routine_day_id", "started_at" DESC);



CREATE INDEX "idx_user_feedback_created_at" ON "public"."user_feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_feedback_pending" ON "public"."user_feedback" USING "btree" ("created_at" DESC) WHERE ("resolved_at" IS NULL);



CREATE INDEX "idx_user_feedback_user_id" ON "public"."user_feedback" USING "btree" ("user_id");



CREATE INDEX "idx_user_preferences_user_key" ON "public"."user_preferences" USING "btree" ("user_id", "key");



CREATE INDEX "idx_user_settings_key" ON "public"."user_settings" USING "btree" ("key");



CREATE INDEX "idx_user_settings_user_id" ON "public"."user_settings" USING "btree" ("user_id");



CREATE INDEX "idx_workout_sessions_user" ON "public"."workout_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_workout_sessions_user_date" ON "public"."workout_sessions" USING "btree" ("user_id", "started_at" DESC);



CREATE INDEX "idx_workout_sessions_user_status" ON "public"."workout_sessions" USING "btree" ("user_id", "status");



CREATE INDEX "idx_ws_gym" ON "public"."workout_sessions" USING "btree" ("gym_id");



CREATE OR REPLACE TRIGGER "trg_routine_exercises_set_user_id" BEFORE INSERT ON "public"."routine_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_routine_exercise_user_id"();



CREATE OR REPLACE TRIGGER "trg_routine_exercises_sync_user_id" BEFORE UPDATE ON "public"."routine_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_routine_exercise_user_id"();



ALTER TABLE ONLY "public"."body_measurements"
    ADD CONSTRAINT "body_measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."body_weight_records"
    ADD CONSTRAINT "body_weight_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."completed_sets"
    ADD CONSTRAINT "completed_sets_session_exercise_id_fkey" FOREIGN KEY ("session_exercise_id") REFERENCES "public"."session_exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."completed_sets"
    ADD CONSTRAINT "completed_sets_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_secondary_muscles"
    ADD CONSTRAINT "exercise_secondary_muscles_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_secondary_muscles"
    ADD CONSTRAINT "exercise_secondary_muscles_muscle_group_id_fkey" FOREIGN KEY ("muscle_group_id") REFERENCES "public"."muscle_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_session_stats"
    ADD CONSTRAINT "exercise_session_stats_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_session_stats"
    ADD CONSTRAINT "exercise_session_stats_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."exercise_session_stats"
    ADD CONSTRAINT "exercise_session_stats_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_session_stats"
    ADD CONSTRAINT "exercise_session_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_equipment_type_id_fkey" FOREIGN KEY ("equipment_type_id") REFERENCES "public"."equipment_types"("id");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_muscle_group_id_fkey" FOREIGN KEY ("muscle_group_id") REFERENCES "public"."muscle_groups"("id");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routine_exercises"
    ADD CONSTRAINT "fk_routine_exercises_day" FOREIGN KEY ("routine_day_id") REFERENCES "public"."routine_days"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gyms"
    ADD CONSTRAINT "gyms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routine_days"
    ADD CONSTRAINT "routine_days_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routine_exercises"
    ADD CONSTRAINT "routine_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id");



ALTER TABLE ONLY "public"."routine_exercises"
    ADD CONSTRAINT "routine_exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."routines"
    ADD CONSTRAINT "routines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_exercises"
    ADD CONSTRAINT "session_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id");



ALTER TABLE ONLY "public"."session_exercises"
    ADD CONSTRAINT "session_exercises_routine_exercise_id_fkey" FOREIGN KEY ("routine_exercise_id") REFERENCES "public"."routine_exercises"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_exercises"
    ADD CONSTRAINT "session_exercises_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_exercise_gym_units"
    ADD CONSTRAINT "user_exercise_gym_units_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_exercise_gym_units"
    ADD CONSTRAINT "user_exercise_gym_units_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_exercise_gym_units"
    ADD CONSTRAINT "user_exercise_gym_units_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_exercise_overrides"
    ADD CONSTRAINT "user_exercise_overrides_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_exercise_overrides"
    ADD CONSTRAINT "user_exercise_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_routine_day_id_fkey" FOREIGN KEY ("routine_day_id") REFERENCES "public"."routine_days"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete feedback" ON "public"."user_feedback" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage all settings" ON "public"."user_settings" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can read all feedback" ON "public"."user_feedback" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can update feedback" ON "public"."user_feedback" FOR UPDATE USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Allow read for all" ON "public"."equipment_types" FOR SELECT USING (true);



CREATE POLICY "Allow read for all" ON "public"."exercise_secondary_muscles" FOR SELECT USING (true);



CREATE POLICY "Allow read for all" ON "public"."muscle_groups" FOR SELECT USING (true);



CREATE POLICY "Users can create own body measurements" ON "public"."body_measurements" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own body weight records" ON "public"."body_weight_records" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own exercises" ON "public"."exercises" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own routines" ON "public"."routines" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own sessions" ON "public"."workout_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete completed sets for own sessions" ON "public"."completed_sets" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions"
  WHERE (("workout_sessions"."id" = "completed_sets"."session_id") AND ("workout_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own body measurements" ON "public"."body_measurements" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own body weight records" ON "public"."body_weight_records" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own exercises" ON "public"."exercises" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("is_system" = false)));



CREATE POLICY "Users can delete own overrides" ON "public"."user_exercise_overrides" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own preferences" ON "public"."user_preferences" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own routines" ON "public"."routines" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own sessions" ON "public"."workout_sessions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete routine days for own routines" ON "public"."routine_days" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."routines"
  WHERE (("routines"."id" = "routine_days"."routine_id") AND ("routines"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete session exercises for own sessions" ON "public"."session_exercises" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions"
  WHERE (("workout_sessions"."id" = "session_exercises"."session_id") AND ("workout_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own feedback" ON "public"."user_feedback" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own overrides" ON "public"."user_exercise_overrides" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage completed sets for own sessions" ON "public"."completed_sets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions"
  WHERE (("workout_sessions"."id" = "completed_sets"."session_id") AND ("workout_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage routine days for own routines" ON "public"."routine_days" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."routines"
  WHERE (("routines"."id" = "routine_days"."routine_id") AND ("routines"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage session exercises for own sessions" ON "public"."session_exercises" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions"
  WHERE (("workout_sessions"."id" = "session_exercises"."session_id") AND ("workout_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can read own overrides" ON "public"."user_exercise_overrides" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own preferences" ON "public"."user_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own settings" ON "public"."user_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update completed sets for own sessions" ON "public"."completed_sets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions"
  WHERE (("workout_sessions"."id" = "completed_sets"."session_id") AND ("workout_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own body measurements" ON "public"."body_measurements" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own body weight records" ON "public"."body_weight_records" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own exercises" ON "public"."exercises" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("is_system" = false)));



CREATE POLICY "Users can update own overrides" ON "public"."user_exercise_overrides" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own routines" ON "public"."routines" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own sessions" ON "public"."workout_sessions" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update routine days for own routines" ON "public"."routine_days" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."routines"
  WHERE (("routines"."id" = "routine_days"."routine_id") AND ("routines"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update session exercises for own sessions" ON "public"."session_exercises" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions"
  WHERE (("workout_sessions"."id" = "session_exercises"."session_id") AND ("workout_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view completed sets for own sessions" ON "public"."completed_sets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions"
  WHERE (("workout_sessions"."id" = "completed_sets"."session_id") AND ("workout_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own and system exercises" ON "public"."exercises" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("is_system" = true)));



CREATE POLICY "Users can view own body measurements" ON "public"."body_measurements" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own body weight records" ON "public"."body_weight_records" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own routines" ON "public"."routines" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own sessions" ON "public"."workout_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view routine days for own routines" ON "public"."routine_days" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."routines"
  WHERE (("routines"."id" = "routine_days"."routine_id") AND ("routines"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view session exercises for own sessions" ON "public"."session_exercises" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions"
  WHERE (("workout_sessions"."id" = "session_exercises"."session_id") AND ("workout_sessions"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."body_measurements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."body_weight_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."completed_sets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipment_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ess_delete" ON "public"."exercise_session_stats" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "ess_insert" ON "public"."exercise_session_stats" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "ess_select" ON "public"."exercise_session_stats" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "ess_update" ON "public"."exercise_session_stats" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."exercise_secondary_muscles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercise_session_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gyms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gyms_delete" ON "public"."gyms" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "gyms_insert" ON "public"."gyms" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "gyms_select" ON "public"."gyms" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "gyms_update" ON "public"."gyms" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."muscle_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."routine_days" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."routine_exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "routine_exercises_delete" ON "public"."routine_exercises" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "routine_exercises_insert" ON "public"."routine_exercises" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "routine_exercises_select" ON "public"."routine_exercises" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "routine_exercises_update" ON "public"."routine_exercises" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."routines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "uegu_delete" ON "public"."user_exercise_gym_units" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "uegu_insert" ON "public"."user_exercise_gym_units" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "uegu_select" ON "public"."user_exercise_gym_units" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "uegu_update" ON "public"."user_exercise_gym_units" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_exercise_gym_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_exercise_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_sessions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."change_session_gym"("p_session_id" "uuid", "p_gym_id" bigint, "p_weights" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."change_session_gym"("p_session_id" "uuid", "p_gym_id" bigint, "p_weights" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."convert_user_measurements"("p_factor" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."convert_user_measurements"("p_factor" numeric) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."convert_user_weights"("p_scope" "text", "p_factor" numeric, "p_exercise_id" integer, "p_old_unit" "text", "p_gym_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."convert_user_weights"("p_scope" "text", "p_factor" numeric, "p_exercise_id" integer, "p_old_unit" "text", "p_gym_id" bigint) TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."body_measurements" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."body_measurements" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."body_measurements" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."body_weight_records" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."body_weight_records" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."body_weight_records" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."completed_sets" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."completed_sets" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."completed_sets" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."equipment_types" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."equipment_types" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."equipment_types" TO "service_role";



GRANT UPDATE ON SEQUENCE "public"."equipment_types_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."equipment_types_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."equipment_types_id_seq" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exercise_secondary_muscles" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exercise_secondary_muscles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exercise_secondary_muscles" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exercise_session_stats" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exercise_session_stats" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exercise_session_stats" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exercises" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exercises" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exercises" TO "service_role";



GRANT UPDATE ON SEQUENCE "public"."exercises_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."exercises_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."exercises_id_seq" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."gyms" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."gyms" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."gyms" TO "service_role";



GRANT UPDATE ON SEQUENCE "public"."gyms_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."gyms_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."gyms_id_seq" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."muscle_groups" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."muscle_groups" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."muscle_groups" TO "service_role";



GRANT UPDATE ON SEQUENCE "public"."muscle_groups_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."muscle_groups_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."muscle_groups_id_seq" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routine_days" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routine_days" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routine_days" TO "service_role";



GRANT UPDATE ON SEQUENCE "public"."routine_days_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."routine_days_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."routine_days_id_seq" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routine_exercises" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routine_exercises" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routine_exercises" TO "service_role";



GRANT UPDATE ON SEQUENCE "public"."routine_exercises_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."routine_exercises_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."routine_exercises_id_seq" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routines" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routines" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routines" TO "service_role";



GRANT UPDATE ON SEQUENCE "public"."routines_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."routines_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."routines_id_seq" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."session_exercises" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."session_exercises" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."session_exercises" TO "service_role";



GRANT UPDATE ON SEQUENCE "public"."session_exercises_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."session_exercises_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."session_exercises_id_seq" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_exercise_gym_units" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_exercise_gym_units" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_exercise_gym_units" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_exercise_overrides" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_exercise_overrides" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_exercise_overrides" TO "service_role";



GRANT UPDATE ON SEQUENCE "public"."user_exercise_overrides_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."user_exercise_overrides_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."user_exercise_overrides_id_seq" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_feedback" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_feedback" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_feedback" TO "service_role";



GRANT UPDATE ON SEQUENCE "public"."user_feedback_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."user_feedback_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."user_feedback_id_seq" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_preferences" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_preferences" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_preferences" TO "service_role";



GRANT UPDATE ON SEQUENCE "public"."user_preferences_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."user_preferences_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."user_preferences_id_seq" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_settings" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_settings" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_settings" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."workout_sessions" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."workout_sessions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."workout_sessions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";







