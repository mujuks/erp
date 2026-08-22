export function fmtMoney(value, opts = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts
  }).format(Math.abs(value));
  return value < 0 ? `-${formatted}` : formatted;
}

export function fmtSignedMoney(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value > 0 ? '+' : ''}${fmtMoney(value)}`;
}

export function fmtNum(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function fmtPct(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtMonth(ym) {
  if (!ym || ym.length < 7) return ym;
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit'
  });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function pnlClass(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return value > 0 ? 'pos' : value < 0 ? 'neg' : '';
}

export function computePnl(trade) {
  if (!trade.entry_price || !trade.exit_price || !trade.quantity) return null;
  const raw =
    trade.direction === 'long'
      ? (trade.exit_price - trade.entry_price) * trade.quantity
      : (trade.entry_price - trade.exit_price) * trade.quantity;
  return raw - (trade.fees || 0);
}
