-- Eliminar políticas permisivas "Allow all for anon" que anulaban las políticas restrictivas
-- Estas políticas con USING (true) permitían acceso total a cualquier rol (incluyendo anon)

DROP POLICY IF EXISTS "Allow all for anon" ON session_exercises;
DROP POLICY IF EXISTS "Allow all for anon" ON completed_sets;
DROP POLICY IF EXISTS "Allow all for anon" ON workout_sessions;
DROP POLICY IF EXISTS "Allow all for anon" ON routines;
DROP POLICY IF EXISTS "Allow all for anon" ON routine_days;
DROP POLICY IF EXISTS "Allow all for anon" ON routine_blocks;
DROP POLICY IF EXISTS "Allow all for anon" ON routine_exercises;
DROP POLICY IF EXISTS "Allow all for anon" ON exercises;
