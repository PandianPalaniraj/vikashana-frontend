import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useParentStore from '../../store/parentStore'
import parentApi from '../../api/parent'

const STATUS_STYLE = {
  Pending:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  Approved: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  Rejected: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}

const TYPE_ICON = { Medical: '🏥', Family: '👨‍👩‍👧', Personal: '🙂', Other: '📋' }

const LEAVE_TYPES = ['Medical', 'Family', 'Personal', 'Other']

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function ParentLeaves() {
  const navigate = useNavigate()
  const activeStudent = useParentStore(s => s.activeStudent)

  const [leaves,   setLeaves]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filter,   setFilter]   = useState('All')

  // Apply form state
  const [form, setForm]         = useState({ leave_type: 'Medical', from_date: todayStr(), to_date: todayStr(), reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState(null)
  const [toast,      setToast]      = useState(null)

  useEffect(() => {
    if (!activeStudent) { navigate('/parent/select', { replace: true }); return }
    load()
  }, [activeStudent])

  function load() {
    setLoading(true); setError(null)
    parentApi.getLeaves(activeStudent.student_id)
      .then(res => {
        if (!res.success) throw new Error()
        setLeaves(res.data || [])
      })
      .catch(() => setError('Could not load leaves.'))
      .finally(() => setLoading(false))
  }

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.reason.trim()) { setFormError('Please enter a reason.'); return }
    if (form.to_date < form.from_date) { setFormError('End date must be on or after start date.'); return }
    setSubmitting(true); setFormError(null)
    try {
      const res = await parentApi.applyLeave({ ...form, student_id: activeStudent.student_id })
      if (!res.success) throw new Error(res.message || 'Failed')
      setLeaves(prev => [res.data, ...prev])
      setShowForm(false)
      setForm({ leave_type: 'Medical', from_date: todayStr(), to_date: todayStr(), reason: '' })
      showToast('Leave application submitted!')
    } catch (err) {
      setFormError(err.message || 'Could not submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(id) {
    if (!window.confirm('Cancel this leave application?')) return
    try {
      const res = await parentApi.cancelLeave(id)
      if (!res.success) throw new Error()
      setLeaves(prev => prev.filter(l => l.id !== id))
      showToast('Leave cancelled.')
    } catch {
      showToast('Could not cancel leave.', false)
    }
  }

  if (!activeStudent) return null

  const FILTERS = ['All', 'Pending', 'Approved', 'Rejected']
  const visible = filter === 'All' ? leaves : leaves.filter(l => l.status === filter)

  const pending  = leaves.filter(l => l.status === 'Pending').length
  const approved = leaves.filter(l => l.status === 'Approved').length

  return (
    <div style={{ padding: 16 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A' }}>Leaves</div>
          <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginTop: 2 }}>
            {activeStudent.name} · {leaves.length} applied
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: 'linear-gradient(135deg,#6366F1,#4338CA)', color: '#fff',
            border: 'none', borderRadius: 12, padding: '10px 16px',
            fontSize: 13, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          + Apply Leave
        </button>
      </div>

      {/* Summary row */}
      {!loading && leaves.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Total',    value: leaves.length, color: '#6366F1', bg: '#EEF2FF' },
            { label: 'Pending',  value: pending,        color: '#D97706', bg: '#FFFBEB' },
            { label: 'Approved', value: approved,       color: '#059669', bg: '#ECFDF5' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: s.color, opacity: 0.75, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter pills */}
      {!loading && leaves.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                border: filter === f ? '2px solid #6366F1' : '1.5px solid #E2E8F0',
                background: filter === f ? '#EEF2FF' : '#fff',
                color: filter === f ? '#4338CA' : '#64748B',
                borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
          ⚠️ {error}
          <button onClick={load} style={{ marginLeft: 10, background: '#EF4444', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'grid', gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: '#E2E8F0', borderRadius: 14, height: 90, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
            {filter === 'All' ? 'No leaves applied yet' : `No ${filter.toLowerCase()} leaves`}
          </div>
          {filter === 'All' && (
            <div style={{ fontSize: 13, marginBottom: 20 }}>
              Apply a leave for {activeStudent.name}
            </div>
          )}
          {filter === 'All' && (
            <button
              onClick={() => setShowForm(true)}
              style={{ background: '#6366F1', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
            >
              + Apply Leave
            </button>
          )}
        </div>
      )}

      {/* Leave cards */}
      {!loading && !error && visible.length > 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          {visible.map(leave => {
            const st = STATUS_STYLE[leave.status] || STATUS_STYLE.Pending
            return (
              <div
                key={leave.id}
                style={{
                  background: '#fff', borderRadius: 16, padding: '16px',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
                  border: `1px solid ${st.border}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, background: st.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
                    }}>
                      {TYPE_ICON[leave.leave_type] || '📋'}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{leave.leave_type} Leave</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginTop: 2 }}>
                        {leave.total_days} day{leave.total_days !== 1 ? 's' : ''} · Applied {fmtDate(leave.applied_at)}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20,
                    color: st.color, background: st.bg, border: `1px solid ${st.border}`,
                  }}>
                    {leave.status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>From</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{fmtDate(leave.from_date)}</div>
                  </div>
                  <div style={{ color: '#CBD5E1', alignSelf: 'center', fontSize: 18 }}>→</div>
                  <div>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>To</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{fmtDate(leave.to_date)}</div>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#374151', background: '#F8FAFC', borderRadius: 8, padding: '8px 12px', marginBottom: leave.remarks ? 8 : 0, lineHeight: 1.5 }}>
                  {leave.reason}
                </div>

                {leave.remarks && (
                  <div style={{ fontSize: 12, color: st.color, background: st.bg, borderRadius: 8, padding: '6px 10px', marginTop: 8, fontWeight: 600 }}>
                    💬 {leave.remarks}
                  </div>
                )}

                {leave.status === 'Pending' && (
                  <button
                    onClick={() => handleCancel(leave.id)}
                    style={{ marginTop: 10, background: 'none', border: '1px solid #FECACA', color: '#EF4444', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel Leave
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Apply Leave Modal */}
      {showForm && (
        <div
          onClick={() => !submitting && setShowForm(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 100, display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '24px 24px 0 0', width: '100%',
              padding: '24px 20px 40px', maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A' }}>Apply for Leave</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94A3B8' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Leave type */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>Leave Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {LEAVE_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, leave_type: t }))}
                      style={{
                        border: form.leave_type === t ? '2px solid #6366F1' : '1.5px solid #E2E8F0',
                        background: form.leave_type === t ? '#EEF2FF' : '#F8FAFC',
                        borderRadius: 10, padding: '10px 8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{TYPE_ICON[t]}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: form.leave_type === t ? '#4338CA' : '#374151' }}>{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>From Date</label>
                  <input
                    type="date"
                    value={form.from_date}
                    min={todayStr()}
                    onChange={e => setForm(f => ({ ...f, from_date: e.target.value, to_date: e.target.value > f.to_date ? e.target.value : f.to_date }))}
                    style={{ width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>To Date</label>
                  <input
                    type="date"
                    value={form.to_date}
                    min={form.from_date}
                    onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Reason */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>Reason</label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  placeholder="Briefly describe the reason for leave..."
                  style={{ width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', fontSize: 14, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              {formError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                  background: submitting ? '#A5B4FC' : 'linear-gradient(135deg,#6366F1,#4338CA)',
                  color: '#fff', fontSize: 15, fontWeight: 800, cursor: submitting ? 'default' : 'pointer',
                }}
              >
                {submitting ? 'Submitting…' : 'Submit Leave Application'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? '#0F172A' : '#EF4444', color: '#fff',
          borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 700,
          zIndex: 200, whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}
    </div>
  )
}
