-- New measurement field `assistance` (issue #202): the help of an assisted machine, where less is
-- better and 0 (a rep without help) is the best value. Stored in completed_sets.weight, like the
-- weight it replaces on those exercises.
--
-- Alone in its migration: Postgres cannot use an enum value in the transaction that adds it, and
-- 074 uses it (the CHECK, pr_metrics, the data fix).

ALTER TYPE measurement_field ADD VALUE IF NOT EXISTS 'assistance' AFTER 'weight';
