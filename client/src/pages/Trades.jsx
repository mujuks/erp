import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import Modal from '../components/Modal.jsx';
import TradeForm from '../components/TradeForm.jsx';
import AccountsModal from '../components/AccountsModal.jsx';
import { fmtMoney, fmtSignedMoney, fmtNum, fmtDate, pnlClass } from '../utils.js';

export default function Trades() {
  const [trades, setTrades] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dirFilter, setDirFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [showAccounts, setShowAccounts] = useState(false);

  async function load() {
    const [t, a] = await Promise.all([api.get('/api/trades'), api.get('/api/accounts')]);
    setTrades(t);
    setAccounts(a);
  }

  useEffect(() => {
    load().catch((e) => setTrades([]) || console.error(e));
  }, []);

  const filtered = useMemo(() => {
    if (!trades) return [];
    const q = search.trim().toLowerCase();
    return trades.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (dirFilter !== 'all' && t.direction !== dirFilter) return false;
      if (accountFilter !== 'all' && String(t.account_id) !== accountFilter) return false;
      if (q) {
        const haystack = `${t.symbol} ${t.strategy} ${t.notes}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [trades, search, statusFilter, dirFilter, accountFilter]);

  async function removeTrade(id) {
    if (!confirm('Delete this trade?')) return;
    await api.del(`/api/trades/${id}`);
    load();
  }

  async function closeTrade(t) {
    setEditing({ ...t, status: 'closed', _forceClosed: true });
  }

  if (!trades) return <div className="loading">Loading trades…</div>;

  return (
    <>
      <div className="page-header">
        <h1>Trades</h1>
        <span className="subtitle">
          {filtered.length} of {trades.length} trades shown
        </span>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Search symbol, strategy, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <select value={dirFilter} onChange={(e) => setDirFilter(e.target.value)}>
          <option value="all">Long & Short</option>
          <option value="long">Long only</option>
          <option value="short">Short only</option>
        </select>
        <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
          <option value="all">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <div className="toolbar-spacer" />
        <button className="btn" onClick={() => setShowAccounts(true)}>
          Manage Accounts
        </button>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          + Add Trade
        </button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty">No trades match your filters</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Dir</th>
                <th>Status</th>
                <th>Entry Date</th>
                <th>Exit Date</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Qty</th>
                <th>Fees</th>
                <th>P&L</th>
                <th>Strategy</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="symbol">{t.symbol}</td>
                  <td>
                    <span className={`badge ${t.direction}`}>{t.direction}</span>
                  </td>
                  <td>
                    <span className={`badge ${t.status}`}>{t.status}</span>
                  </td>
                  <td>{fmtDate(t.entry_date)}</td>
                  <td>{fmtDate(t.exit_date)}</td>
                  <td>{fmtNum(t.entry_price)}</td>
                  <td>{fmtNum(t.exit_price)}</td>
                  <td>{fmtNum(t.quantity)}</td>
                  <td>{fmtMoney(t.fees)}</td>
                  <td className={pnlClass(t.pnl)}>
                    {t.status === 'closed' ? fmtSignedMoney(t.pnl) : '—'}
                  </td>
                  <td>{t.strategy || '—'}</td>
                  <td className="actions">
                    {t.status === 'open' && (
                      <button className="btn btn-sm btn-primary" onClick={() => closeTrade(t)}>
                        Close
                      </button>
                    )}
                    <button className="btn btn-sm" onClick={() => setEditing(t)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => removeTrade(t.id)}>
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal
          title={editing === 'new' ? 'Add Trade' : `Edit Trade — ${editing.symbol}`}
          onClose={() => setEditing(null)}
          wide
        >
          <TradeForm
            initial={editing === 'new' ? null : editing}
            accounts={accounts}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        </Modal>
      )}

      {showAccounts && <AccountsModal onClose={() => setShowAccounts(false)} onChanged={load} />}
    </>
  );
}
