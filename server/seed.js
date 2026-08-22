import { db } from './db.js';

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + rand() * (max - min);

db.exec('DELETE FROM journal_entries;');
db.exec('DELETE FROM trades;');
db.exec('DELETE FROM accounts;');

const accountResult = db
  .prepare('INSERT INTO accounts (name, broker, starting_balance, currency) VALUES (?, ?, ?, ?)')
  .run('Main Account', 'Demo Broker', 10000, 'USD');
const accountId = Number(accountResult.lastInsertRowid);
const secondAccount = db
  .prepare('INSERT INTO accounts (name, broker, starting_balance, currency) VALUES (?, ?, ?, ?)')
  .run('Crypto Wallet', '', 5000, 'USD');
const cryptoAccountId = Number(secondAccount.lastInsertRowid);

const symbols = [
  { name: 'EURUSD', base: 1.085, decimals: 5 },
  { name: 'GBPUSD', base: 1.272, decimals: 5 },
  { name: 'XAUUSD', base: 2350, decimals: 2 },
  { name: 'BTCUSD', base: 64000, decimals: 1, crypto: true },
  { name: 'ETHUSD', base: 3200, decimals: 2, crypto: true },
  { name: 'AAPL', base: 192, decimals: 2 },
  { name: 'NAS100', base: 18500, decimals: 1 }
];
const strategies = ['Breakout', 'Trend Follow', 'Mean Reversion', 'Support/Resistance', ''];
const notesWin = [
  'Clean setup, followed the plan.',
  'Waited for confirmation candle, entry was textbook.',
  'Took partials at 1R and let the rest run.',
  'Trend continuation play, worked as expected.'
];
const notesLoss = [
  'Entered too early before confirmation.',
  'Stopped out, but risk was managed correctly.',
  'Chased the move, bad entry location.',
  'News spike hit my stop. Avoid trading during releases.'
];

function isoDate(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const insertTrade = db.prepare(
  `INSERT INTO trades
    (account_id, symbol, direction, status, entry_date, exit_date, entry_price,
     exit_price, quantity, stop_loss, take_profit, fees, strategy, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

let tradeCount = 0;
for (let i = 0; i < 46; i++) {
  const sym = pick(symbols);
  const direction = rand() < 0.55 ? 'long' : 'short';
  const isWin = rand() < 0.57;
  const daysAgoEntry = Math.floor(between(1, 175));
  const holdDays = Math.floor(between(0, 6));
  const exitDaysAgo = daysAgoEntry - holdDays;

  const movePct = isWin ? between(0.002, 0.007) : between(-0.004, -0.0015);
  const signedMove = direction === 'long' ? movePct : -movePct;
  const targetUsd = between(70, 320);
  const moveAbs = Math.abs(sym.base * signedMove);
  const quantity = Math.max(1, Math.round((targetUsd / moveAbs) * 100) / 100);

  const drift = between(-0.03, 0.05);
  const entryPrice = +(sym.base * (1 + drift)).toFixed(sym.decimals);
  const exitPriceRaw = entryPrice * (1 + signedMove);
  const exitPrice = +exitPriceRaw.toFixed(sym.decimals);
  const fees = +(between(1, 9)).toFixed(2);

  const slDistance = between(0.003, 0.006);
  const stopLoss =
    direction === 'long'
      ? +(entryPrice * (1 - slDistance)).toFixed(sym.decimals)
      : +(entryPrice * (1 + slDistance)).toFixed(sym.decimals);
  const takeProfit =
    direction === 'long'
      ? +(entryPrice * (1 + slDistance * 1.8)).toFixed(sym.decimals)
      : +(entryPrice * (1 - slDistance * 1.8)).toFixed(sym.decimals);

  const accId = sym.crypto && rand() < 0.7 ? cryptoAccountId : accountId;
  insertTrade.run(
    accId,
    sym.name,
    direction,
    'closed',
    isoDate(daysAgoEntry),
    isoDate(Math.max(exitDaysAgo, daysAgoEntry - 14)),
    entryPrice,
    exitPrice,
    quantity,
    stopLoss,
    takeProfit,
    fees,
    pick(strategies),
    isWin ? pick(notesWin) : pick(notesLoss)
  );
  tradeCount++;
}

for (let i = 0; i < 3; i++) {
  const sym = pick(symbols);
  const direction = rand() < 0.5 ? 'long' : 'short';
  const entryPrice = +(sym.base * (1 + between(-0.02, 0.02))).toFixed(sym.decimals);
  const slDistance = between(0.003, 0.006);
  const daysAgo = Math.floor(between(0, 8));
  const accId = sym.crypto ? cryptoAccountId : accountId;
  insertTrade.run(
    accId,
    sym.name,
    direction,
    'open',
    isoDate(daysAgo),
    null,
    entryPrice,
    null,
    Math.round(between(1, 50)),
    direction === 'long'
      ? +(entryPrice * (1 - slDistance)).toFixed(sym.decimals)
      : +(entryPrice * (1 + slDistance)).toFixed(sym.decimals),
    null,
    +(between(1, 6)).toFixed(2),
    pick(strategies),
    'Position still running.'
  );
  tradeCount++;
}

const insertJournal = db.prepare(
  'INSERT INTO journal_entries (date, title, content, mood) VALUES (?, ?, ?, ?)'
);
insertJournal.run(
  isoDate(30),
  'Monthly review: sticking to the plan',
  'Reviewed all trades from this month. The data confirms that my breakout setups perform far better than counter-trend attempts. Next month: cut the mean reversion size in half and focus only on A+ setups.',
  'Disciplined'
);
insertJournal.run(
  isoDate(21),
  'FOMO almost got me',
  'Saw BTC pumping on the news and nearly jumped in without a plan. Sat on my hands instead and let the setup come to me. The market rewarded patience later in the session.',
  'Focused'
);
insertJournal.run(
  isoDate(12),
  'Risk management note',
  'Reminded myself: never risk more than 1% per trade. Two losses in a row is normal, three means I stop for the day and review screenshots.',
  'Calm'
);
insertJournal.run(
  isoDate(5),
  'Great week overall',
  'Five trades, four winners. The trend-following strategy on gold keeps delivering. Journaling every trade is making patterns obvious.',
  'Confident'
);
insertJournal.run(
  isoDate(1),
  'Plan for next week',
  'Focus symbols: XAUUSD and NAS100. No trades during the first 15 minutes after open. Screenshot every entry and tag the strategy so the analytics stay clean.',
  'Disciplined'
);

console.log(`Seeded ${tradeCount} trades, 2 accounts, 5 journal entries.`);
