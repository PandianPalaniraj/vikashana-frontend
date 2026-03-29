import { useEffect, useState } from 'react'

const BASE = '/api/v1'
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || 'Request failed')
  return json
}

const STATUS_COLOR = { open: '#3b82f6', in_progress: '#f59e0b', resolved: '#22c55e', closed: '#94a3b8' }
const STATUS_LABEL = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' }
const PRIORITY_COLOR = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444', critical: '#7c3aed' }

const s = {
  page:     { padding: 24 },
  header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title:    { fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 },
  filters:  { display: 'flex', gap: 10, flexWrap: 'wrap' },
  select:   { padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' },
  newBtn:   { padding: '9px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  card:     { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 12, cursor: 'pointer', transition: 'box-shadow 0.15s' },
  cardTop:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  subj:     { fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 },
  meta:     { fontSize: 12, color: '#64748b', marginTop: 4 },
  badges:   { display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' },
  badge:    (c) => ({ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: c + '22', color: c }),
  body:     { fontSize: 13, color: '#475569', lineHeight: 1.5 },
  reply:    { marginTop: 12, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 12 },
  replyLbl: { fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 },
  replyTxt: { fontSize: 13, color: '#166534' },
  empty:    { textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: 14 },

  // Modal
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal:    { background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' },
  modalH:   { fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' },
  label:    { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, marginTop: 14 },
  input:    { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', minHeight: 100, resize: 'vertical' },
  mRow:     { display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' },
  cancelBtn:{ padding: '9px 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  submitBtn:{ padding: '9px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
}

const BLANK = { subject: '', category: 'general', priority: 'medium', message: '' }

export default function FeedbackPage() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [status,  setStatus]  = useState('')
  const [category, setCategory] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [form,    setForm]    = useState(BLANK)
  const [saving,  setSaving]  = useState(false)
  const [expanded, setExpanded] = useState(null)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status)   params.set('status',   status)
    if (category) params.set('category', category)
    apiFetch(`/feedback?${params}`)
      .then(r => setItems(r.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [status, category])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim() || !form.message.trim()) return
    setSaving(true)
    try {
      await apiFetch('/feedback', { method: 'POST', body: JSON.stringify(form) })
      setShowNew(false)
      setForm(BLANK)
      load()
    } catch (err) {
      alert(err.message || 'Failed to submit feedback')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Feedback & Support</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Track your submitted feedback and responses from our team</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={s.filters}>
            <select style={s.select} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select style={s.select} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              <option value="general">General</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="billing">Billing</option>
              <option value="support">Support</option>
            </select>
          </div>
          <button style={s.newBtn} onClick={() => setShowNew(true)}>+ New Feedback</button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Loading…</p>
      ) : items.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No feedback yet</div>
          <div>Submit feedback to get help or suggest improvements</div>
        </div>
      ) : (
        items.map(item => (
          <div
            key={item.id}
            style={{ ...s.card, boxShadow: expanded === item.id ? '0 4px 16px rgba(0,0,0,0.12)' : undefined }}
            onClick={() => setExpanded(expanded === item.id ? null : item.id)}
          >
            <div style={s.cardTop}>
              <div style={{ flex: 1 }}>
                <p style={s.subj}>{item.subject}</p>
                <p style={s.meta}>
                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}{item.category}
                </p>
              </div>
              <div style={s.badges}>
                {item.priority && (
                  <span style={s.badge(PRIORITY_COLOR[item.priority] || '#94a3b8')}>{item.priority}</span>
                )}
                <span style={s.badge(STATUS_COLOR[item.status] || '#94a3b8')}>
                  {STATUS_LABEL[item.status] || item.status}
                </span>
              </div>
            </div>

            {expanded === item.id && (
              <>
                <p style={s.body}>{item.message}</p>
                {item.reply ? (
                  <div style={s.reply}>
                    <div style={s.replyLbl}>Response from Vikashana Team</div>
                    <div style={s.replyTxt}>{item.reply}</div>
                    {item.resolved_at && (
                      <div style={{ fontSize: 11, color: '#166534', marginTop: 6 }}>
                        Resolved on {new Date(item.resolved_at).toLocaleDateString('en-IN')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                    Awaiting response from support team…
                  </div>
                )}
              </>
            )}
          </div>
        ))
      )}

      {/* New Feedback Modal */}
      {showNew && (
        <div style={s.overlay} onClick={() => setShowNew(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalH}>Submit Feedback</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Send a bug report, feature request, or ask for help</p>
            <form onSubmit={handleSubmit}>
              <label style={s.label}>Subject *</label>
              <input style={s.input} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief summary of your feedback" required />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div>
                  <label style={s.label}>Category</label>
                  <select style={{ ...s.input, background: '#fff' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="general">General</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="billing">Billing</option>
                    <option value="support">Support</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Priority</label>
                  <select style={{ ...s.input, background: '#fff' }} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <label style={s.label}>Message *</label>
              <textarea style={s.textarea} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Describe the issue or request in detail…" required />

              <div style={s.mRow}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowNew(false)}>Cancel</button>
                <button type="submit" style={s.submitBtn} disabled={saving}>{saving ? 'Submitting…' : 'Submit Feedback'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
