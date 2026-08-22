export default function StatCard({ label, value, sub, className = '' }) {
  return (
    <div className={`stat-card ${className}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}
