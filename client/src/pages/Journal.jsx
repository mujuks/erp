import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { todayISO, fmtDate } from '../utils.js';

const MOODS = ['Disciplined', 'Focused', 'Confident', 'Calm', 'Anxious', 'Greedy', 'Fearful', 'Impatient'];

const emptyForm = { date: todayISO(), title: '', content: '', mood: 'Focused' };

export default function Journal() {
  const [entries, setEntries] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    setEntries(await api.get('/api/journal'));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function startEdit(entry) {
    setEditingId(entry.id);
    setForm({
      date: entry.date.slice(0, 10),
      title: entry.title,
      content: entry.content,
      mood: entry.mood || 'Focused'
    });
    window.scrollTo({ top: 0 });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Title is required');
    try {
      if (editingId) await api.put(`/api/journal/${editingId}`, form);
      else await api.post('/api/journal', form);
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeEntry(id) {
    if (!confirm('Delete this journal entry?')) return;
    if (editingId === id) cancelEdit();
    await api.del(`/api/journal/${id}`);
    load();
  }

  if (!entries) return <div className="loading">Loading journal…</div>;

  return (
    <>
      <div className="page-header">
        <h1>Trading Journal</h1>
        <span className="subtitle">{entries.length} entries</span>
      </div>

      <div className="card journal-form-card">
        <h3>{editingId ? 'Edit Entry' : 'New Journal Entry'}</h3>
        <form onSubmit={handleSubmit} className="inline-form journal-inline">
          <input type="date" value={form.date} onChange={set('date')} />
          <select value={form.mood} onChange={set('mood')}>
            {MOODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            className="grow"
            placeholder="What did you learn today?"
            value={form.title}
            onChange={set('title')}
          />
        </form>
        <textarea
          rows={4}
          placeholder="Write your thoughts about the market, your execution, emotions…"
          value={form.content}
          onChange={set('content')}
        />
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          {editingId && (
            <button type="button" className="btn" onClick={cancelEdit}>
              Cancel
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            {editingId ? 'Update Entry' : 'Save Entry'}
          </button>
        </div>
      </div>

      <div className="journal-list">
        {entries.length === 0 && (
          <div className="card">
            <div className="empty">No journal entries yet. Start writing about your trading day.</div>
          </div>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="card journal-entry">
            <div className="journal-entry-head">
              <div>
                <span className="badge mood">{entry.mood || 'Note'}</span>
                <strong>{entry.title}</strong>
              </div>
              <div className="actions">
                <span className="date">{fmtDate(entry.date)}</span>
                <button className="btn btn-sm" onClick={() => startEdit(entry)}>
                  Edit
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => removeEntry(entry.id)}>
                  Del
                </button>
              </div>
            </div>
            {entry.content && <p>{entry.content}</p>}
          </div>
        ))}
      </div>
    </>
  );
}
