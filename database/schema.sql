-- Meal Tracker — modelo inicial para Neon PostgreSQL + Neon Auth + Data API.
-- Pré-requisitos no Neon Console:
--   1. Neon Auth ativo
--   2. Data API ativa (cria os roles authenticated/anonymous e auth.user_id())
-- Executar no SQL Editor do Neon apenas depois de ambos estarem ativos.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Dados específicos da aplicação. As credenciais e sessões são geridas pelo
-- schema neon_auth; nunca guardamos passwords nas nossas tabelas.
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY DEFAULT (auth.user_id()),
  calorie_goal INTEGER NOT NULL DEFAULT 2000 CHECK (calorie_goal > 0),
  protein_goal NUMERIC(7,2) NOT NULL DEFAULT 130 CHECK (protein_goal >= 0),
  carbs_goal NUMERIC(7,2) NOT NULL DEFAULT 230 CHECK (carbs_goal >= 0),
  fat_goal NUMERIC(7,2) NOT NULL DEFAULT 65 CHECK (fat_goal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Receitas são globais: qualquer utilizador autenticado pode consultá-las.
-- A criação/edição será feita posteriormente por uma API de administração.
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  prep_minutes INTEGER NOT NULL DEFAULT 0 CHECK (prep_minutes >= 0),
  servings NUMERIC(7,2) NOT NULL DEFAULT 1 CHECK (servings > 0),
  calories NUMERIC(9,2) NOT NULL CHECK (calories >= 0),
  protein NUMERIC(9,2) NOT NULL CHECK (protein >= 0),
  carbs NUMERIC(9,2) NOT NULL CHECK (carbs >= 0),
  fat NUMERIC(9,2) NOT NULL CHECK (fat >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(9,2),
  unit TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT (auth.user_id()),
  recipe_id UUID NOT NULL REFERENCES recipes(id),
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Pequeno-almoço', 'Almoço', 'Lanche', 'Jantar')),
  portions NUMERIC(7,2) NOT NULL CHECK (portions > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recipes_name_idx ON recipes (LOWER(name));
CREATE INDEX IF NOT EXISTS recipe_ingredients_recipe_idx ON recipe_ingredients (recipe_id, position);
CREATE INDEX IF NOT EXISTS meal_entries_user_date_idx ON meal_entries (user_id, meal_date);

-- Row-Level Security: cada utilizador só vê e altera o seu perfil e diário.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_own_rows ON profiles;
DROP POLICY IF EXISTS recipes_authenticated_read ON recipes;
DROP POLICY IF EXISTS recipe_ingredients_authenticated_read ON recipe_ingredients;
DROP POLICY IF EXISTS meal_entries_own_rows ON meal_entries;

CREATE POLICY profiles_own_rows ON profiles
  FOR ALL TO authenticated
  USING ((SELECT auth.user_id()) = user_id)
  WITH CHECK ((SELECT auth.user_id()) = user_id);

CREATE POLICY recipes_authenticated_read ON recipes
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY recipe_ingredients_authenticated_read ON recipe_ingredients
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY meal_entries_own_rows ON meal_entries
  FOR ALL TO authenticated
  USING ((SELECT auth.user_id()) = user_id)
  WITH CHECK ((SELECT auth.user_id()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT ON recipes, recipe_ingredients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meal_entries TO authenticated;
