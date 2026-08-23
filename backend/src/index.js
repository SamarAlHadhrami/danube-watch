import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import db from './db/index.js';
import { getProducts, getHealthEvents, getLatestSnapshot } from './db/index.js';
import { runAllMonitors } from './scheduler.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: db ? 'connected' : 'unavailable' });
});

// Fire-and-forget: respond immediately, let the run complete in the background
app.post('/api/trigger-run', (_req, res) => {
  res.status(202).json({ message: 'monitor run started' });
  runAllMonitors().catch(err => {
    console.error('[trigger-run] runAllMonitors error:', err.message);
  });
});

// GET /api/products — all products across both collectors, with latest snapshot price
app.get('/api/products', (_req, res) => {
  const products = getProducts(); // no filter → all collectors
  const result = products.map(p => {
    const snap = getLatestSnapshot(p.id);
    return {
      ...p,
      previous_snapshot_price: snap ? snap.price : null,
    };
  });
  res.json(result);
});

// GET /api/health-events?limit=20
app.get('/api/health-events', (req, res) => {
  const limit = req.query.limit != null ? parseInt(req.query.limit, 10) : 20;
  const events = getHealthEvents(limit);
  res.json(events);
});

// GET /api/status — derive overall status from 2 most recent health events
app.get('/api/status', (_req, res) => {
  const recent = getHealthEvents(2);
  const statuses = recent.map(e => e.status);

  let overall;
  if (statuses.includes('escalated')) {
    overall = 'escalated';
  } else if (statuses.some(s => s === 'healing' || s === 'detected')) {
    overall = 'healing';
  } else if (statuses.some(s => s === 'verified' || s === 'recovered')) {
    overall = 'recovered';
  } else {
    overall = 'healthy';
  }

  res.json({ status: overall });
});

// ── Scheduler ──────────────────────────────────────────────────────────────

cron.schedule('*/2 * * * *', async () => {
  try {
    await runAllMonitors();
  } catch (err) {
    console.error('[cron] runAllMonitors error:', err.message);
  }
});

// ── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
