-- Tabla para registrar peso corporal del usuario
CREATE TABLE body_weight_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    weight DECIMAL(5,2) NOT NULL CHECK (weight > 0),
    weight_unit weight_unit DEFAULT 'kg',
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries eficientes
CREATE INDEX idx_body_weight_user_date ON body_weight_records(user_id, recorded_at DESC);

-- Row Level Security
ALTER TABLE body_weight_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own body weight records"
    ON body_weight_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own body weight records"
    ON body_weight_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own body weight records"
    ON body_weight_records FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own body weight records"
    ON body_weight_records FOR DELETE
    USING (auth.uid() = user_id);
