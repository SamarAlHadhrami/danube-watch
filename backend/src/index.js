import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import express from 'express';
import db from './db/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: db ? 'connected' : 'unavailable' });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
