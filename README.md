# Danube Watch

Real-time Danube River monitoring dashboard. Hackathon project.

## Structure

| Directory | Stack |
|-----------|-------|
| `backend/` | Node.js + Express + better-sqlite3 + node-cron |
| `frontend/` | Vite + React + TypeScript + Tailwind + shadcn/ui |
| `mock-site/` | Plain HTML/CSS static site |

## Getting started

### Backend
```bash
cd backend
npm install
cp ../.env.example ../.env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Mock site
Open `mock-site/index.html` directly in a browser.
