import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const API = '/api/incidents';
const STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const EMPTY = {title: '', description: '', service: '', severity: 'MEDIUM', status: 'OPEN', assignee: 'Unassigned'};

async function request(path = '', options) {
  const response = await fetch(`${API}${path}`, options);
  if (!response.ok) {
    let detail;
    try {
      const body = await response.json();
      detail = Array.isArray(body.detail)
        ? body.detail.map(item => `${item.loc?.slice(1).join('.') || 'Incident'}: ${item.msg}`).join('; ')
        : body.detail;
    } catch { /* Non-JSON proxy errors still include the HTTP status. */ }
    throw new Error(typeof detail === 'string' ? detail : `Request failed (${response.status}). Please retry.`);
  }
  return response.status === 204 ? null : response.json();
}

function App() {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [items, counts] = await Promise.all([request(), request('/stats')]);
      setIncidents(items);
      setStats(counts);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openForm = (incident = EMPTY) => { setForm({...incident}); setFormError(''); };
  const save = async event => {
    event.preventDefault();
    setPending(true);
    setFormError('');
    const payload = Object.fromEntries(Object.keys(EMPTY).map(key => [key, form[key]]));
    try {
      await request(form.id ? `/${form.id}` : '', {
        method: form.id ? 'PUT' : 'POST',
        headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload),
      });
      setForm(null);
      await load();
    } catch (e) { setFormError(e.message); }
    finally { setPending(false); }
  };
  const remove = async incident => {
    if (!window.confirm(`Delete incident "${incident.title}"?`)) return;
    setPending(true);
    setError('');
    try { await request(`/${incident.id}`, {method: 'DELETE'}); await load(); }
    catch (e) { setError(e.message); }
    finally { setPending(false); }
  };
  const visible = filter === 'ALL' ? incidents : incidents.filter(item => item.status === filter);
  const recent = [...incidents].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).slice(0, 5);
  const field = event => setForm({...form, [event.target.name]: event.target.value});

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">O</span><div><b>OpsFlow</b><small>Incident & service operations</small></div></div>
      <nav><a className="active" href="#incidents">▦ <span>Incident dashboard</span></a></nav>
      <div className="side-bottom"><div className="upgrade"><strong>Keep services running.</strong><p>Track incidents from detection through resolution.</p></div></div>
    </aside>
    <main className="main">
      <header><div><p className="eyebrow">OPERATIONS / OVERVIEW</p><h1>Incident dashboard</h1><p className="muted">Coordinate service response and track resolution.</p></div><button className="primary" disabled={pending} onClick={() => openForm()}>＋ New incident</button></header>
      {error && <div className="alert" role="alert">{error} <button type="button" className="icon-btn" disabled={loading || pending} onClick={load}>Retry</button></div>}
      <section className="stats" aria-label="Incident statistics">
        <Stat label="Open" value={stats?.open} icon="○"/>
        <Stat label="Investigating" value={stats?.investigating} icon="◔"/>
        <Stat label="Critical" value={stats?.critical} icon="!" note="Unresolved critical incidents"/>
        <Stat label="Resolved" value={stats?.resolved} icon="✓"/>
      </section>
      <section className="content-grid">
        <div className="panel incidents-panel" id="incidents">
          <div className="panel-head"><div><h2>Incidents</h2><p className="muted">Service issues and response status.</p></div><div className="filters">{['ALL', ...STATUSES].map(value => <button key={value} className={filter === value ? 'selected' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'ALL' ? 'All' : value}</button>)}</div></div>
          {loading ? <div className="empty" role="status">Loading incidents…</div> : <div className="table-wrap"><table><thead><tr><th>Incident</th><th>Service</th><th>Assignee</th><th>Severity</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {visible.map(incident => <tr key={incident.id}>
              <td><div className="incident-title"><span className={`dot ${incident.status.toLowerCase()}`}/><div><b>{incident.title}</b><small>{incident.description}</small></div></div></td>
              <td>{incident.service}</td><td>{incident.assignee}</td>
              <td><Badge type="severity" value={incident.severity}/></td><td><Badge type="status" value={incident.status}/></td>
              <td><div className="row-actions"><button className="icon-btn" disabled={pending} onClick={() => openForm(incident)} aria-label={`Edit ${incident.title}`}>Edit</button><button className="icon-btn danger" disabled={pending} onClick={() => remove(incident)} aria-label={`Delete ${incident.title}`}>Delete</button></div></td>
            </tr>)}
          </tbody></table>{!visible.length && <div className="empty">{error ? 'Incident data could not be loaded.' : 'No incidents in this filter.'}</div>}</div>}
        </div>
        <aside className="panel activity"><div className="panel-head"><div><h2>Recent incidents</h2><p className="muted">Most recently updated.</p></div></div>
          {loading ? <div className="empty">Loading…</div> : recent.map(incident => <div className="activity-row" key={incident.id}><span className="activity-icon">◌</span><div><b>{incident.title}</b><small>{incident.service} · {incident.status}</small><small>{new Date(incident.updated_at).toLocaleString()}</small></div></div>)}
          {!loading && !recent.length && <div className="empty">{error ? 'Incident data unavailable.' : 'No incidents yet.'}</div>}
        </aside>
      </section>
      {form && <div className="modal-backdrop"><form className="modal" role="dialog" aria-modal="true" aria-labelledby="incident-form-title" onSubmit={save}>
        <div className="modal-head"><div><p className="eyebrow">{form.id ? 'EDIT INCIDENT' : 'CREATE INCIDENT'}</p><h2 id="incident-form-title">{form.id ? 'Update incident' : 'New incident'}</h2></div><button type="button" className="close" aria-label="Close" disabled={pending} onClick={() => setForm(null)}>×</button></div>
        {formError && <div className="alert form-alert" role="alert">{formError}</div>}
        <fieldset disabled={pending}>
          <label>Title<input autoFocus name="title" value={form.title} onChange={field} required maxLength={200} pattern=".*\S.*" placeholder="e.g. Elevated checkout errors"/></label>
          <label>Description<textarea name="description" value={form.description} onChange={field} placeholder="Impact, symptoms, and investigation notes"/></label>
          <label>Service<input name="service" value={form.service} onChange={field} required maxLength={120} pattern=".*\S.*" placeholder="e.g. checkout-api"/></label>
          <div className="form-row"><label>Severity<select aria-label="Severity" name="severity" value={form.severity} onChange={field}>{SEVERITIES.map(value => <option key={value}>{value}</option>)}</select></label><label>Status<select aria-label="Status" name="status" value={form.status} onChange={field}>{STATUSES.map(value => <option key={value}>{value}</option>)}</select></label></div>
          <label>Assignee<input name="assignee" value={form.assignee} onChange={field} maxLength={120}/></label>
          <button className="primary full" disabled={pending}>{pending ? 'Saving…' : form.id ? 'Save changes' : 'Create incident'}</button>
        </fieldset>
      </form></div>}
    </main>
  </div>;
}
function Stat({label, value, icon, note = 'Current incident count'}) {
  return <div className="stat"><div className="stat-icon">{icon}</div><div><small>{label}</small><strong>{value ?? '—'}</strong><span>{note}</span></div></div>;
}
function Badge({type, value}) { return <span className={`${type} ${value.toLowerCase()}`}>{value}</span>; }
createRoot(document.getElementById('root')).render(<App/>);
