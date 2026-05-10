-- ============================================
-- MIGRACIÓN: Tabla user_feedback
-- Permite a los usuarios enviar bugs y sugerencias.
-- - Usuarios: pueden insertar sus propios reportes (no leen ni listan).
-- - Admins: pueden leer todos los reportes vía RPC get_all_feedback().
-- ============================================

CREATE TABLE user_feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('bug', 'suggestion')),
    message TEXT NOT NULL CHECK (char_length(message) <= 4000 AND length(btrim(message)) > 0),
    app_version TEXT,
    platform TEXT CHECK (platform IN ('web', 'native')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_feedback IS 'Reportes de bugs y sugerencias enviados por los usuarios';

CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);

-- RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden insertar sus propios reportes
CREATE POLICY "Users can insert own feedback"
    ON user_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Los admins pueden leer todos los reportes
CREATE POLICY "Admins can read all feedback"
    ON user_feedback FOR SELECT
    USING (is_admin(auth.uid()));

-- RPC para listar todos los reportes con email del usuario (solo admins)
CREATE OR REPLACE FUNCTION get_all_feedback()
RETURNS TABLE (
    id BIGINT,
    user_id UUID,
    user_email TEXT,
    type TEXT,
    message TEXT,
    app_version TEXT,
    platform TEXT,
    created_at TIMESTAMPTZ
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
        f.created_at
    FROM user_feedback f
    LEFT JOIN auth.users u ON u.id = f.user_id
    ORDER BY f.created_at DESC;
END;
$$;
