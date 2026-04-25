-- Remove goal and cycle_days columns from routines table
-- These fields are no longer used in the UI

ALTER TABLE routines DROP COLUMN IF EXISTS goal;
ALTER TABLE routines DROP COLUMN IF EXISTS cycle_days;
