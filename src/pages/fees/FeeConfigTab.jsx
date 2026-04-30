import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const apiFetch = async (path, opts = {}) => {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Authorization': `Bearer ${token}`,
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`)
  return json
}

const FEE_TYPES = ['Tuition', 'Transport', 'Library', 'Sports', 'Lab', 'Exam', 'Hostel', 'Other']
const TERMS     = ['Term 1', 'Term 2', 'Term 3', 'Annual', 'Monthly', 'Q1', 'Q2', 'Q3', 'Q4']

const fmtINR = n => Number(n || 0).toLocaleString('en-IN')

const labelStyle = {
  fontSize: 10, fontWeight: 800, color: '#64748B', display: 'block',
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8,
}
const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff',
}

export default function FeeConfigTab({ showToast, isMobile }) {
  const [grouped,  setGrouped]  = useState([])
  const [classes,  setClasses]  = useState([])
  const [years,    setYears]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [genBusy,  setGenBusy]  = useState(null)

  const [form, setForm] = useState({
    class_id: '', academic_year_id: '',
    term: 'Term 1', fee_type: 'Tuition',
    amount: '', due_date: '', description: '',
  })

  const refresh = () =>
    apiFetch('/fee-configs').then(r => setGrouped(r.grouped || []))

  useEffect(() => {
    Promise.all([
      apiFetch('/fee-configs').catch(() => ({ grouped: [] })),
      apiFetch('/classes').catch(() => ({ data: [] })),
      apiFetch('/academic-years').catch(() => ({ data: [] })),
    ])
      .then(([cfg, cls, yr]) => {
        setGrouped(cfg.grouped || [])
        setClasses(cls.data || [])
        setYears(yr.data || [])
        // Default the form's academic year to the current one
        const current = (yr.data || []).find(y => y.is_current) || (yr.data || [])[0]
        if (current) setForm(f => ({ ...f, academic_year_id: current.id }))
      })
      .finally(() => setLoading(false))
  }, [])

  const saveConfig = async () => {
    if (!form.class_id || !form.academic_year_id || !form.amount) {
      showToast?.('Class, year and amount are required', 'error')
      return
    }
    setSaving(true)
    try {
      await apiFetch('/fee-configs', { method: 'POST', body: form })
      showToast?.('Fee config saved')
      await refresh()
      setShowForm(false)
      setForm(f => ({ ...f, amount: '', due_date: '', description: '' }))
    } catch (e) {
      showToast?.(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteConfig = async (id) => {
    if (!window.confirm('Delete this fee config?')) return
    try {
      await apiFetch(`/fee-configs/${id}`, { method: 'DELETE' })
      await refresh()
      showToast?.('Fee config deleted')
    } catch (e) {
      showToast?.(e.message, 'error')
    }
  }

  const generateInvoices = async (classId) => {
    if (!window.confirm('Generate invoices for all active students in this class based on the fee config?')) return
    setGenBusy(classId)
    try {
      const r = await apiFetch(`/fee-configs/class/${classId}/generate-invoices`, { method: 'POST' })
      showToast?.(r.message || 'Invoices generated')
    } catch (e) {
      showToast?.(e.message, 'error')
    } finally {
      setGenBusy(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>⚙️ Fee Configuration</h3>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '4px 0 0', maxWidth: 540, lineHeight: 1.5 }}>
            Define per-class, per-term fees here. When a student is enrolled in a class, the matching invoices are generated automatically.
          </p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}>
          {showForm ? '× Cancel' : '+ Add Fee Config'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background: '#F8FAFF', border: '1px solid #C7D2FE', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h4 style={{ fontSize: 14, fontWeight: 800, color: '#4338CA', margin: '0 0 14px' }}>📝 New Fee Config</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={labelStyle}>Class *</label>
              <select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))} style={inputStyle}>
                <option value="">— Select class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Academic Year *</label>
              <select value={form.academic_year_id} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value }))} style={inputStyle}>
                <option value="">— Select year —</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.name}{y.is_current ? ' (current)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Term *</label>
              <select value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} style={inputStyle}>
                {TERMS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Fee Type *</label>
              <select value={form.fee_type} onChange={e => setForm(f => ({ ...f, fee_type: e.target.value }))} style={inputStyle}>
                {FEE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Amount (₹) *</label>
              <input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 5000" style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={inputStyle}/>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional note" style={inputStyle}/>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={saveConfig} disabled={saving}
              style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save Fee Config'}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading fee configs…</div>
      ) : grouped.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 16, border: '1px dashed #E2E8F0' }}>
          <div style={{ fontSize: 40 }}>⚙️</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginTop: 12 }}>No fee configs yet</div>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 6, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
            Add fee configurations per class. Invoices will be auto-created when students are enrolled.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {grouped.map(group => (
            <div key={group.class_id ?? group.class_name}
              style={{ background: '#fff', borderRadius: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>🏫 {group.class_name}</span>
                  <span style={{ color: '#94A3B8', fontSize: 12, marginLeft: 12 }}>{group.configs.length} fee types</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(255,255,255,0.15)', color: '#FCD34D', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800 }}>
                    Total: ₹{fmtINR(group.total)}
                  </span>
                  <button onClick={() => generateInvoices(group.class_id)} disabled={genBusy === group.class_id || !group.class_id}
                    style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: genBusy === group.class_id ? 0.6 : 1 }}>
                    {genBusy === group.class_id ? 'Generating…' : '🧾 Generate Invoices'}
                  </button>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 480 : 0 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      {['Term', 'Fee Type', 'Amount', 'Due Date', 'Status', ''].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.configs.map((cfg, i) => (
                      <tr key={cfg.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13 }}>{cfg.term}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: '#EEF2FF', color: '#6366F1', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{cfg.fee_type}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14, color: '#10B981' }}>₹{fmtINR(cfg.amount)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748B' }}>
                          {cfg.due_date
                            ? new Date(cfg.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: cfg.is_active ? '#ECFDF5' : '#F8FAFC', color: cfg.is_active ? '#10B981' : '#94A3B8', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                            {cfg.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => deleteConfig(cfg.id)}
                            style={{ background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
