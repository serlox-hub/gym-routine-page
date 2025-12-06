-- ============================================
-- MIGRACIÓN: Añadir weight_unit a exercises
-- Permite configurar kg o lb por ejercicio
-- ============================================

ALTER TABLE exercises ADD COLUMN weight_unit TEXT DEFAULT 'kg';

-- Ejercicios de polea y máquina usan libras
UPDATE exercises SET weight_unit = 'lb' WHERE name ILIKE '%polea%' OR name ILIKE '%máquina%';
