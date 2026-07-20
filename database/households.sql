-- Run once in Neon to enable shared household stock.
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL DEFAULT (auth.user_id()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS household_members (
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL DEFAULT (auth.user_id()),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (household_id, user_id),
  UNIQUE (user_id)
);

ALTER TABLE pantry_items ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS households_member_read ON households;
DROP POLICY IF EXISTS household_members_own_rows ON household_members;
DROP POLICY IF EXISTS pantry_items_own_rows ON pantry_items;
DROP POLICY IF EXISTS pantry_items_member_rows ON pantry_items;

CREATE POLICY households_member_read ON households FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = households.id AND household_members.user_id = (SELECT auth.user_id())));

CREATE POLICY household_members_own_rows ON household_members FOR SELECT TO authenticated
  USING ((SELECT auth.user_id()) = user_id);

CREATE POLICY pantry_items_member_rows ON pantry_items FOR ALL TO authenticated
  USING ((household_id IS NULL AND (SELECT auth.user_id()) = user_id) OR household_id IN (SELECT household_id FROM household_members WHERE user_id = (SELECT auth.user_id())))
  WITH CHECK ((household_id IS NULL AND (SELECT auth.user_id()) = user_id) OR household_id IN (SELECT household_id FROM household_members WHERE user_id = (SELECT auth.user_id())));

GRANT SELECT ON households, household_members TO authenticated;

CREATE OR REPLACE FUNCTION create_household(p_name TEXT)
RETURNS TABLE(id UUID, name TEXT, invite_code TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE household_row households; current_user_id TEXT := auth.user_id();
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF EXISTS (SELECT 1 FROM household_members WHERE user_id = current_user_id) THEN RAISE EXCEPTION 'Já pertences a um agregado'; END IF;
  INSERT INTO households (name, invite_code, created_by) VALUES (COALESCE(NULLIF(trim(p_name), ''), 'O meu agregado'), upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), current_user_id) RETURNING * INTO household_row;
  INSERT INTO household_members (household_id, user_id) VALUES (household_row.id, current_user_id);
  UPDATE pantry_items SET household_id = household_row.id WHERE user_id = current_user_id AND household_id IS NULL;
  RETURN QUERY SELECT household_row.id, household_row.name, household_row.invite_code;
END;
$$;

CREATE OR REPLACE FUNCTION join_household(p_invite_code TEXT)
RETURNS TABLE(id UUID, name TEXT, invite_code TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE household_row households; current_user_id TEXT := auth.user_id();
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF EXISTS (SELECT 1 FROM household_members WHERE user_id = current_user_id) THEN RAISE EXCEPTION 'Já pertences a um agregado'; END IF;
  SELECT * INTO household_row FROM households WHERE invite_code = upper(trim(p_invite_code));
  IF household_row.id IS NULL THEN RAISE EXCEPTION 'Código de convite inválido'; END IF;
  INSERT INTO household_members (household_id, user_id) VALUES (household_row.id, current_user_id);
  UPDATE pantry_items SET household_id = household_row.id WHERE user_id = current_user_id AND household_id IS NULL;
  RETURN QUERY SELECT household_row.id, household_row.name, household_row.invite_code;
END;
$$;

GRANT EXECUTE ON FUNCTION create_household(TEXT), join_household(TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
