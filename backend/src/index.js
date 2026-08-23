import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import express from 'express';
import cron from 'node-cron';
import db from './db/index.js';
import { runAllMonitors } from './scheduler.js';

const app = express();
const PORT = process.env.PORT || 3001;

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
