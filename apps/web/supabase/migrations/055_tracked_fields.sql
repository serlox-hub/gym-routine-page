-- Métricas por ejercicio: `exercises.tracked_fields` sustituye a `measurement_type`.
--
-- El enum `measurement_type` era una lista cerrada de 12 combinaciones escritas a mano, todas de
-- 1 o 2 métricas: un producto cartesiano PARCIAL. Un ejercicio con tres métricas reales (bici
-- estática = nivel + distancia + tiempo) no tenía representación, y cada caso nuevo obligaba a
-- ampliar el enum. Ahora el ejercicio declara qué campos mide y la app deriva de ahí columnas,
-- validación, formato, stats y PRs. Ver docs/DECISIONS.md.
--
-- `completed_sets` ya tenía columna independiente para los 7 campos, así que no se toca.
-- OJO: `body_measurements.measurement_type` es TEXT y de otro dominio (medidas corporales).
-- Lo de aquí es el enum de ejercicios, no aquel.
--
-- ⚠️ ORDEN DE DESPLIEGUE OBLIGATORIO: aplicar esta migración y desplegar web + native A LA VEZ.
-- Borra `measurement_type` en el mismo paso que añade `tracked_fields` (corte duro, elegido a
-- propósito para no arrastrar escritura dual). No hay force-update en la app y la web es una PWA
-- con service worker, así que un cliente con el bundle anterior seleccionará `measurement_type` y
-- fallará con 42703 (catálogo, rutinas y sesión rotos) hasta que recargue.

CREATE TYPE "public"."measurement_field" AS ENUM (
    'weight',
    'reps',
    'time',
    'distance',
    'calories',
    'level',
    'pace'
);

ALTER TABLE "public"."exercises"
    ADD COLUMN IF NOT EXISTS "tracked_fields" "public"."measurement_field"[]
    NOT NULL DEFAULT '{weight,reps}'::"public"."measurement_field"[];

COMMENT ON COLUMN "public"."exercises"."tracked_fields" IS
    'Campos que se registran en cada serie. La app los normaliza al leerlos (orden canónico), así que el orden guardado aquí es irrelevante.';

-- Backfill desde los 12 tipos históricos. NULL cae al default (peso × reps), igual que hacía el
-- fallback de lectura de la app.
UPDATE "public"."exercises" SET "tracked_fields" = (CASE "measurement_type"
    WHEN 'weight_reps'     THEN '{weight,reps}'
    WHEN 'reps_only'       THEN '{reps}'
    WHEN 'time'            THEN '{time}'
    WHEN 'weight_time'     THEN '{weight,time}'
    WHEN 'distance'        THEN '{distance}'
    WHEN 'weight_distance' THEN '{weight,distance}'
    WHEN 'calories'        THEN '{calories}'
    WHEN 'level_time'      THEN '{level,time}'
    WHEN 'level_distance'  THEN '{level,distance}'
    WHEN 'level_calories'  THEN '{level,calories}'
    WHEN 'distance_time'   THEN '{distance,time}'
    WHEN 'distance_pace'   THEN '{distance,pace}'
    ELSE '{weight,reps}'
END)::"public"."measurement_field"[];

-- El tope de 3 es de LAYOUT, no de modelo: la fila de serie es un grid de ancho fijo y con 4
-- columnas de valor los inputs bajan de ~28px a 360px de pantalla, donde el valor deja de leerse.
-- La aritmética completa vive en MAX_TRACKED_FIELDS (lib/measurementFields.js).
ALTER TABLE "public"."exercises" DROP CONSTRAINT IF EXISTS "exercises_tracked_fields_len";
ALTER TABLE "public"."exercises"
    ADD CONSTRAINT "exercises_tracked_fields_len"
    CHECK ("array_length"("tracked_fields", 1) BETWEEN 1 AND 3);

-- `routine_exercises.measurement_type` nació en la 001 como override opcional y ningún camino de
-- escritura la rellenó nunca: columna muerta (issue #22).
ALTER TABLE "public"."routine_exercises" DROP COLUMN IF EXISTS "measurement_type";
ALTER TABLE "public"."exercises" DROP COLUMN IF EXISTS "measurement_type";
DROP TYPE IF EXISTS "public"."measurement_type";
