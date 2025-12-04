-- ============================================
-- PASO 2: Migrar datos existentes a tu usuario
-- Ejecutar DESPUÉS de ejecutar 005_add_user_columns.sql
-- ============================================

UPDATE exercises SET user_id = '27a765cf-c3a6-4c98-94d9-21c2f3dec2a0' WHERE user_id IS NULL;
UPDATE routines SET user_id = '27a765cf-c3a6-4c98-94d9-21c2f3dec2a0' WHERE user_id IS NULL;
UPDATE workout_sessions SET user_id = '27a765cf-c3a6-4c98-94d9-21c2f3dec2a0' WHERE user_id IS NULL;

-- Verificar que no queden registros sin user_id:
SELECT 'exercises' as tabla, COUNT(*) as sin_user FROM exercises WHERE user_id IS NULL
UNION ALL
SELECT 'routines', COUNT(*) FROM routines WHERE user_id IS NULL
UNION ALL
SELECT 'workout_sessions', COUNT(*) FROM workout_sessions WHERE user_id IS NULL;
