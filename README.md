# TradeDesk ERP — Trading Journal & Analytics

A local-first ERP system for your financial markets trading journey (stocks, forex, crypto).
React frontend + Express API + SQLite database — everything runs on your machine.

## Features

- **Dashboard** — Net P&L, win rate, profit factor, equity curve, monthly P&L chart, open positions
- **Trades** — Full CRUD with filters/search, long/short support, stop loss / take profit / fees tracking, open & closed statuses, multi-account support
- **Journal** — Daily trading journal entries with mood tagging
- **Analytics** — Breakdowns by symbol, direction, weekday, strategy; best/worst trades

## Getting Started

```bash
npm install
npm run seed
npm run dev
```

Then open **http://localhost:5173** in your browser.

- `npm run dev` starts the API server (port 3001) and the web app (port 5173) together.
- `npm run seed` loads ~49 demo trades + journal entries so you can explore immediately.

## Managing Your Data

- The SQLite database lives at `server/data/erp.db` (auto-created on first run).
- Delete the demo data: stop the app, delete `server/data/erp.db`, restart.
- Back up by copying `server/data/erp.db` anywhere safe.

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React 18 + Vite + Recharts          |
| Backend  | Node.js + Express                   |
| Database | SQLite (built-in `node:sqlite`)     |

## Project Structure

```
server/
  index.js   Express API (trades, accounts, journal, stats)
  db.js      SQLite schema + connection
  seed.js    Demo data generator
client/
  src/
    pages/       Dashboard, Trades, Journal, Analytics
    components/  Modal, StatCard, TradeForm, AccountsModal
```
