import { useEffect, useState } from 'react';
import { api } from '../api.js';
import StatCard from '../components/StatCard.jsx';
import {
  fmtMoney,
  fmtSignedMoney,
  fmtNum,
  fmtPct,
  fmtDate,
  pnlClass
} from '../utils.js';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/stats')
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="page-error">Failed to load analytics: {error}</div>;
  if (!stats) return <div className="loading">Loading analytics…</div>;

  const s = stats.summary;
  const symbolData = stats.by_symbol.map((r) => ({ symbol: r.key, pnl: +r.net_pnl.toFixed(2) }));
  const weekdayData = stats.by_weekday.map((r) => ({ day: r.key.slice(0, 3), pnl: +r.net_pnl.toFixed(2) }));
  const dirData = stats.by_direction.map((r) => ({
    name: r.key === 'long' ? 'Long' : 'Short',
    wins: r.wins,
    losses: r.losses
  }));
  const bestSymbol = stats.by_symbol[0];

  return (
    <>
      <div className="page-header">
        <h1>Analytics</h1>
        <span className="subtitle">Where your edge comes from</span>
      </div>

      <div className="stat-grid">
        <StatCard label="Expectancy / Trade" value={fmtSignedMoney(s.expectancy)} className={pnlClass(s.expectancy)} />
        <StatCard label="Biggest Win" value={fmtMoney(s.biggest_win)} className="pos" />
        <StatCard label="Biggest Loss" value={fmtMoney(s.biggest_loss)} className="neg" />
        <StatCard label="Best Symbol" value={bestSymbol ? bestSymbol.key : '—'} sub={bestSymbol ? fmtSignedMoney(bestSymbol.net_pnl) : ''} />
      </div>

      <div className="card-row">
        <div className="card grow">
          <h3>P&L by Symbol</h3>
          {symbolData.length === 0 ? (
            <div className="empty">No closed trades yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={symbolData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232a3b" vertical={false} />
                <XAxis dataKey="symbol" stroke="#8b93a7" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8b93a7" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(v) => [fmtSignedMoney(v), 'Net P&L']}
                  contentStyle={{ background: '#1c2230', border: '1px solid #232a3b' }}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {symbolData.map((d, i) => (
                    <Cell key={i} fill={d.pnl >= 0 ? '#26a69a' : '#ef5350'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card grow">
          <h3>Win/Loss by Direction</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dirData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232a3b" vertical={false} />
              <XAxis dataKey="name" stroke="#8b93a7" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} stroke="#8b93a7" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1c2230', border: '1px solid #232a3b' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="wins" name="Wins" fill="#26a69a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="losses" name="Losses" fill="#ef5350" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-row">
        <div className="card grow">
          <h3>P&L by Weekday</h3>
          {weekdayData.length === 0 ? (
            <div className="empty">No closed trades yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232a3b" vertical={false} />
                <XAxis dataKey="day" stroke="#8b93a7" tick={{ fontSize: 12 }} />
                <YAxis stroke="#8b93a7" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(v) => [fmtSignedMoney(v), 'Net P&L']}
                  contentStyle={{ background: '#1c2230', border: '1px solid #232a3b' }}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {weekdayData.map((d, i) => (
                    <Cell key={i} fill={d.pnl >= 0 ? '#26a69a' : '#ef5350'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card grow">
          <h3>Performance by Strategy</h3>
          {stats.by_strategy.length === 0 ? (
            <div className="empty">Tag your trades with a strategy to see breakdowns</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Trades</th>
                  <th>Win Rate</th>
                  <th>Net P&L</th>
                </tr>
              </thead>
              <tbody>
                {stats.by_strategy.map((r) => (
                  <tr key={r.key}>
                    <td>{r.key}</td>
                    <td>{r.trades}</td>
                    <td>{fmtPct(r.win_rate)}</td>
                    <td className={pnlClass(r.net_pnl)}>{fmtSignedMoney(r.net_pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card-row">
        <div className="card grow">
          <h3>Top 5 Wins</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Date</th>
                <th>Strategy</th>
                <th>P&L</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_wins.map((t) => (
                <tr key={t.id}>
                  <td className="symbol">{t.symbol}</td>
                  <td>{fmtDate(t.exit_date || t.entry_date)}</td>
                  <td>{t.strategy || '—'}</td>
                  <td className="pos">{fmtSignedMoney(t.pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card grow">
          <h3>Top 5 Losses</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Date</th>
                <th>Strategy</th>
                <th>P&L</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_losses.map((t) => (
                <tr key={t.id}>
                  <td className="symbol">{t.symbol}</td>
                  <td>{fmtDate(t.exit_date || t.entry_date)}</td>
                  <td>{t.strategy || '—'}</td>
                  <td className="neg">{fmtSignedMoney(t.pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>All Symbols Breakdown</h3>
        {stats.by_symbol.length === 0 ? (
          <div className="empty">No closed trades yet</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Trades</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Win Rate</th>
                <th>Net P&L</th>
              </tr>
            </thead>
            <tbody>
              {stats.by_symbol.map((r) => (
                <tr key={r.key}>
                  <td className="symbol">{r.key}</td>
                  <td>{fmtNum(r.trades, 0)}</td>
                  <td>{r.wins}</td>
                  <td>{r.losses}</td>
                  <td>{fmtPct(r.win_rate)}</td>
                  <td className={pnlClass(r.net_pnl)}>{fmtSignedMoney(r.net_pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
