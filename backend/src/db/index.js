import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH
  ? process.env.DATABASE_PATH
  : join(__dirname, '../../../data/danube.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  DROP TABLE IF EXISTS health_events;
  DROP TABLE IF EXISTS snapshots;
  DROP TABLE IF EXISTS products;

  CREATE TABLE products (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    collector_id   TEXT    NOT NULL,
    title          TEXT    NOT NULL,
    current_price  REAL,
    original_price REAL,
    discount_pct   REAL,
    category       TEXT,
    availability   TEXT,
    url            TEXT,
    last_seen      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE snapshots (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id   INTEGER NOT NULL REFERENCES products(id),
    price        REAL    NOT NULL,
    discount_pct REAL,
    captured_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE health_events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    collector_id TEXT NOT NULL,
    status       TEXT NOT NULL,
    message      TEXT NOT NULL,
    timestamp    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;
