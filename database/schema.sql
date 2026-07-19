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
  birth_year INTEGER,
  metabolic_sex TEXT CHECK (metabolic_sex IN ('female', 'male')),
  height_cm NUMERIC(6,2),
  weight_kg NUMERIC(6,2),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'very-active', 'extra-active')),
  nutrition_goal TEXT CHECK (nutrition_goal IN ('lose', 'maintain', 'gain')),
  goal_mode TEXT NOT NULL DEFAULT 'calculated' CHECK (goal_mode IN ('calculated', 'manual')),
  disliked_ingredients TEXT[] NOT NULL DEFAULT '{}',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_year INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metabolic_sex TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC(6,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activity_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nutrition_goal TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_mode TEXT NOT NULL DEFAULT 'calculated';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disliked_ingredients TEXT[] NOT NULL DEFAULT '{}';

-- Receitas são globais: qualquer utilizador autenticado pode consultá-las.
-- A criação/edição será feita posteriormente por uma API de administração.
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL DEFAULT (auth.user_id()),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  image_url TEXT,
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL,
  taste TEXT NOT NULL DEFAULT 'Salgada' CHECK (taste IN ('Doce', 'Salgada')),
  instructions TEXT NOT NULL DEFAULT '',
  instructions_en TEXT,
  notes TEXT,
  notes_en TEXT,
  prep_minutes INTEGER NOT NULL DEFAULT 0 CHECK (prep_minutes >= 0),
  servings NUMERIC(7,2) NOT NULL DEFAULT 1 CHECK (servings > 0),
  calories NUMERIC(9,2) NOT NULL CHECK (calories >= 0),
  protein NUMERIC(9,2) NOT NULL CHECK (protein >= 0),
  carbs NUMERIC(9,2) NOT NULL CHECK (carbs >= 0),
  fat NUMERIC(9,2) NOT NULL CHECK (fat >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS owner_user_id TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS taste TEXT NOT NULL DEFAULT 'Salgada';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS instructions_en TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS notes_en TEXT;
ALTER TABLE recipes ALTER COLUMN owner_user_id SET DEFAULT (auth.user_id());
ALTER TABLE recipes DROP COLUMN IF EXISTS description;
UPDATE recipes SET category = 'Almoço/Jantar' WHERE category IN ('Almoço', 'Jantar');

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  quantity NUMERIC(9,2),
  unit TEXT,
  is_optional BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS quantity NUMERIC(9,2);
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS is_optional BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE recipe_ingredients SET unit = 'g' WHERE quantity IS NOT NULL AND unit IS NULL;

CREATE TABLE IF NOT EXISTS meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT (auth.user_id()),
  recipe_id UUID NOT NULL REFERENCES recipes(id),
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Pequeno-almoço', 'Almoço', 'Lanche', 'Jantar')),
  portions NUMERIC(7,2) NOT NULL CHECK (portions > 0),
  is_consumed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE meal_entries ADD COLUMN IF NOT EXISTS is_consumed BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS recipe_favorites (
  user_id TEXT NOT NULL DEFAULT (auth.user_id()),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, recipe_id)
);

-- Uma avaliação por utilizador e por receita. O comentário é opcional.
CREATE TABLE IF NOT EXISTS recipe_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT (auth.user_id()),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT (auth.user_id()),
  measured_on DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(6,2) NOT NULL CHECK (weight_kg > 0),
  waist_cm NUMERIC(6,2),
  hip_cm NUMERIC(6,2),
  chest_cm NUMERIC(6,2),
  abdomen_cm NUMERIC(6,2),
  arm_cm NUMERIC(6,2),
  thigh_cm NUMERIC(6,2),
  calf_cm NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, measured_on)
);
ALTER TABLE weight_entries ADD COLUMN IF NOT EXISTS waist_cm NUMERIC(6,2);
ALTER TABLE weight_entries ADD COLUMN IF NOT EXISTS hip_cm NUMERIC(6,2);
ALTER TABLE weight_entries ADD COLUMN IF NOT EXISTS chest_cm NUMERIC(6,2);
ALTER TABLE weight_entries ADD COLUMN IF NOT EXISTS abdomen_cm NUMERIC(6,2);
ALTER TABLE weight_entries ADD COLUMN IF NOT EXISTS arm_cm NUMERIC(6,2);
ALTER TABLE weight_entries ADD COLUMN IF NOT EXISTS thigh_cm NUMERIC(6,2);
ALTER TABLE weight_entries ADD COLUMN IF NOT EXISTS calf_cm NUMERIC(6,2);

CREATE INDEX IF NOT EXISTS recipes_name_idx ON recipes (LOWER(name));
CREATE INDEX IF NOT EXISTS recipe_ingredients_recipe_idx ON recipe_ingredients (recipe_id, position);
CREATE INDEX IF NOT EXISTS meal_entries_user_date_idx ON meal_entries (user_id, meal_date);
CREATE INDEX IF NOT EXISTS recipe_favorites_user_idx ON recipe_favorites (user_id);
CREATE INDEX IF NOT EXISTS recipe_reviews_recipe_idx ON recipe_reviews (recipe_id, created_at DESC);
CREATE INDEX IF NOT EXISTS weight_entries_user_date_idx ON weight_entries (user_id, measured_on);

-- Cria retroativamente o primeiro registo de peso para perfis já existentes.
INSERT INTO weight_entries (user_id, measured_on, weight_kg)
SELECT user_id, created_at::DATE, weight_kg
FROM profiles
WHERE weight_kg IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM weight_entries
    WHERE weight_entries.user_id = profiles.user_id
      AND weight_entries.weight_kg = profiles.weight_kg
  )
ON CONFLICT (user_id, measured_on) DO NOTHING;

-- Row-Level Security: cada utilizador só vê e altera o seu perfil e diário.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_own_rows ON profiles;
DROP POLICY IF EXISTS recipes_authenticated_read ON recipes;
DROP POLICY IF EXISTS recipes_owner_insert ON recipes;
DROP POLICY IF EXISTS recipes_owner_update ON recipes;
DROP POLICY IF EXISTS recipes_owner_delete ON recipes;
DROP POLICY IF EXISTS recipe_ingredients_authenticated_read ON recipe_ingredients;
DROP POLICY IF EXISTS recipe_ingredients_owner_insert ON recipe_ingredients;
DROP POLICY IF EXISTS recipe_ingredients_owner_update ON recipe_ingredients;
DROP POLICY IF EXISTS recipe_ingredients_owner_delete ON recipe_ingredients;
DROP POLICY IF EXISTS meal_entries_own_rows ON meal_entries;
DROP POLICY IF EXISTS recipe_favorites_own_rows ON recipe_favorites;
DROP POLICY IF EXISTS recipe_reviews_authenticated_read ON recipe_reviews;
DROP POLICY IF EXISTS recipe_reviews_own_rows ON recipe_reviews;
DROP POLICY IF EXISTS weight_entries_own_rows ON weight_entries;

CREATE POLICY profiles_own_rows ON profiles
  FOR ALL TO authenticated
  USING ((SELECT auth.user_id()) = user_id)
  WITH CHECK ((SELECT auth.user_id()) = user_id);

CREATE POLICY recipes_authenticated_read ON recipes
  FOR SELECT TO authenticated
  USING (is_public OR owner_user_id = (SELECT auth.user_id()));

CREATE POLICY recipes_owner_insert ON recipes
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = (SELECT auth.user_id()));

CREATE POLICY recipes_owner_update ON recipes
  FOR UPDATE TO authenticated
  USING (owner_user_id = (SELECT auth.user_id()))
  WITH CHECK (owner_user_id = (SELECT auth.user_id()));

CREATE POLICY recipes_owner_delete ON recipes
  FOR DELETE TO authenticated
  USING (owner_user_id = (SELECT auth.user_id()));

CREATE POLICY recipe_ingredients_authenticated_read ON recipe_ingredients
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_id));

CREATE POLICY recipe_ingredients_owner_insert ON recipe_ingredients
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_id AND recipes.owner_user_id = (SELECT auth.user_id())));

CREATE POLICY recipe_ingredients_owner_update ON recipe_ingredients
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_id AND recipes.owner_user_id = (SELECT auth.user_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_id AND recipes.owner_user_id = (SELECT auth.user_id())));

CREATE POLICY recipe_ingredients_owner_delete ON recipe_ingredients
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_id AND recipes.owner_user_id = (SELECT auth.user_id())));

CREATE POLICY meal_entries_own_rows ON meal_entries
  FOR ALL TO authenticated
  USING ((SELECT auth.user_id()) = user_id)
  WITH CHECK ((SELECT auth.user_id()) = user_id);

CREATE POLICY recipe_favorites_own_rows ON recipe_favorites
  FOR ALL TO authenticated
  USING ((SELECT auth.user_id()) = user_id)
  WITH CHECK ((SELECT auth.user_id()) = user_id);

CREATE POLICY recipe_reviews_authenticated_read ON recipe_reviews
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_id));

CREATE POLICY recipe_reviews_own_rows ON recipe_reviews
  FOR ALL TO authenticated
  USING ((SELECT auth.user_id()) = user_id)
  WITH CHECK ((SELECT auth.user_id()) = user_id);

CREATE POLICY weight_entries_own_rows ON weight_entries
  FOR ALL TO authenticated
  USING ((SELECT auth.user_id()) = user_id)
  WITH CHECK ((SELECT auth.user_id()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON recipes, recipe_ingredients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meal_entries TO authenticated;
GRANT SELECT, INSERT, DELETE ON recipe_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON recipe_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON weight_entries TO authenticated;

-- Keep the Data API schema cache in sync after migrations.
NOTIFY pgrst, 'reload schema';
