-- ============================================
-- MIGRACIÓN: muscle_groups bilingüe + equipment_types con FK
-- ============================================

-- 1. muscle_groups: renombrar name → name_es, añadir name_en
ALTER TABLE muscle_groups RENAME COLUMN name TO name_es;
ALTER TABLE muscle_groups ADD COLUMN name_en TEXT;

UPDATE muscle_groups SET name_en = CASE name_es
  WHEN 'Abdominales' THEN 'Abs'
  WHEN 'Espalda' THEN 'Back'
  WHEN 'Pecho' THEN 'Chest'
  WHEN 'Hombros' THEN 'Shoulders'
  WHEN 'Bíceps' THEN 'Biceps'
  WHEN 'Tríceps' THEN 'Triceps'
  WHEN 'Antebrazo' THEN 'Forearms'
  WHEN 'Cuádriceps' THEN 'Quads'
  WHEN 'Isquiotibiales' THEN 'Hamstrings'
  WHEN 'Glúteos' THEN 'Glutes'
  WHEN 'Pantorrillas' THEN 'Calves'
  WHEN 'Cardio' THEN 'Cardio'
  WHEN 'Movilidad' THEN 'Mobility'
  WHEN 'Cuerpo Completo' THEN 'Full Body'
  ELSE name_es
END;

-- 2. equipment_types: nueva tabla
CREATE TABLE equipment_types (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL
);

ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for all" ON equipment_types FOR SELECT USING (true);

INSERT INTO equipment_types (key, name_es, name_en) VALUES
  ('barbell', 'Barra', 'Barbell'),
  ('dumbbell', 'Mancuernas', 'Dumbbell'),
  ('cable', 'Polea', 'Cable'),
  ('machine', 'Máquina', 'Machine'),
  ('bodyweight', 'Peso corporal', 'Bodyweight'),
  ('band', 'Banda elástica', 'Resistance Band'),
  ('kettlebell', 'Kettlebell', 'Kettlebell'),
  ('plate', 'Disco', 'Plate'),
  ('smith_machine', 'Máquina Smith', 'Smith Machine'),
  ('swiss_ball', 'Pelota suiza', 'Swiss Ball'),
  ('trx', 'TRX', 'TRX'),
  ('other', 'Otro', 'Other');

-- 3. exercises: migrar equipment TEXT → equipment_type_id FK
ALTER TABLE exercises ADD COLUMN equipment_type_id INT REFERENCES equipment_types(id);

UPDATE exercises SET equipment_type_id = et.id
FROM equipment_types et WHERE exercises.equipment = et.key;

ALTER TABLE exercises DROP COLUMN IF EXISTS equipment;
CREATE INDEX idx_exercises_equipment_type ON exercises(equipment_type_id);
