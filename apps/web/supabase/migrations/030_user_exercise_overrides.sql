-- ============================================
-- MIGRACIÓN: Notas personales y overrides de usuario para ejercicios de sistema
-- ============================================

CREATE TABLE user_exercise_overrides (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  notes TEXT,
  weight_unit TEXT CHECK (weight_unit IN ('kg', 'lb')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- RLS
ALTER TABLE user_exercise_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own overrides"
  ON user_exercise_overrides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own overrides"
  ON user_exercise_overrides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own overrides"
  ON user_exercise_overrides FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own overrides"
  ON user_exercise_overrides FOR DELETE
  USING (auth.uid() = user_id);
