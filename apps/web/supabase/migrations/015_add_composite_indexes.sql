-- Índices compuestos para queries frecuentes.
-- Los índices simples (user_id) y (started_at) existen por separado,
-- pero las queries más comunes filtran por ambos a la vez.

-- "Últimas N sesiones del usuario X" — query más frecuente de la app
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date
  ON workout_sessions(user_id, started_at DESC);

-- "Sesiones activas del usuario" — buscar sesión in_progress al abrir la app
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_status
  ON workout_sessions(user_id, status);
