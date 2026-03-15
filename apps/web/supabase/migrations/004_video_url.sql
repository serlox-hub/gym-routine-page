-- Añadir campo video_url a completed_sets para guardar videos de técnica/PRs
ALTER TABLE completed_sets ADD COLUMN video_url TEXT;

COMMENT ON COLUMN completed_sets.video_url IS 'Key del video en MinIO (opcional)';

-- Tabla flexible para configuraciones de usuario (clave-valor)
CREATE TABLE user_settings (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, key)
);

-- RLS: usuarios solo pueden leer sus propias configuraciones
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

-- Índices para búsquedas rápidas
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_key ON user_settings(key);

COMMENT ON TABLE user_settings IS 'Configuraciones y permisos de usuario en formato clave-valor';

-- Función para obtener todos los usuarios (solo admins)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar que el usuario es admin
    IF NOT EXISTS (
        SELECT 1 FROM user_settings
        WHERE user_id = auth.uid()
        AND key = 'is_admin'
        AND value = 'true'
    ) THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    RETURN QUERY
    SELECT u.id, u.email::TEXT, u.created_at
    FROM auth.users u
    ORDER BY u.created_at DESC;
END;
$$;

-- Función helper para verificar si usuario es admin (evita recursión en RLS)
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_settings
        WHERE user_id = check_user_id
        AND key = 'is_admin'
        AND value = 'true'
    );
$$;

-- Política para que admins puedan gestionar settings de todos los usuarios
CREATE POLICY "Admins can manage all settings"
    ON user_settings FOR ALL
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
