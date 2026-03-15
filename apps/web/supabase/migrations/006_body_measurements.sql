-- Tabla para medidas corporales (excepto peso)
CREATE TABLE body_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    measurement_type TEXT NOT NULL,
    value DECIMAL(6,2) NOT NULL CHECK (value > 0),
    unit TEXT DEFAULT 'cm' CHECK (unit IN ('cm', 'in')),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice compuesto para queries eficientes
CREATE INDEX idx_body_measurements_user_type_date
    ON body_measurements(user_id, measurement_type, recorded_at DESC);

-- Row Level Security
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own body measurements"
    ON body_measurements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own body measurements"
    ON body_measurements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own body measurements"
    ON body_measurements FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own body measurements"
    ON body_measurements FOR DELETE
    USING (auth.uid() = user_id);
