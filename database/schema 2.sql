-- Modelo inicial para Neon PostgreSQL.
-- Será aplicado pelo backend/API; nunca diretamente pelo browser.

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  calorie_goal INTEGER NOT NULL DEFAULT 2000,
  protein_goal NUMERIC(7,2) NOT NULL DEFAULT 130,
  carbs_goal NUMERIC(7,2) NOT NULL DEFAULT 230,
  fat_goal NUMERIC(7,2) NOT NULL DEFAULT 65,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recipes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  prep_minutes INTEGER NOT NULL DEFAULT 0,
  servings NUMERIC(7,2) NOT NULL DEFAULT 1,
  calories NUMERIC(9,2) NOT NULL,
  protein NUMERIC(9,2) NOT NULL,
  carbs NUMERIC(9,2) NOT NULL,
  fat NUMERIC(9,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(9,2),
  unit TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE meal_entries (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id),
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Pequeno-almoço', 'Almoço', 'Lanche', 'Jantar')),
  portions NUMERIC(7,2) NOT NULL CHECK (portions > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX recipes_name_idx ON recipes USING btree (LOWER(name));
CREATE INDEX meal_entries_user_date_idx ON meal_entries (user_id, meal_date);
