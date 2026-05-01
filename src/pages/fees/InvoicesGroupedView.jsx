import { useEffect, useState, useCallback } from 'react'

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

const fmtINR = n => Number(n || 0).toLocaleString('en-IN')

const STATUS_META = {
  paid:    { label: 'Paid',    color: '#10B981', bg: '#ECFDF5', border: '#6EE7B7' },
  partial: { label: 'Partial', color: '#F59E0B', bg: '#FFFBEB', border: '#FCD34D' },
  unpaid:  { label: 'Unpaid',  color: '#EF4444', bg: '#FEF2F2', border: '#FCA5A5' },
}
const sm = (s) => STATUS_META[s] || { label: s || '—', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' }

// ══════════════════════════════════════════════════════════════════════════════
export default function InvoicesGroupedView({ classes = [], yearId, showToast, onOpenPayModal }) {
  const [students, setStudents] = useState([])
  const [meta, setMeta]         = useState(null)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [classId, setClassId]   = useState('')
  const [status,  setStatus]    = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)

  const fetchStudents = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: pageNum, per_page: 20 })
      if (search)   qs.set('search', search)
      if (classId)  qs.set('class_id', classId)
      if (status)   qs.set('status', status)
      if (yearId)   qs.set('academic_year_id', yearId)
      const r = await apiFetch(`/fees/invoices/grouped-by-student?${qs}`)
      setStudents(prev => append ? [...prev, ...(r.data || [])] : (r.data || []))
      setMeta(r.meta || null)
      setPage(pageNum)
    } catch (e) {
      showToast?.(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [search, classId, status, yearId, showToast])

  // Search debounce — 300ms after typing stops
  useEffect(() => {
    const id = setTimeout(() => fetchStudents(1, false), 300)
    return () => clearTimeout(id)
  }, [search, classId, status, yearId])

  if (selectedStudent) {
    return (
      <StudentInvoiceDetail
        studentId={selectedStudent}
        onBack={() => setSelectedStudent(null)}
        showToast={showToast}
        onOpenPayModal={onOpenPayModal}
      />
    )
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#94A3B8' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}/>
        </div>
        <select value={classId} onChange={e => setClassId(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', minWidth: 140 }}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', minWidth: 140 }}>
          <option value="">All Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Empty / loading / list */}
      {loading && students.length === 0 ? (
        <InvoiceListSkeleton/>
      ) : students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 16, border: '1px dashed #E2E8F0' }}>
          <div style={{ fontSize: 40 }}>🧾</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginTop: 12 }}>No invoices found</div>
        </div>
      ) : (
        <>
          {/* Summary stats — counts on the current page only */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Total Students', value: meta?.total ?? 0,                                      icon: '👥', color: '#6366F1', bg: '#EEF2FF' },
              { label: 'Fully Paid',     value: students.filter(s => s.status === 'paid').length,    icon: '✅', color: '#10B981', bg: '#ECFDF5' },
              { label: 'Partial',        value: students.filter(s => s.status === 'partial').length, icon: '⚡', color: '#F59E0B', bg: '#FFFBEB' },
              { label: 'Unpaid',         value: students.filter(s => s.status === 'unpaid').length,  icon: '❌', color: '#EF4444', bg: '#FEF2F2' },
            ].map(w => (
              <div key={w.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: `1px solid ${w.color}22`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, background: w.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{w.icon}</div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: w.color, lineHeight: 1 }}>{w.value}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: 600 }}>{w.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Student table */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)' }}>
                    {['Student', 'Class', 'Invoices', 'Total', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: (h === 'Total' || h === 'Balance') ? '#FCD34D' : '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const m = sm(s.status)
                    return (
                      <tr key={s.student_id}
                        style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC', cursor: 'pointer' }}
                        onClick={() => setSelectedStudent(s.student_id)}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar name={s.student_name} src={s.avatar}/>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 13, color: '#0F172A' }}>{s.student_name}</div>
                              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                                {s.parent_name || '—'}{s.parent_phone ? ` · ${s.parent_phone}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                          {s.class || '—'}{s.section ? `-${s.section}` : ''}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ background: '#EEF2FF', color: '#6366F1', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{s.invoice_count}</span>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: 14, color: '#0F172A', whiteSpace: 'nowrap' }}>₹{fmtINR(s.total_amount)}</td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 14, color: '#10B981', whiteSpace: 'nowrap' }}>₹{fmtINR(s.total_paid)}</td>
                        <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: 14, color: s.total_due > 0 ? '#EF4444' : '#10B981', whiteSpace: 'nowrap' }}>₹{fmtINR(s.total_due)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ background: m.bg, color: m.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{m.label}</span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedStudent(s.student_id) }}
                            style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            👁 View Details
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {meta?.has_more && (
            <button onClick={() => fetchStudents(page + 1, true)} disabled={loading}
              style={{ width: '100%', padding: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#6366F1', cursor: loading ? 'not-allowed' : 'pointer', marginTop: 16, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Loading…' : 'Load More'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
function StudentInvoiceDetail({ studentId, onBack, showToast, onOpenPayModal }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    apiFetch(`/fees/invoices/student/${studentId}`)
      .then(r => setData(r.data))
      .catch(e => showToast?.(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [studentId, showToast])

  useEffect(reload, [reload])

  if (loading && !data) return <div style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>Loading invoice details…</div>
  if (!data) return null

  const { student, invoices, summary } = data

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={onBack}
          style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
          ← Back to Invoices
        </button>
        <div style={{ fontWeight: 900, fontSize: 16, color: '#0F172A' }}>🧾 Invoice Details — {student.name}</div>
      </div>

      {/* Student card */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F,#1D4ED8)', padding: '20px 24px', color: '#fff', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Avatar name={student.name} src={student.avatar} size={56} dark/>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{student.name}</div>
            <div style={{ opacity: 0.7, fontSize: 13, marginTop: 3 }}>
              {student.class || '—'}{student.section ? `-${student.section}` : ''}
              {student.admission_no ? ` · Adm: ${student.admission_no}` : ''}
            </div>
            {student.parent_name && (
              <div style={{ opacity: 0.6, fontSize: 12, marginTop: 2 }}>
                👤 {student.parent_name}{student.parent_phone ? ` · 📞 ${student.parent_phone}` : ''}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1, background: '#F1F5F9' }}>
          {[
            { label: 'Total Fees',  value: `₹${fmtINR(summary.total_amount)}`, color: '#0F172A' },
            { label: 'Total Paid',  value: `₹${fmtINR(summary.total_paid)}`,   color: '#10B981' },
            { label: 'Balance Due', value: `₹${fmtINR(summary.total_due)}`,    color: summary.total_due > 0 ? '#EF4444' : '#10B981' },
            { label: 'Invoices',    value: `${summary.paid_count} paid / ${summary.unpaid_count} unpaid`, color: '#6366F1' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#fff', padding: '16px 20px' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice list */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A' }}>📋 All Invoices</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                {['Invoice #', 'Fee Type', 'Term', 'Amount', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => {
                const balance = Number(inv.amount || 0) - Number(inv.paid_amount || 0)
                const m = sm(inv.status)
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13, color: '#6366F1' }}>#{inv.invoice_number || inv.id}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#EEF2FF', color: '#6366F1', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{inv.fee_type}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748B', fontWeight: 600 }}>{inv.term || '—'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14, color: '#0F172A', whiteSpace: 'nowrap' }}>₹{fmtINR(inv.amount)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13, color: '#10B981', whiteSpace: 'nowrap' }}>₹{fmtINR(inv.paid_amount)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14, color: balance > 0 ? '#EF4444' : '#10B981', whiteSpace: 'nowrap' }}>₹{fmtINR(balance)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{m.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {inv.status !== 'paid' && onOpenPayModal && (
                        <button onClick={() => onOpenPayModal({ id: inv.id, total: inv.amount, paid: inv.paid_amount, status: inv.status, invoice_no: inv.invoice_number, items: inv.items, _onSuccess: reload })}
                          style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          💳 Pay
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
                <td colSpan={3} style={{ padding: '12px 16px', fontWeight: 800, fontSize: 13, color: '#0F172A' }}>Total</td>
                <td style={{ padding: '12px 16px', fontWeight: 900, fontSize: 15, color: '#0F172A', whiteSpace: 'nowrap' }}>₹{fmtINR(summary.total_amount)}</td>
                <td style={{ padding: '12px 16px', fontWeight: 900, fontSize: 15, color: '#10B981', whiteSpace: 'nowrap' }}>₹{fmtINR(summary.total_paid)}</td>
                <td style={{ padding: '12px 16px', fontWeight: 900, fontSize: 15, color: summary.total_due > 0 ? '#EF4444' : '#10B981', whiteSpace: 'nowrap' }}>₹{fmtINR(summary.total_due)}</td>
                <td colSpan={2}/>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
function Avatar({ name, src, size = 38, dark = false }) {
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: dark ? 'rgba(255,255,255,0.15)' : '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 800, color: dark ? '#fff' : '#6366F1', flexShrink: 0, overflow: 'hidden' }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : initial}
    </div>
  )
}

function InvoiceListSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F1F5F9', flexShrink: 0, animation: 'pulse 1.5s infinite' }}/>
          <div style={{ flex: 1 }}>
            <div style={{ height: 13, width: '40%', background: '#F1F5F9', borderRadius: 6, marginBottom: 8, animation: 'pulse 1.5s infinite' }}/>
            <div style={{ height: 10, width: '25%', background: '#F1F5F9', borderRadius: 6, animation: 'pulse 1.5s infinite' }}/>
          </div>
          {[100, 80, 80, 60].map((w, j) => (
            <div key={j} style={{ height: 13, width: w, background: '#F1F5F9', borderRadius: 6, animation: 'pulse 1.5s infinite' }}/>
          ))}
        </div>
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
