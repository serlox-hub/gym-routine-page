-- ============================================
-- FASE 1: Datos iniciales (seed)
-- Ejecutar DESPUÉS de 001_create_tables.sql
-- ============================================

-- ============================================
-- GRUPOS MUSCULARES
-- ============================================

INSERT INTO muscle_groups (nombre, categoria) VALUES
    ('Abdominales', 'Abdominales'),
    ('Espalda', 'Superior'),
    ('Pecho', 'Superior'),
    ('Hombros', 'Superior'),
    ('Bíceps', 'Superior'),
    ('Tríceps', 'Superior'),
    ('Antebrazo', 'Superior'),
    ('Cuádriceps', 'Inferior'),
    ('Isquiotibiales', 'Inferior'),
    ('Glúteos', 'Inferior'),
    ('Pantorrillas', 'Inferior');

-- ============================================
-- MÚSCULOS ESPECÍFICOS
-- ============================================

INSERT INTO muscles (nombre, muscle_group_id, nombre_corto) VALUES
    -- Core
    ('Recto abdominal', 1, 'Abdominales'),
    ('Transverso abdominal', 1, 'Transverso'),
    ('Oblicuos', 1, 'Oblicuos'),
    ('Serrato anterior', 1, 'Serrato'),
    ('Erectores espinales', 1, 'Erectores'),
    ('Psoas ilíaco', 1, 'Psoas'),

    -- Espalda
    ('Dorsal ancho', 2, 'Dorsales'),
    ('Trapecio inferior', 2, 'Trapecio inf'),
    ('Trapecio medio', 2, 'Trapecio med'),
    ('Trapecio superior', 2, 'Trapecio sup'),
    ('Romboides', 2, 'Romboides'),
    ('Redondo mayor', 2, 'Redondo may'),
    ('Redondo menor', 2, 'Redondo men'),
    ('Infraespinoso', 2, 'Infraespinoso'),

    -- Pecho
    ('Pectoral mayor (porción clavicular)', 3, 'Pecho sup'),
    ('Pectoral mayor (porción esternal)', 3, 'Pecho med'),
    ('Pectoral mayor (porción abdominal)', 3, 'Pecho inf'),
    ('Pectoral menor', 3, 'Pec menor'),

    -- Hombros
    ('Deltoides anterior', 4, 'Delt ant'),
    ('Deltoides lateral', 4, 'Delt lat'),
    ('Deltoides posterior', 4, 'Delt post'),

    -- Bíceps
    ('Bíceps braquial (cabeza larga)', 5, 'Bíceps largo'),
    ('Bíceps braquial (cabeza corta)', 5, 'Bíceps corto'),
    ('Bíceps braquial', 5, 'Bíceps'),
    ('Braquial', 5, 'Braquial'),
    ('Braquiorradial', 7, 'Braquiorradial'),

    -- Tríceps
    ('Tríceps (cabeza larga)', 6, 'Tríceps largo'),
    ('Tríceps (cabeza lateral)', 6, 'Tríceps lat'),
    ('Tríceps (cabeza medial)', 6, 'Tríceps med'),
    ('Tríceps braquial', 6, 'Tríceps'),

    -- Piernas
    ('Cuádriceps', 8, 'Cuádriceps'),
    ('Recto femoral', 8, 'Recto fem'),
    ('Vasto lateral', 8, 'Vasto lat'),
    ('Isquiotibiales', 9, 'Isquios'),
    ('Glúteo mayor', 10, 'Glúteo'),
    ('Gemelos', 11, 'Gemelos'),
    ('Sóleo', 11, 'Sóleo');

-- ============================================
-- TIPOS DE EQUIPAMIENTO
-- ============================================

INSERT INTO equipment_types (nombre) VALUES
    ('Barra'),
    ('Mancuernas'),
    ('Polea'),
    ('Máquina'),
    ('Peso corporal'),
    ('Banda elástica'),
    ('Kettlebell'),
    ('Rueda abdominal'),
    ('Banco');

-- ============================================
-- EQUIPAMIENTO ESPECÍFICO
-- ============================================

INSERT INTO equipment (nombre, equipment_type_id, default_weight_unit) VALUES
    -- Barras (id 1-4) - kg por defecto
    ('Barra olímpica', 1, 'kg'),
    ('Barra recta corta', 1, 'kg'),
    ('Barra EZ', 1, 'kg'),
    ('Barra hexagonal', 1, 'kg'),

    -- Mancuernas (id 5) - kg por defecto
    ('Mancuernas', 2, 'kg'),

    -- Poleas (id 6-7) - lb por defecto (máquinas de gym)
    ('Polea', 3, 'lb'),
    ('Cable cruzado', 3, 'lb'),

    -- Máquinas (id 8-9)
    ('Máquina', 4, 'lb'),
    ('Máquina de discos', 4, 'kg'),

    -- Peso corporal (id 10-12) - kg (peso adicional como cinturón)
    ('Barra de dominadas', 5, 'kg'),
    ('Paralelas', 5, 'kg'),
    ('Suelo', 5, 'kg'),

    -- Otros (id 13-15)
    ('Banda de resistencia', 6, 'kg'),
    ('Rueda abdominal', 8, 'kg'),
    ('Banco', 9, 'kg');

-- ============================================
-- TIPOS DE AGARRE
-- ============================================

INSERT INTO grip_types (nombre) VALUES
    ('Prono'),
    ('Supino'),
    ('Neutro'),
    ('Mixto'),
    ('Semi-supino'),
    ('Falso (thumbless)');

-- ============================================
-- APERTURAS DE AGARRE
-- ============================================

INSERT INTO grip_widths (nombre) VALUES
    ('Cerrado'),
    ('Medio'),
    ('Ancho'),
    ('N/A');
