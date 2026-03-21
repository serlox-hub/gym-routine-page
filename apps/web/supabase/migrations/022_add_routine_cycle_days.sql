-- Campo para indicar la duracion del ciclo de la rutina en dias.
-- Por defecto 7 (semanal). Permite calcular volumen semanal normalizado.

ALTER TABLE routines ADD COLUMN cycle_days SMALLINT NOT NULL DEFAULT 7;
