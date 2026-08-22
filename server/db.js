import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'erp.db'));

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  broker TEXT NOT NULL DEFAULT '',
  starting_balance REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trades (
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
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  mood TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

const accountCount = db.prepare('SELECT COUNT(*) AS c FROM accounts').get().c;
if (accountCount === 0) {
  db.prepare(
    'INSERT INTO accounts (name, broker, starting_balance, currency) VALUES (?, ?, ?, ?)'
  ).run('Main Account', '', 10000, 'USD');
}

export const PNL_SQL = `CASE
  WHEN t.status = 'open' OR t.exit_price IS NULL THEN NULL
  WHEN t.direction = 'long' THEN (t.exit_price - t.entry_price) * t.quantity - t.fees
  ELSE (t.entry_price - t.exit_price) * t.quantity - t.fees
END`;
