-- ============================================
-- MIGRACIÓN: Gestión de reportes user_feedback
-- Permite a los admins marcar reportes como resueltos y eliminarlos.
-- ============================================

ALTER TABLE user_feedback
    ADD COLUMN resolved_at TIMESTAMPTZ,
    ADD COLUMN resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN user_feedback.resolved_at IS 'Timestamp en el que un admin marcó el reporte como resuelto. NULL = pendiente.';
COMMENT ON COLUMN user_feedback.resolved_by IS 'Admin que marcó el reporte como resuelto.';

-- Índice parcial para listar pendientes rápidamente
CREATE INDEX idx_user_feedback_pending
    ON user_feedback(created_at DESC)
    WHERE resolved_at IS NULL;

-- Policies para gestión por admins
CREATE POLICY "Admins can update feedback"
    ON user_feedback FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete feedback"
    ON user_feedback FOR DELETE
    USING (is_admin(auth.uid()));

-- Reemplazar RPC para incluir resolved_at en el output
-- (DROP necesario porque Postgres no permite cambiar el return type con CREATE OR REPLACE)
DROP FUNCTION IF EXISTS get_all_feedback();

CREATE FUNCTION get_all_feedback()
RETURNS TABLE (
    id BIGINT,
    user_id UUID,
    user_email TEXT,
    type TEXT,
    message TEXT,
    app_version TEXT,
    platform TEXT,
    created_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    RETURN QUERY
    SELECT
        f.id,
        f.user_id,
        u.email::TEXT AS user_email,
        f.type,
        f.message,
        f.app_version,
        f.platform,
        f.created_at,
        f.resolved_at,
        f.resolved_by
    FROM user_feedback f
    LEFT JOIN auth.users u ON u.id = f.user_id
    ORDER BY
        (f.resolved_at IS NOT NULL) ASC,  -- pendientes primero
        f.created_at DESC;
END;
$$;
