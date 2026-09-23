-- Tables supplémentaires pour synchroniser les paramètres

-- Table user_preferences pour synchroniser les préférences utilisateur
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  language TEXT DEFAULT 'fr',
  currency TEXT DEFAULT 'FCFA',
  dark_mode BOOLEAN DEFAULT false,
  notifications BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table user_secret_code pour synchroniser le code secret
CREATE TABLE IF NOT EXISTS user_secret_code (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  secret_code TEXT NOT NULL DEFAULT '1234',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_secret_code_user_id ON user_secret_code(user_id);

-- Activer Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_secret_code ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour user_preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own preferences" ON user_preferences
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Politiques RLS pour user_secret_code
CREATE POLICY "Users can view own secret_code" ON user_secret_code
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own secret_code" ON user_secret_code
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own secret_code" ON user_secret_code
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own secret_code" ON user_secret_code
  FOR DELETE USING (auth.uid()::text = user_id::text);
