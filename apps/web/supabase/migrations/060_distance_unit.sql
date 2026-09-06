-- ============================================
-- MIGRACIÓN: Unidad de distancia por ejercicio (m/km)
--
-- La distancia se ALMACENA siempre en metros (completed_sets.distance_meters). Esta columna
-- decide solo cómo se PINTA y cómo se TECLEA: un rodaje de 5 km se escribía "5000" bajo una
-- cabecera "M" porque la app nunca tuvo de dónde sacar la unidad (issue #24).
--
-- Por qué en el ejercicio y no en las preferencias del usuario: la escala la fija el ejercicio,
-- no quien lo hace. Un remo se mide en metros (500, 2000) y una cinta en km. Una preferencia
-- global rompería siempre uno de los dos. Y a diferencia de kg/lb, que dependen del rótulo de la
-- máquina de ESE gimnasio (user_exercise_gym_units), m vs km no cambia de un gym a otro: no hay
-- eje de gimnasio aquí.
--
-- Esto revive lo que la migración 024 eliminó ("se deducen del valor en la UI"). Ese argumento
-- era el error: deducir la unidad de la magnitud hace que entrada y display dejen de coincidir
-- (teclas 800 en un campo rotulado "KM"). La unidad se guarda, no se adivina.
-- ============================================

ALTER TABLE exercises
    ADD COLUMN IF NOT EXISTS distance_unit TEXT NOT NULL DEFAULT 'm'
    CHECK (distance_unit IN ('m', 'km'));

COMMENT ON COLUMN exercises.distance_unit IS 'Unidad en la que se muestra y se teclea la distancia de este ejercicio. El almacenamiento sigue siendo siempre en metros.';

-- NULL = hereda la del ejercicio. Vive aquí (por ejercicio) y no en user_exercise_gym_units
-- porque la unidad de distancia no depende del gimnasio. Cambiarla NO convierte datos: los
-- metros guardados no se tocan, solo cambia la lectura.
ALTER TABLE user_exercise_overrides
    ADD COLUMN IF NOT EXISTS distance_unit TEXT
    CHECK (distance_unit IN ('m', 'km'));

COMMENT ON COLUMN user_exercise_overrides.distance_unit IS 'Unidad de distancia elegida por el usuario para este ejercicio. NULL = hereda exercises.distance_unit.';

-- El tope de la columna era 9999,99 m: numeric(6,2) admite 4 dígitos enteros. Con la distancia
-- tecleada en metros ese techo no lo tocaba nadie (nadie escribe "10000" a mano), pero en cuanto se
-- teclea en kilómetros "10" es la entrada normal de una cinta o un rodaje, y Postgres responde
-- 22003 (numeric field overflow) al guardar la serie, a mitad de entrenamiento. numeric(8,2) deja
-- 999.999,99 m (1000 km) por serie: sobra para un ultra o una etapa de bici, y sigue acotando.
ALTER TABLE completed_sets
    ALTER COLUMN distance_meters TYPE NUMERIC(8,2);

-- Único ejercicio de sistema que mide distancia hoy (el catálogo de cardio llega en #42).
-- Correr se mide en kilómetros; era justo el caso que el issue describe como roto.
UPDATE exercises
SET distance_unit = 'km'
WHERE is_system = TRUE
  AND name_en = 'Running';
