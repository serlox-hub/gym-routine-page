-- Papeles de los campos: objetivo explícito y nivel prescrito (issue #28).
--
-- Un ejercicio ya declaraba QUÉ mide (`exercises.tracked_fields`, migración 055), pero no qué
-- PAPEL juega cada campo. La rutina solo tenía un objetivo, `routine_exercises.reps` (TEXT, texto
-- libre), y la app adivinaba de qué campo hablaba con una lista de prioridades heredada del enum
-- de 12 tipos (reps > distancia > tiempo). Eso hacía que en una bici de nivel × distancia × tiempo
-- el formulario pidiera distancia cuando lo natural es prescribir el tiempo, y que "20min" no se
-- pudiera anclar a su columna al entrenar porque nadie sabía de qué campo era.
--
-- Ahora el campo objetivo se GUARDA en la fila (`target_field`) y el nivel de la máquina se puede
-- PRESCRIBIR (`level`), que es lo que le faltaba al cardio para progresar: el nivel juega el papel
-- del peso, así que el aviso pasa a ser "sube el nivel". El progresable (peso, o nivel si no mide
-- peso) NO se guarda: es derivado, ver `getProgressableField` en lib/measurementFields.js.
--
-- `reps` se queda con ese nombre a propósito: es el VALOR del objetivo ("8-12", "20min", "5km") y
-- renombrarla tocaría toda la app (store de sesión, API, export/import) sin cambiar nada del
-- modelo. Lo que faltaba era el campo del que habla, no el valor.
--
-- Los PRs de nivel (`best_level` en `exercise_session_stats`) quedan FUERA de esta migración: el
-- nivel se registra y se prescribe, pero no alimenta stats ni récords todavía.
--
-- ORDEN DE DESPLIEGUE: primero la migración, después las apps. Solo AÑADE columnas nullable, así
-- que un cliente con el bundle anterior sigue funcionando (ignora las columnas nuevas); pero un
-- cliente nuevo contra una BD sin migrar escribe `target_field`/`level` y falla con 42703. No es
-- el corte duro de la 055: aquí no se borra nada.

-- El objetivo solo puede ser uno de los cuatro campos que expresan "cuánto" pide la rutina. El
-- peso y el nivel son el progresable (cómo se hace, no cuánto) y el ritmo sale de dividir
-- distancia entre tiempo, así que no se prescriben. Es la misma lista que TARGET_FIELDS en
-- lib/measurementFields.js. NULL = ejercicio que no mide ninguno de los cuatro (p. ej. solo peso):
-- el objetivo sigue siendo texto libre, pero sin campo al que anclarlo.
ALTER TABLE "public"."routine_exercises"
    ADD COLUMN IF NOT EXISTS "target_field" "public"."measurement_field",
    ADD COLUMN IF NOT EXISTS "level" smallint;

ALTER TABLE "public"."session_exercises"
    ADD COLUMN IF NOT EXISTS "target_field" "public"."measurement_field",
    ADD COLUMN IF NOT EXISTS "level" smallint;

ALTER TABLE "public"."routine_exercises" DROP CONSTRAINT IF EXISTS "routine_exercises_target_field_prescribable";
ALTER TABLE "public"."routine_exercises"
    ADD CONSTRAINT "routine_exercises_target_field_prescribable"
    CHECK ("target_field" IS NULL OR "target_field" IN ('reps', 'time', 'distance', 'calories'));

ALTER TABLE "public"."session_exercises" DROP CONSTRAINT IF EXISTS "session_exercises_target_field_prescribable";
ALTER TABLE "public"."session_exercises"
    ADD CONSTRAINT "session_exercises_target_field_prescribable"
    CHECK ("target_field" IS NULL OR "target_field" IN ('reps', 'time', 'distance', 'calories'));

ALTER TABLE "public"."routine_exercises" DROP CONSTRAINT IF EXISTS "routine_exercises_level_non_negative";
ALTER TABLE "public"."routine_exercises"
    ADD CONSTRAINT "routine_exercises_level_non_negative" CHECK ("level" IS NULL OR "level" >= 0);

ALTER TABLE "public"."session_exercises" DROP CONSTRAINT IF EXISTS "session_exercises_level_non_negative";
ALTER TABLE "public"."session_exercises"
    ADD CONSTRAINT "session_exercises_level_non_negative" CHECK ("level" IS NULL OR "level" >= 0);

COMMENT ON COLUMN "public"."routine_exercises"."target_field" IS
    'Campo del que habla el objetivo guardado en `reps` ("8-12" reps, "20min" de tiempo, "5km"). NULL = el ejercicio no mide nada prescribible y el objetivo es texto libre sin campo.';

COMMENT ON COLUMN "public"."routine_exercises"."level" IS
    'Nivel de la máquina prescrito por la rutina. No es un resultado: es un ajuste que se pone antes de empezar, y es el progresable del cardio (juega el papel del peso).';

COMMENT ON COLUMN "public"."session_exercises"."target_field" IS
    'Snapshot de routine_exercises.target_field al iniciar la sesión.';

COMMENT ON COLUMN "public"."session_exercises"."level" IS
    'Snapshot de routine_exercises.level al iniciar la sesión.';

-- Backfill: el objetivo pasa a decir explícitamente lo que la app venía ASUMIENDO al leerlo, con
-- la misma lista de prioridades (reps > distancia > tiempo > calorías; ver DEFAULT_TARGET_PRIORITY
-- en lib/measurementFields.js). Un ejercicio que no mide ninguno de los cuatro se queda en NULL.
-- Consecuencia conocida: una bici de nivel × distancia × tiempo queda en "distancia" aunque su
-- dueño prefiriera tiempo. Se cambia a mano en el formulario, no se avisa (ver DECISIONS #28).
UPDATE "public"."routine_exercises" re
SET "target_field" = (CASE
    WHEN 'reps'     = ANY(e."tracked_fields") THEN 'reps'
    WHEN 'distance' = ANY(e."tracked_fields") THEN 'distance'
    WHEN 'time'     = ANY(e."tracked_fields") THEN 'time'
    WHEN 'calories' = ANY(e."tracked_fields") THEN 'calories'
    ELSE NULL
END)::"public"."measurement_field"
FROM "public"."exercises" e
WHERE e."id" = re."exercise_id" AND re."target_field" IS NULL;

UPDATE "public"."session_exercises" se
SET "target_field" = (CASE
    WHEN 'reps'     = ANY(e."tracked_fields") THEN 'reps'
    WHEN 'distance' = ANY(e."tracked_fields") THEN 'distance'
    WHEN 'time'     = ANY(e."tracked_fields") THEN 'time'
    WHEN 'calories' = ANY(e."tracked_fields") THEN 'calories'
    ELSE NULL
END)::"public"."measurement_field"
FROM "public"."exercises" e
WHERE e."id" = se."exercise_id" AND se."target_field" IS NULL;

-- El RPC copia la config de la rutina a la sesión: sin estas dos columnas, una sesión iniciada
-- desde rutina perdería de qué campo es el objetivo y a qué nivel toca entrenar.
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
