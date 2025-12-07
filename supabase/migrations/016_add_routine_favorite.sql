-- Añadir campo is_favorite a rutinas
ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
