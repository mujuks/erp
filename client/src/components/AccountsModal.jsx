import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { fmtMoney, fmtSignedMoney } from '../utils.js';

export default function AccountsModal({ onClose, onChanged }) {
  const [accounts, setAccounts] = useState([]);
  const [name, setName] = useState('');
  const [broker, setBroker] = useState('');
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      setAccounts(await api.get('/api/accounts'));
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addAccount(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Account name is required');
    try {
      await api.post('/api/accounts', { name, broker, starting_balance: balance || 0 });
      setName('');
      setBroker('');
      setBalance('');
      await load();
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeAccount(id) {
    if (!confirm('Delete this account?')) return;
    setError('');
    try {
      await api.del(`/api/accounts/${id}`);
      await load();
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Manage Accounts</h3>
          <button className="btn-ghost" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <table className="data-table accounts-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Broker</th>
                <th>Start</th>
                <th>Realized</th>
                <th>Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.broker || '—'}</td>
                  <td>{fmtMoney(a.starting_balance)}</td>
                  <td className={a.realized_pnl >= 0 ? 'pos' : 'neg'}>
                    {fmtSignedMoney(a.realized_pnl)}
                  </td>
                  <td>{fmtMoney(a.balance)}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => removeAccount(a.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <form onSubmit={addAccount} className="inline-form">
            <input
              placeholder="Account name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input placeholder="Broker" value={broker} onChange={(e) => setBroker(e.target.value)} />
            <input
              type="number"
              step="any"
              placeholder="Starting balance"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Add Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
