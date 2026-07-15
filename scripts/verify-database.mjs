import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL não está configurada');

const databaseUrl = new URL(connectionString);
if (databaseUrl.searchParams.get('sslmode') === 'require') {
  databaseUrl.searchParams.set('sslmode', 'verify-full');
}

const client = new pg.Client({ connectionString: databaseUrl.toString() });

try {
  await client.connect();
  const tables = await client.query(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'recipes', 'recipe_ingredients', 'meal_entries')
    ORDER BY tablename
  `);
  const policies = await client.query(`
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'recipes', 'recipe_ingredients', 'meal_entries')
    ORDER BY tablename, policyname
  `);

  console.log('Tabelas:', tables.rows);
  console.log('Políticas:', policies.rows);

  if (tables.rowCount !== 4 || tables.rows.some((table) => !table.rowsecurity) || policies.rowCount !== 4) {
    throw new Error('A estrutura ou as políticas RLS estão incompletas');
  }
} finally {
  await client.end();
}
