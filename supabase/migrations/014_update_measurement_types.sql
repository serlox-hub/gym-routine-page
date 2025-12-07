-- ============================================
-- MIGRACIÓN: Actualizar measurement_type de ejercicios unilaterales
-- Eliminar tipos per_side del código, usar campo en reps para indicar /lado
-- ============================================

-- Actualizar ejercicios específicos a reps_only (indicar /lado en el campo reps)
UPDATE exercises SET measurement_type = 'reps_only' WHERE name = 'Balanceos de pierna';
UPDATE exercises SET measurement_type = 'reps_only' WHERE name = 'Bicho Muerto';
UPDATE exercises SET measurement_type = 'reps_only' WHERE name = 'Perro-Pájaro Lento';
UPDATE exercises SET measurement_type = 'reps_only' WHERE name = 'Rotación externa con goma';

-- Press Pallof usa peso, así que weight_reps
UPDATE exercises SET measurement_type = 'weight_reps' WHERE name = 'Press Pallof en Polea';

-- Plancha Lateral usa tiempo
UPDATE exercises SET measurement_type = 'time' WHERE name = 'Plancha Lateral';

-- Migrar cualquier ejercicio existente con tipos per_side
UPDATE exercises SET measurement_type = 'reps_only' WHERE measurement_type = 'reps_per_side';
UPDATE exercises SET measurement_type = 'time' WHERE measurement_type = 'time_per_side';
