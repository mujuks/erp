import { useState } from 'react';
import { api } from '../api.js';
import { todayISO, computePnl, fmtSignedMoney } from '../utils.js';

const emptyForm = (accountId) => ({
  account_id: accountId || '',
  symbol: '',
  direction: 'long',
  status: 'closed',
  entry_date: todayISO(),
  exit_date: todayISO(),
  entry_price: '',
  exit_price: '',
  quantity: '',
  stop_loss: '',
  take_profit: '',
  fees: '',
  strategy: '',
  notes: ''
});

export default function TradeForm({ initial, accounts, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    if (!initial) return emptyForm(accounts[0]?.id);
    return {
      account_id: initial.account_id ?? accounts[0]?.id ?? '',
      symbol: initial.symbol || '',
      direction: initial.direction || 'long',
      status: initial.status || 'closed',
      entry_date: initial.entry_date ? initial.entry_date.slice(0, 10) : todayISO(),
      exit_date: initial.exit_date ? initial.exit_date.slice(0, 10) : todayISO(),
      entry_price: initial.entry_price ?? '',
      exit_price: initial.exit_price ?? '',
      quantity: initial.quantity ?? '',
      stop_loss: initial.stop_loss ?? '',
      take_profit: initial.take_profit ?? '',
      fees: initial.fees ?? '',
      strategy: initial.strategy || '',
      notes: initial.notes || ''
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const preview = computePnl({
    ...form,
    entry_price: Number(form.entry_price),
    exit_price: Number(form.exit_price),
    quantity: Number(form.quantity),
    fees: Number(form.fees || 0)
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (initial) await api.put(`/api/trades/${initial.id}`, payload);
      else await api.post('/api/trades', payload);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="trade-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          Account
          <select value={form.account_id} onChange={set('account_id')}>
            <option value="">No account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Symbol *
          <input
            value={form.symbol}
            onChange={(e) => set('symbol')(e)}
            placeholder="EURUSD, BTCUSD…"
            required
          />
        </label>
        <label>
          Direction
          <select value={form.direction} onChange={set('direction')}>
            <option value="long">Long (Buy)</option>
            <option value="short">Short (Sell)</option>
          </select>
        </label>
        <label>
          Status
          <select value={form.status} onChange={set('status')}>
            <option value="closed">Closed</option>
            <option value="open">Open</option>
          </select>
        </label>
        <label>
          Entry Date *
          <input type="date" value={form.entry_date} onChange={set('entry_date')} required />
        </label>
        <label>
          Exit Date {form.status === 'closed' && '*'}
          <input
            type="date"
            value={form.exit_date}
            onChange={set('exit_date')}
            disabled={form.status === 'open'}
            required={form.status === 'closed'}
          />
        </label>
        <label>
          Entry Price *
          <input
            type="number"
            step="any"
            min="0"
            value={form.entry_price}
            onChange={set('entry_price')}
            required
          />
        </label>
        <label>
          Exit Price {form.status === 'closed' && '*'}
          <input
            type="number"
            step="any"
            min="0"
            value={form.exit_price}
            onChange={set('exit_price')}
            disabled={form.status === 'open'}
            required={form.status === 'closed'}
          />
        </label>
        <label>
          Quantity / Lots *
          <input
            type="number"
            step="any"
            min="0"
            value={form.quantity}
            onChange={set('quantity')}
            required
          />
        </label>
        <label>
          Stop Loss
          <input type="number" step="any" min="0" value={form.stop_loss} onChange={set('stop_loss')} />
        </label>
        <label>
          Take Profit
          <input
            type="number"
            step="any"
            min="0"
            value={form.take_profit}
            onChange={set('take_profit')}
          />
        </label>
        <label>
          Fees / Commission
          <input type="number" step="any" min="0" value={form.fees} onChange={set('fees')} />
        </label>
        <label>
          Strategy
          <input
            value={form.strategy}
            onChange={set('strategy')}
            placeholder="Breakout, Trend Follow…"
          />
        </label>
        <label className="span-2">
          Notes
          <textarea rows={2} value={form.notes} onChange={set('notes')} />
        </label>
      </div>

      {form.status === 'closed' && preview !== null && (
        <div className={`pnl-preview ${preview >= 0 ? 'pos' : 'neg'}`}>
          Estimated P&L: {fmtSignedMoney(preview)}
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Update Trade' : 'Add Trade'}
        </button>
      </div>
    </form>
  );
}
