-- Agregar categorías adicionales de ejercicios
INSERT INTO muscle_groups (name)
VALUES
  ('Cardio'),
  ('Movilidad'),
  ('Cuerpo Completo')
ON CONFLICT (name) DO NOTHING;
