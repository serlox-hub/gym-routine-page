-- ============================================
-- MIGRACIÓN: Simplificación del modelo de ejercicios
-- El nombre del ejercicio incluye equipamiento y tipo de agarre
-- Las instrucciones incluyen apertura de agarre y altura de polea
-- ============================================

-- ============================================
-- PASO 1: Mover grip_width (amplitud) y altura_polea a instrucciones
-- grip_width_id: 1=Cerrado, 2=Medio, 3=Ancho, 4=N/A
-- ============================================

-- Agregar amplitud de agarre a instrucciones
UPDATE exercises
SET instrucciones = COALESCE(instrucciones || E'\n\n', '') || 'Amplitud de agarre: Cerrado'
WHERE grip_width_id = 1;

UPDATE exercises
SET instrucciones = COALESCE(instrucciones || E'\n\n', '') || 'Amplitud de agarre: Medio'
WHERE grip_width_id = 2;

UPDATE exercises
SET instrucciones = COALESCE(instrucciones || E'\n\n', '') || 'Amplitud de agarre: Ancho'
WHERE grip_width_id = 3;

-- Agregar altura de polea a instrucciones
UPDATE exercises
SET instrucciones = COALESCE(instrucciones || E'\n', '') || 'Altura de polea: ' || altura_polea
WHERE altura_polea IS NOT NULL;

-- ============================================
-- PASO 2: Actualizar nombres de ejercicios
-- Sin paréntesis, incluir equipamiento y tipo de agarre en el nombre
-- ============================================

-- Core
UPDATE exercises SET nombre = 'Press Pallof en Polea' WHERE nombre = 'Press Pallof';
UPDATE exercises SET nombre = 'Paseo del Granjero con Mancuernas' WHERE nombre = 'Paseo del Granjero';

-- Espalda
UPDATE exercises SET nombre = 'Dominadas Agarre Prono' WHERE nombre = 'Dominadas Lastradas';
UPDATE exercises SET nombre = 'Remo con Mancuerna Agarre Neutro' WHERE nombre = 'Remo con Mancuerna';
UPDATE exercises SET nombre = 'Jalón al Pecho en Máquina Agarre Neutro' WHERE nombre = 'Jalón al Pecho';
UPDATE exercises SET nombre = 'Remo Alto en Polea Agarre Prono' WHERE nombre = 'Remo Alto en Polea';
UPDATE exercises SET nombre = 'Jalón Estrecho en Máquina Agarre Neutro' WHERE nombre = 'Jalón Estrecho';

-- Bíceps
UPDATE exercises SET nombre = 'Curl Inclinado con Mancuernas Agarre Supino' WHERE nombre = 'Curl Inclinado con Mancuernas';
UPDATE exercises SET nombre = 'Curl con Barra EZ Agarre Semi-supino' WHERE nombre = 'Curl con Barra EZ';
UPDATE exercises SET nombre = 'Curl Martillo Inclinado con Mancuernas' WHERE nombre = 'Curl Martillo Inclinado';
UPDATE exercises SET nombre = 'Curl Bayesiano en Polea Agarre Supino' WHERE nombre = 'Curl Bayesiano en Polea';

-- Hombros
-- Consolidar 3 variantes de elevación lateral en polea en una sola (id 18)
UPDATE routine_exercises SET exercise_id = 18 WHERE exercise_id = 21;
UPDATE routine_exercises SET exercise_id = 18 WHERE exercise_id = 24;
DELETE FROM exercises WHERE nombre = 'Elevación Lateral en Polea 1 Brazo (Desde Atrás)';
DELETE FROM exercises WHERE nombre = 'Elevación Lateral en Polea (Bilateral)';
-- Renombrar
UPDATE exercises SET nombre = 'Elevación Lateral en Polea Desde Atrás' WHERE nombre = 'Elevación Lateral en Polea (Desde Atrás)';
UPDATE exercises SET nombre = 'Tirón a la Cara en Polea Agarre Neutro' WHERE nombre = 'Tirón a la Cara';
UPDATE exercises SET nombre = 'Press de Hombro con Mancuernas Agarre Neutro' WHERE nombre = 'Press de Hombro con Mancuernas';
UPDATE exercises SET nombre = 'Elevaciones en Y con Mancuernas en Banco Inclinado' WHERE nombre = 'Elevaciones en Y (Banco Inclinado)';

-- Pecho
UPDATE exercises SET nombre = 'Fondos en Paralelas' WHERE nombre = 'Fondos Lastrados';
UPDATE exercises SET nombre = 'Press Inclinado con Mancuernas Agarre Prono' WHERE nombre = 'Press Inclinado con Mancuernas';

-- Tríceps
-- Reemplazar ejercicio 27 por 29 en la rutina (son casi iguales, consolidamos en uno)
UPDATE routine_exercises SET exercise_id = 29 WHERE exercise_id = 27;
-- Eliminar ejercicio duplicado
DELETE FROM exercises WHERE nombre = 'Extensión de Tríceps sobre Cabeza en Polea';
-- Renombrar los que quedan
UPDATE exercises SET nombre = 'Extensión de Tríceps en Polea con Cuerda' WHERE nombre = 'Extensión de Tríceps en Polea con Cuerda';
UPDATE exercises SET nombre = 'Extensión de Tríceps sobre Cabeza en Polea con Cuerda' WHERE nombre = 'Extensión de Tríceps sobre Cabeza con Cuerda';
UPDATE exercises SET nombre = 'Extensión de Tríceps en Polea Barra V' WHERE nombre = 'Extensión de Tríceps en Polea (Barra V)';

-- Piernas
UPDATE exercises SET nombre = 'Empuje de Cadera en Máquina' WHERE nombre = 'Empuje de Cadera';
UPDATE exercises SET nombre = 'Peso Muerto Rumano con Barra Agarre Prono' WHERE nombre = 'Peso Muerto Rumano';
UPDATE exercises SET nombre = 'Curl Femoral Tumbado en Máquina' WHERE nombre = 'Curl Femoral Tumbado';
UPDATE exercises SET nombre = 'Abducción de Cadera en Máquina' WHERE nombre = 'Abducción de Cadera';

-- ============================================
-- PASO 3: Eliminar columnas redundantes de exercises
-- ============================================

ALTER TABLE exercises DROP COLUMN IF EXISTS equipment_id;
ALTER TABLE exercises DROP COLUMN IF EXISTS grip_type_id;
ALTER TABLE exercises DROP COLUMN IF EXISTS grip_width_id;
ALTER TABLE exercises DROP COLUMN IF EXISTS altura_polea;

-- ============================================
-- PASO 4: Eliminar columnas redundantes de otras tablas
-- ============================================

-- frecuencia_dias de routines (no se usa)
ALTER TABLE routines DROP COLUMN IF EXISTS frecuencia_dias;

-- dia_numero de routine_days (usar solo orden)
ALTER TABLE routine_days DROP COLUMN IF EXISTS dia_numero;

-- es_calentamiento de routine_exercises (se determina por el nombre del bloque)
ALTER TABLE routine_exercises DROP COLUMN IF EXISTS es_calentamiento;

-- ============================================
-- PASO 5: Eliminar tablas de catálogos no usados
-- (CASCADE elimina automáticamente las políticas RLS)
-- ============================================

DROP TABLE IF EXISTS exercise_muscles CASCADE;
DROP TABLE IF EXISTS muscles CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS equipment_types CASCADE;
DROP TABLE IF EXISTS grip_types CASCADE;
DROP TABLE IF EXISTS grip_widths CASCADE;

-- ============================================
-- PASO 6: Eliminar constraint UNIQUE de routine_days que ya no aplica
-- ============================================

ALTER TABLE routine_days DROP CONSTRAINT IF EXISTS routine_days_routine_id_dia_numero_key;
