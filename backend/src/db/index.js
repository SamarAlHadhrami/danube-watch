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

// ── Prepared statements ────────────────────────────────────────────────────

const stmtFindProduct = db.prepare(`
  SELECT id FROM products
  WHERE collector_id = ? AND title = ?
  LIMIT 1
`);

const stmtInsertProduct = db.prepare(`
  INSERT INTO products (collector_id, title, current_price, original_price, discount_pct, url, last_seen)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
`);

const stmtUpdateProduct = db.prepare(`
  UPDATE products
  SET current_price  = ?,
      original_price = ?,
      discount_pct   = ?,
      url            = ?,
      last_seen      = datetime('now')
  WHERE id = ?
`);

const stmtInsertSnapshot = db.prepare(`
  INSERT INTO snapshots (product_id, price, discount_pct, captured_at)
  VALUES (?, ?, ?, datetime('now'))
`);

const stmtInsertHealthEvent = db.prepare(`
  INSERT INTO health_events (collector_id, status, message, timestamp)
  VALUES (?, ?, ?, datetime('now'))
`);

// ── normalizeResults ───────────────────────────────────────────────────────
// Accepts the raw array returned by `bdata scraper run --pretty` (either
// flat or nested shape) and returns a flat array of plain product objects.
//
// Flat shape:   [{title, current_price, original_price?, discount_pct?, product_page_url?}, ...]
// Nested shape: [{ products: [...], product_page_url, input }]

export function normalizeResults(rawResult, collectorId) {
  if (!Array.isArray(rawResult) || rawResult.length === 0) return [];

  const first = rawResult[0];

  // Detect nested shape: first element has a "products" array key
  const isNested = Array.isArray(first?.products);

  const items = isNested
    ? first.products.map(item => ({
        ...item,
        // Fall back to the outer product_page_url only when the item lacks one
        product_page_url: item.product_page_url ?? first.product_page_url ?? null,
      }))
    : rawResult;

  return items.map(item => ({
    title:          item.title          ?? null,
    current_price:  item.current_price  ?? null,
    original_price: item.original_price ?? null,
    discount_pct:   item.discount_pct   ?? null,
    url:            item.product_page_url ?? null,
    collector_id:   collectorId,
  }));
}

// ── upsertProducts ─────────────────────────────────────────────────────────
// Inserts or updates each product (keyed on collector_id + title) and always
// appends a new snapshot row to build price history over time.

export function upsertProducts(products) {
  for (const p of products) {
    const existing = stmtFindProduct.get(p.collector_id, p.title);

    let productId;
    if (existing) {
      stmtUpdateProduct.run(
        p.current_price,
        p.original_price,
        p.discount_pct,
        p.url,
        existing.id,
      );
      productId = existing.id;
    } else {
      const result = stmtInsertProduct.run(
        p.collector_id,
        p.title,
        p.current_price,
        p.original_price,
        p.discount_pct,
        p.url,
      );
      productId = result.lastInsertRowid;
    }

    // Always record a snapshot for price-history tracking
    stmtInsertSnapshot.run(productId, p.current_price, p.discount_pct);
  }
}

// ── insertHealthEvent ──────────────────────────────────────────────────────

export function insertHealthEvent(collectorId, status, message) {
  stmtInsertHealthEvent.run(collectorId, status, message);
}

// ── getProducts ────────────────────────────────────────────────────────────

export function getProducts(collectorId) {
  if (collectorId) {
    return db.prepare('SELECT * FROM products WHERE collector_id = ? ORDER BY last_seen DESC').all(collectorId);
  }
  return db.prepare('SELECT * FROM products ORDER BY last_seen DESC').all();
}

// ── getHealthEvents ────────────────────────────────────────────────────────

export function getHealthEvents(collectorId) {
  if (collectorId) {
    return db.prepare('SELECT * FROM health_events WHERE collector_id = ? ORDER BY timestamp DESC').all(collectorId);
  }
  return db.prepare('SELECT * FROM health_events ORDER BY timestamp DESC').all();
}

export default db;
