import { createClient } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remoteUrl = process.env.TURSO_DATABASE_URL;

let localUrl = null;
if (!remoteUrl) {
  const dataDir = path.join(__dirname, 'data');
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch {}
  localUrl = pathToFileURL(path.join(dataDir, 'erp.db')).href;
}

export const db = createClient({
  url: remoteUrl || localUrl,
  authToken: remoteUrl ? process.env.TURSO_AUTH_TOKEN : undefined
});

await db.batch(
  [
    `CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      broker TEXT NOT NULL DEFAULT '',
      starting_balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('long','short')),
      status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open','closed')),
      entry_date TEXT NOT NULL,
      exit_date TEXT,
      entry_price REAL NOT NULL,
      exit_price REAL,
      quantity REAL NOT NULL,
      stop_loss REAL,
      take_profit REAL,
      fees REAL NOT NULL DEFAULT 0,
      strategy TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      mood TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ],
  'write'
);

const accountCount = Number((await db.execute('SELECT COUNT(*) AS c FROM accounts')).rows[0].c);
if (accountCount === 0) {
  await db.execute({
    sql: 'INSERT INTO accounts (name, broker, starting_balance, currency) VALUES (?, ?, ?, ?)',
    args: ['Main Account', '', 10000, 'USD']
  });
}

export const PNL_SQL = `CASE
  WHEN t.status = 'open' OR t.exit_price IS NULL THEN NULL
  WHEN t.direction = 'long' THEN (t.exit_price - t.entry_price) * t.quantity - t.fees
  ELSE (t.entry_price - t.exit_price) * t.quantity - t.fees
END`;

export async function all(sql, args = []) {
  const result = await db.execute({ sql, args });
  return result.rows.map((row) => ({ ...row }));
}

export async function get(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0] ?? null;
}
