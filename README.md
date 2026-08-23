# Danube Watch

An autonomous, self-healing price and discount monitor for Danube Home Oman, built with Bright Data Scraper Studio for the Into the Scrape-Verse hackathon.

---

## The Problem

Web scrapers silently break when a target site's layout changes, and by the time anyone notices, the data has already been wrong for a while. Danube Watch solves this by making the scraper self-diagnosing and self-repairing.

---

## What It Does

- Scrapes live product data (title, price, original price, discount %) from Danube Home Oman's hardware category using a custom Bright Data Scraper Studio collector
- Runs on a schedule, validates every scrape for anomalies (missing fields, sudden row-count drops)
- When validation fails, automatically calls Bright Data's self-heal capability (`bdata scraper heal --auto-approve --auto-save`) — no human approval step
- Re-verifies the healed collector before trusting new data
- Displays everything on a live dashboard: monitored products, system health status, and a real-time event timeline

---

## Architecture

```
Danube Home (real) ─┐
                     ├──> Bright Data Scraper Studio (2 collectors)
Mock demo site ──────┘              │
                                     ▼
                        Node.js backend (CLI wrapper + scheduler)
                                     │
                        Validation/anomaly detection
                                     │
                        Auto-heal trigger (on failure)
                                     │
                        Verify → SQLite (products, snapshots, health_events)
                                     │
                        REST API ──> React + shadcn/ui dashboard
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js, Express, `node:sqlite` (built-in, no native dependencies), node-cron |
| **Frontend** | React, Vite, TypeScript, Tailwind CSS, shadcn/ui, lucide-react |
| **Data source** | Bright Data Scraper Studio (CLI-driven) |

---

## How We Use Bright Data Scraper Studio

Two collectors were created via `npx -p @brightdata/cli bdata scraper create` — one targeting the real Danube Home hardware-tools category page (returns 100+ live products in batch mode), and one targeting a self-hosted demo page for reliably demonstrating the self-heal cycle.

The backend wraps the CLI's `run` and `heal` subcommands programmatically in [`backend/src/cli/bdata.js`](backend/src/cli/bdata.js), calling heal automatically — not manually — whenever the validation layer detects a problem. The heal prompt, the re-run, and the pass/fail verdict all happen inside the scheduler without any human in the loop.

For the demo, we deliberately broke our own demo site's page structure (empty price fields) to trigger the failure → heal → recovery cycle live. The Bright Data server-side heal lock we hit along the way (a stuck refactor job on the platform) was resolved by creating a fresh collector, which itself demonstrated the end-to-end flow. Both are documented in the demo video.

---

## Example Output

See [`example-output.json`](example-output.json) for a real sample of 4 products returned by the Danube Home collector, including fields for `title`, `current_price`, `original_price`, and `discount_pct` (null when no discount applies).

---

## Setup & Run

```bash
git clone https://github.com/SamarAlHadhrami/danube-watch.git
cd danube-watch
```

**Backend**

```bash
cd backend
npm install
cp ../.env.example ../.env
# Add your Bright Data collector IDs to .env (see below)
node src/index.js
```

**Frontend** (separate terminal)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

**`.env` variables required:**

```
PORT=3001
DATABASE_PATH=./data/danube.db

DANUBE_COLLECTOR_ID=   # from: bdata scraper create "<danube-url>" "<description>"
DANUBE_URL=            # the target URL you passed to scraper create

MOCK_COLLECTOR_ID=     # optional second collector for demo/testing
MOCK_URL=              # its target URL
```

Collector IDs are created by running `bdata scraper create` against your own targets. You need a [Bright Data account](https://brightdata.com) and the CLI (`npm i -g @brightdata/cli`) authenticated via `bdata auth`.

---

## Known Limitations

The self-heal capability works reliably for moderate structural changes — renamed CSS classes, moved elements, changed selectors. A very aggressive break (all text content removed while class names remain intact) can escalate rather than auto-recover, because the validation correctly identifies that titles and prices are all null and flags it as unrecoverable after one heal attempt. That is correct behavior: the system reports and escalates rather than silently accepting bad data.

We also hit a Bright Data server-side heal lock (HTTP 409, a stuck refactor job on the platform), which blocked subsequent heal attempts on the same collector. The workaround was creating a fresh collector — which is straightforward but worth knowing about if you hit it.

---

## AI Tool Disclosure

This project was built with Claude Code as a coding assistant, under direct human review and direction at every step. Every architectural decision, prompt, and verification step was made and checked by the developer. All code was reviewed before commit.

---

## Demo Video

https://youtu.be/GeZWm6rU_vA

---

## License

MIT
