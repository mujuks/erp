import { useEffect, useState } from 'react';
import { api } from '../api.js';
import StatCard from '../components/StatCard.jsx';
import {
  fmtMoney,
  fmtSignedMoney,
  fmtPct,
  fmtNum,
  fmtDate,
  fmtMonth,
  pnlClass
} from '../utils.js';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/stats')
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="page-error">Failed to load stats: {error}</div>;
  if (!stats) return <div className="loading">Loading dashboard…</div>;

  const s = stats.summary;
  const equityData = stats.equity_curve.map((p) => ({
    date: p.date.slice(0, 10),
    equity: +p.equity.toFixed(2)
  }));
  const monthlyData = stats.monthly.map((m) => ({ month: fmtMonth(m.key), pnl: +m.net_pnl.toFixed(2) }));
  const open = stats.open_trades || [];
  const recent = stats.recent_trades || [];

  const equityTooltip = {
    formatter: (v) => [fmtSignedMoney(v), 'Cumulative P&L'],
    labelFormatter: (l) => `Date: ${l}`
  };

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <span className="subtitle">Overview of your trading performance</span>
      </div>

      <div className="stat-grid">
        <StatCard label="Net P&L" value={fmtSignedMoney(s.net_pnl)} className={pnlClass(s.net_pnl)} />
        <StatCard label="Win Rate" value={fmtPct(s.win_rate)} sub={`${s.wins}W / ${s.losses}L`} />
        <StatCard
          label="Profit Factor"
          value={s.profit_factor === null ? '∞' : fmtNum(s.profit_factor)}
          sub={`${fmtMoney(s.gross_profit)} / ${fmtMoney(s.gross_loss)}`}
        />
        <StatCard label="Total Trades" value={s.total_trades} sub={`${s.open_trades} open`} />
        <StatCard label="Avg Win" value={fmtMoney(s.avg_win)} className="pos" />
        <StatCard label="Avg Loss" value={`-${fmtMoney(s.avg_loss)}`} className="neg" />
      </div>

      <div className="card-row">
        <div className="card grow">
          <h3>Cumulative P&L</h3>
          {equityData.length === 0 ? (
            <div className="empty">No closed trades yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#26a69a" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#26a69a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#232a3b" />
                <XAxis dataKey="date" stroke="#8b93a7" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8b93a7" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip {...equityTooltip} contentStyle={{ background: '#1c2230', border: '1px solid #232a3b' }} />
                <Area type="monotone" dataKey="equity" stroke="#26a69a" strokeWidth={2} fill="url(#eqGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card grow">
          <h3>Monthly P&L</h3>
          {monthlyData.length === 0 ? (
            <div className="empty">No closed trades yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232a3b" vertical={false} />
                <XAxis dataKey="month" stroke="#8b93a7" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8b93a7" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(v) => [fmtSignedMoney(v), 'Net P&L']}
                  contentStyle={{ background: '#1c2230', border: '1px solid #232a3b' }}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((m, i) => (
                    <Cell key={i} fill={m.pnl >= 0 ? '#26a69a' : '#ef5350'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card-row">
        <div className="card grow">
          <h3>Open Positions</h3>
          {open.length === 0 ? (
            <div className="empty">No open positions</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Dir</th>
                  <th>Entry Date</th>
                  <th>Entry Price</th>
                  <th>Qty</th>
                  <th>Strategy</th>
                </tr>
              </thead>
              <tbody>
                {open.map((t) => (
                  <tr key={t.id}>
                    <td className="symbol">{t.symbol}</td>
                    <td>
                      <span className={`badge ${t.direction}`}>{t.direction}</span>
                    </td>
                    <td>{fmtDate(t.entry_date)}</td>
                    <td>{fmtNum(t.entry_price)}</td>
                    <td>{fmtNum(t.quantity)}</td>
                    <td>{t.strategy || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card grow">
          <h3>Recent Closed Trades</h3>
          {recent.length === 0 ? (
            <div className="empty">Nothing closed yet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Date</th>
                  <th>P&L</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id}>
                    <td className="symbol">{t.symbol}</td>
                    <td>{fmtDate(t.exit_date)}</td>
                    <td className={pnlClass(t.pnl)}>{fmtSignedMoney(t.pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
