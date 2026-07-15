import { readFile } from 'node:fs/promises';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL não está configurada');

const databaseUrl = new URL(connectionString);
if (databaseUrl.searchParams.get('sslmode') === 'require') {
  databaseUrl.searchParams.set('sslmode', 'verify-full');
}

const sql = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
const client = new pg.Client({ connectionString: databaseUrl.toString() });

try {
  await client.connect();
  await client.query('BEGIN');
  await client.query(sql);
  await client.query('COMMIT');
  console.log('Migração concluída com sucesso.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  console.error('A migração falhou:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
