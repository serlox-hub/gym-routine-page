-- ============================================
-- VALIDACIÓN POST-MIGRACIÓN 039
-- Ejecutar después de aplicar 039_add_rep_pr_per_rep_count.sql
-- Cada bloque es independiente. Lee la nota arriba de cada uno antes de correr.
-- ============================================


-- ============================================
-- 1. Esquema: las columnas e índice existen
-- Esperado: 2 filas (best_per_reps jsonb, pr_rep_counts smallint[])
-- ============================================

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'exercise_session_stats'
  AND column_name IN ('best_per_reps', 'pr_rep_counts');

-- Esperado: 1 fila con idx_ess_pr_rep_counts
SELECT indexname FROM pg_indexes
WHERE tablename = 'exercise_session_stats'
  AND indexname = 'idx_ess_pr_rep_counts';


-- ============================================
-- 2. Backfill: best_per_reps poblado para weight_reps
-- Esperado: cuenta > 0 si tienes sesiones con weight_reps. Cada fila debe ser
-- un objeto JSONB no vacío con claves numéricas en string y valores numéricos.
-- ============================================

SELECT COUNT(*) AS rows_with_best_per_reps
FROM exercise_session_stats
WHERE best_per_reps IS NOT NULL;

-- Sample para inspección visual: 5 filas con sus mejores por rep count
SELECT session_id, exercise_id, best_weight, best_1rm, best_per_reps
FROM exercise_session_stats
WHERE best_per_reps IS NOT NULL
ORDER BY session_date DESC
LIMIT 5;


-- ============================================
-- 3. Coherencia: best_per_reps debe contener best_weight
-- Para cualquier sesión, el peso máximo en best_per_reps debería igualar best_weight
-- (ambos vienen de los mismos completed_sets).
-- Esperado: 0 filas (sin discrepancias).
-- ============================================

WITH bpr_max AS (
    SELECT id, exercise_id, best_weight,
        (SELECT MAX((kv.value)::NUMERIC)
         FROM jsonb_each_text(best_per_reps) kv) AS bpr_max_weight
    FROM exercise_session_stats
    WHERE best_per_reps IS NOT NULL
)
SELECT id, exercise_id, best_weight, bpr_max_weight
FROM bpr_max
WHERE bpr_max_weight IS DISTINCT FROM best_weight;


-- ============================================
-- 4. Backfill: pr_rep_counts cronológicamente
-- Esperado: cuenta razonable (>= número de ejercicios distintos con historial).
-- Cada usuario tiene al menos 1 PR por ejercicio si hay >1 sesión.
-- ============================================

SELECT COUNT(*) AS rows_with_pr_rep_counts
FROM exercise_session_stats
WHERE pr_rep_counts IS NOT NULL;

-- Sample: las 10 sesiones más recientes con rep-PRs
SELECT session_id, exercise_id, session_date, pr_rep_counts, best_per_reps
FROM exercise_session_stats
WHERE pr_rep_counts IS NOT NULL
ORDER BY session_date DESC
LIMIT 10;


-- ============================================
-- 5. Convención: primera sesión de cada ejercicio NUNCA tiene rep-PR
-- Esperado: 0 filas. Si aparece alguna, hay bug en la lógica DENSE_RANK > 1.
-- ============================================

WITH first_sessions AS (
    SELECT DISTINCT ON (user_id, exercise_id)
        id, user_id, exercise_id, session_date
    FROM exercise_session_stats
    ORDER BY user_id, exercise_id, session_date
)
SELECT ess.id, ess.exercise_id, ess.pr_rep_counts
FROM exercise_session_stats ess
JOIN first_sessions fs ON fs.id = ess.id
WHERE ess.pr_rep_counts IS NOT NULL;


-- ============================================
-- 6. Coherencia: rep_counts en pr_rep_counts deben existir como claves en best_per_reps
-- Si pr_rep_counts = {3,5} pero best_per_reps no tiene clave "3" o "5", hay inconsistencia.
-- Esperado: 0 filas.
-- ============================================

WITH expanded AS (
    SELECT id, unnest(pr_rep_counts)::TEXT AS rep_count_str, best_per_reps
    FROM exercise_session_stats
    WHERE pr_rep_counts IS NOT NULL
)
SELECT id, rep_count_str
FROM expanded
WHERE NOT (best_per_reps ? rep_count_str);


-- ============================================
-- 7. Verificar el RPC: llamar manualmente y comprobar que pr_rep_counts
-- se mantiene consistente. Reemplaza :exercise_id por un id real (ej: 1).
-- Esperado: el RPC se ejecuta sin error y los resultados antes/después son iguales
-- (idempotencia para cualquier fecha desde el inicio del histórico).
-- ============================================

-- Antes (snapshot)
-- SELECT id, pr_rep_counts FROM exercise_session_stats WHERE exercise_id = :exercise_id ORDER BY session_date;

-- Llamar al RPC con una fecha muy antigua → recalcula todo el histórico
-- SELECT recalculate_exercise_prs(:exercise_id, '1970-01-01'::TIMESTAMPTZ);

-- Después (debería ser idéntico al snapshot anterior)
-- SELECT id, pr_rep_counts FROM exercise_session_stats WHERE exercise_id = :exercise_id ORDER BY session_date;


-- ============================================
-- 8. Sanidad cruzada: contar PRs detectados de cada tipo
-- Sirve para tener una idea del orden de magnitud y detectar "cero" sospechoso.
-- ============================================

SELECT
    COUNT(*) FILTER (WHERE is_pr_weight) AS weight_prs,
    COUNT(*) FILTER (WHERE is_pr_1rm) AS one_rm_prs,
    COUNT(*) FILTER (WHERE is_pr_reps) AS legacy_reps_prs,
    COUNT(*) FILTER (WHERE pr_rep_counts IS NOT NULL) AS sessions_with_rep_prs,
    SUM(COALESCE(array_length(pr_rep_counts, 1), 0)) AS total_rep_pr_categories
FROM exercise_session_stats;
