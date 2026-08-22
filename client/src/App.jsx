import { useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Trades from './pages/Trades.jsx';
import Journal from './pages/Journal.jsx';
import Analytics from './pages/Analytics.jsx';

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'trades', label: 'Trades' },
  { id: 'journal', label: 'Journal' },
  { id: 'analytics', label: 'Analytics' }
];

export default function App() {
  const [page, setPage] = useState('dashboard');

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-mark">TD</span>
          <span className="logo-text">
            TradeDesk
            <small>Trading ERP</small>
          </span>
        </div>
        <nav>
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">v1.0 &middot; Local SQLite</div>
      </aside>
      <main className="main">
        {page === 'dashboard' && <Dashboard />}
        {page === 'trades' && <Trades />}
        {page === 'journal' && <Journal />}
        {page === 'analytics' && <Analytics />}
      </main>
    </div>
  );
}
