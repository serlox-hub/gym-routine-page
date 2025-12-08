-- Tabla para permisos de usuario
CREATE TABLE user_permissions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    can_upload_video BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: usuarios solo pueden leer sus propios permisos
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own permissions"
    ON user_permissions FOR SELECT
    USING (auth.uid() = user_id);

-- Índice para búsquedas rápidas
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);

-- Comentario
COMMENT ON TABLE user_permissions IS 'Permisos especiales por usuario (ej: subir videos)';
