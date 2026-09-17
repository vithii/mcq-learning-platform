import { createClient, Client, InStatement } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { SCHEMA_SQL } from './schemaSql';

const isServerless = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const defaultDbPath = isServerless ? '/tmp/mcq_platform.db' : path.resolve(__dirname, '../../mcq_platform.db');
const DB_PATH = process.env.DB_PATH || defaultDbPath;

const client: Client = createClient({
  url: `file:${DB_PATH}`,
});

export const db = client;

/**
 * Initialize schema and enable WAL mode & foreign keys
 */
export async function initDatabase(): Promise<void> {
  let schemaSql = SCHEMA_SQL;
  try {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      schemaSql = fs.readFileSync(schemaPath, 'utf8');
    }
  } catch {
    // Use bundled SCHEMA_SQL fallback
  }

  // Remove comments from the SQL string
  const cleanSql = schemaSql
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove /* */
    .replace(/--.*$/gm, '');          // remove -- comments

  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (err) {
      console.error('Error executing schema statement:', statement, err);
      throw err;
    }
  }

  // Ensure WAL mode
  await client.execute('PRAGMA journal_mode = WAL;');
  await client.execute('PRAGMA foreign_keys = ON;');
  console.log('Database initialized successfully at:', DB_PATH);
}

/**
 * Helper to fetch a single row
 */
export async function queryOne<T = any>(sql: string, args: any[] = []): Promise<T | null> {
  const result = await client.execute({ sql, args });
  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as T;
}

/**
 * Helper to fetch all rows
 */
export async function queryAll<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  const result = await client.execute({ sql, args });
  return result.rows as unknown as T[];
}

/**
 * Helper to execute a command
 */
export async function execute(sql: string, args: any[] = []) {
  return await client.execute({ sql, args });
}

/**
 * Execute multiple statements in a transaction
 */
export async function batch(statements: InStatement[]) {
  return await client.batch(statements, 'write');
}
