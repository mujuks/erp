import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, PNL_SQL } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const TRADE_SELECT = `SELECT t.*, ${PNL_SQL} AS pnl, a.name AS account_name
  FROM trades t LEFT JOIN accounts a ON a.id = t.account_id`;

function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function validateTrade(body) {
  const errors = [];
  const symbol = String(body.symbol || '').trim().toUpperCase();
  const direction = body.direction === 'short' ? 'short' : 'long';
  const status = body.status === 'open' ? 'open' : 'closed';
  const accountId = num(body.account_id);
  const entryDate = String(body.entry_date || '').trim();
  const exitDate = String(body.exit_date || '').trim() || null;
  const entryPrice = num(body.entry_price);
  const exitPrice = num(body.exit_price);
  const quantity = num(body.quantity);
  const stopLoss = num(body.stop_loss);
  const takeProfit = num(body.take_profit);
  const fees = num(body.fees) ?? 0;

  if (!symbol) errors.push('Symbol is required');
  if (!entryDate) errors.push('Entry date is required');
  if (entryPrice === null || Number.isNaN(entryPrice) || entryPrice <= 0)
    errors.push('Entry price must be a positive number');
  if (quantity === null || Number.isNaN(quantity) || quantity <= 0)
    errors.push('Quantity must be a positive number');
  if (status === 'closed') {
    if (!exitDate) errors.push('Exit date is required for closed trades');
    if (exitPrice === null || Number.isNaN(exitPrice) || exitPrice <= 0)
      errors.push('Exit price is required for closed trades');
  }
  if ([stopLoss, takeProfit].some((v) => v !== null && (Number.isNaN(v) || v <= 0)))
    errors.push('Stop loss / take profit must be positive numbers');
  if (Number.isNaN(fees)) errors.push('Fees must be a number');

  return {
    errors,
    values: {
      account_id: accountId && !Number.isNaN(accountId) ? accountId : null,
      symbol,
      direction,
      status,
      entry_date: entryDate,
      exit_date: status === 'closed' ? exitDate : null,
      entry_price: entryPrice,
      exit_price: status === 'closed' ? exitPrice : null,
      quantity,
      stop_loss: stopLoss ?? null,
      take_profit: takeProfit ?? null,
      fees: fees || 0,
      strategy: String(body.strategy || '').trim(),
      notes: String(body.notes || '').trim()
    }
  };
}

app.get('/api/accounts', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT a.id, a.name, a.broker, a.starting_balance, a.currency, a.created_at,
        COALESCE(SUM(CASE WHEN t.status = 'closed' THEN ${PNL_SQL} END), 0) AS realized_pnl,
        COUNT(t.id) AS trade_count
       FROM accounts a LEFT JOIN trades t ON t.account_id = a.id
       GROUP BY a.id ORDER BY a.id`
    )
    .all();
  res.json(
    rows.map((r) => ({ ...r, balance: r.starting_balance + r.realized_pnl }))
  );
});

app.post('/api/accounts', (req, res) => {
  const name = String(req.body.name || '').trim();
  const broker = String(req.body.broker || '').trim();
  const startingBalance = num(req.body.starting_balance);
  if (!name) return res.status(400).json({ error: 'Account name is required' });
  const balance = startingBalance === null || Number.isNaN(startingBalance) ? 0 : startingBalance;
  const result = db
    .prepare('INSERT INTO accounts (name, broker, starting_balance) VALUES (?, ?, ?)')
    .run(name, broker, balance);
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

app.delete('/api/accounts/:id', (req, res) => {
  const id = Number(req.params.id);
  const used = db.prepare('SELECT COUNT(*) AS c FROM trades WHERE account_id = ?').get(id).c;
  if (used > 0)
    return res.status(400).json({ error: 'Cannot delete an account that has trades' });
  const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Account not found' });
  res.status(204).end();
});

app.get('/api/trades', (req, res) => {
  const clauses = [];
  const params = [];
  if (req.query.status) {
    clauses.push('t.status = ?');
    params.push(req.query.status);
  }
  if (req.query.account_id) {
    clauses.push('t.account_id = ?');
    params.push(Number(req.query.account_id));
  }
  if (req.query.symbol) {
    clauses.push('t.symbol LIKE ?');
    params.push(`%${String(req.query.symbol).toUpperCase()}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(`${TRADE_SELECT} ${where} ORDER BY t.entry_date DESC, t.id DESC`)
    .all(...params);
  res.json(rows);
});

app.post('/api/trades', (req, res) => {
  const { errors, values } = validateTrade(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  const result = db
    .prepare(
      `INSERT INTO trades
        (account_id, symbol, direction, status, entry_date, exit_date, entry_price,
         exit_price, quantity, stop_loss, take_profit, fees, strategy, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      values.account_id,
      values.symbol,
      values.direction,
      values.status,
      values.entry_date,
      values.exit_date,
      values.entry_price,
      values.exit_price,
      values.quantity,
      values.stop_loss,
      values.take_profit,
      values.fees,
      values.strategy,
      values.notes
    );
  const created = db.prepare(`${TRADE_SELECT} WHERE t.id = ?`).get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.put('/api/trades/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM trades WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Trade not found' });
  const { errors, values } = validateTrade(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  db.prepare(
    `UPDATE trades SET
      account_id = ?, symbol = ?, direction = ?, status = ?, entry_date = ?, exit_date = ?,
      entry_price = ?, exit_price = ?, quantity = ?, stop_loss = ?, take_profit = ?,
      fees = ?, strategy = ?, notes = ?
     WHERE id = ?`
  ).run(
    values.account_id,
    values.symbol,
    values.direction,
    values.status,
    values.entry_date,
    values.exit_date,
    values.entry_price,
    values.exit_price,
    values.quantity,
    values.stop_loss,
    values.take_profit,
    values.fees,
    values.strategy,
    values.notes,
    id
  );
  const updated = db.prepare(`${TRADE_SELECT} WHERE t.id = ?`).get(id);
  res.json(updated);
});

app.delete('/api/trades/:id', (req, res) => {
  const result = db.prepare('DELETE FROM trades WHERE id = ?').run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Trade not found' });
  res.status(204).end();
});

app.get('/api/stats', (req, res) => {
  let where = '';
  const params = [];
  const accId = req.query.account_id;
  if (accId && accId !== 'all') {
    where = ' AND t.account_id = ?';
    params.push(Number(accId));
  }
  const all = db
    .prepare(`SELECT t.*, ${PNL_SQL} AS pnl FROM trades t WHERE 1=1 ${where}`)
    .all(...params);

  const closed = all.filter((t) => t.status === 'closed' && t.pnl !== null);
  const open = all.filter((t) => t.status !== 'closed');

  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl < 0);
  const netPnl = closed.reduce((s, t) => s + t.pnl, 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const decided = wins.length + losses.length;

  const summary = {
    total_trades: all.length,
    closed_trades: closed.length,
    open_trades: open.length,
    wins: wins.length,
    losses: losses.length,
    win_rate: decided ? (wins.length / decided) * 100 : 0,
    net_pnl: netPnl,
    gross_profit: grossProfit,
    gross_loss: grossLoss,
    profit_factor: grossLoss > 0 ? grossProfit / grossLoss : null,
    avg_win: avgWin,
    avg_loss: avgLoss,
    expectancy: closed.length ? netPnl / closed.length : 0,
    biggest_win: wins.length ? Math.max(...wins.map((t) => t.pnl)) : 0,
    biggest_loss: losses.length ? Math.min(...losses.map((t) => t.pnl)) : 0
  };

  const sortedClosed = [...closed].sort((a, b) => {
    const da = a.exit_date || a.entry_date;
    const dbb = b.exit_date || b.entry_date;
    return da < dbb ? -1 : da > dbb ? 1 : a.id - b.id;
  });
  let cum = 0;
  const equityCurve = sortedClosed.map((t) => {
    cum += t.pnl;
    return { date: t.exit_date || t.entry_date, pnl: t.pnl, equity: cum };
  });

  const groupBy = (list, keyFn) => {
    const map = new Map();
    for (const t of list) {
      const key = keyFn(t);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return map;
  };

  const buildStats = (map) =>
    [...map.entries()].map(([key, list]) => {
      const w = list.filter((t) => t.pnl > 0).length;
      const l = list.filter((t) => t.pnl < 0).length;
      return {
        key,
        trades: list.length,
        wins: w,
        losses: l,
        win_rate: w + l ? (w / (w + l)) * 100 : 0,
        net_pnl: list.reduce((s, t) => s + t.pnl, 0)
      };
    });

  const monthly = buildStats(groupBy(sortedClosed, (t) => (t.exit_date || t.entry_date).slice(0, 7)));
  const bySymbol = buildStats(groupBy(closed, (t) => t.symbol));
  const byStrategy = buildStats(groupBy(closed.filter((t) => t.strategy), (t) => t.strategy));
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const byWeekday = buildStats(
    groupBy(closed, (t) => weekdayNames[new Date(`${t.exit_date || t.entry_date}T00:00:00`).getDay()])
  );
  const byDirection = ['long', 'short'].map((dir) => {
    const list = closed.filter((t) => t.direction === dir);
    const w = list.filter((t) => t.pnl > 0).length;
    return {
      key: dir,
      trades: list.length,
      wins: w,
      losses: list.length - w,
      win_rate: list.length ? (w / list.length) * 100 : 0,
      net_pnl: list.reduce((s, t) => s + t.pnl, 0)
    };
  });

  const topWins = [...closed].sort((a, b) => b.pnl - a.pnl).slice(0, 5);
  const topLosses = [...closed].sort((a, b) => a.pnl - b.pnl).slice(0, 5);
  const recentTrades = [...sortedClosed].reverse().slice(0, 8);

  res.json({
    summary,
    equity_curve: equityCurve,
    monthly,
    by_symbol: bySymbol.sort((a, b) => b.net_pnl - a.net_pnl),
    by_strategy: byStrategy.sort((a, b) => b.net_pnl - a.net_pnl),
    by_weekday: byWeekday,
    by_direction: byDirection,
    top_wins: topWins,
    top_losses: topLosses,
    recent_trades: recentTrades,
    open_trades: open
  });
});

app.get('/api/journal', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM journal_entries ORDER BY date DESC, id DESC')
    .all();
  res.json(rows);
});

app.post('/api/journal', (req, res) => {
  const title = String(req.body.title || '').trim();
  const date = String(req.body.date || '').trim();
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!date) return res.status(400).json({ error: 'Date is required' });
  const result = db
    .prepare('INSERT INTO journal_entries (date, title, content, mood) VALUES (?, ?, ?, ?)')
    .run(date, title, String(req.body.content || ''), String(req.body.mood || ''));
  const created = db
    .prepare('SELECT * FROM journal_entries WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.put('/api/journal/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM journal_entries WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Entry not found' });
  const title = String(req.body.title || '').trim();
  const date = String(req.body.date || '').trim();
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!date) return res.status(400).json({ error: 'Date is required' });
  db.prepare('UPDATE journal_entries SET date = ?, title = ?, content = ?, mood = ? WHERE id = ?').run(
    date,
    title,
    String(req.body.content || ''),
    String(req.body.mood || ''),
    id
  );
  res.json(db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id));
});

app.delete('/api/journal/:id', (req, res) => {
  const result = db.prepare('DELETE FROM journal_entries WHERE id = ?').run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Entry not found' });
  res.status(204).end();
});

const distDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Trading ERP running on http://localhost:${PORT}`));
