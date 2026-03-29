import { useState, useEffect, useRef } from 'react'
import { getLeaves, reviewLeave, deleteLeave, getClasses } from '../../api/leaves'

const STATUS_STYLE = {
  Pending:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  Approved: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  Rejected: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}
const TYPE_ICON = { Medical: '🏥', Family: '👨‍👩‍👧', Personal: '🙂', Other: '📋' }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Review modal ───────────────────────────────────────────────────────────────
function ReviewModal({ leave, onClose, onDone }) {
  const [status,  setStatus]  = useState(leave.status === 'Pending' ? 'Approved' : leave.status)
  const [remarks, setRemarks] = useState(leave.remarks || '')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const st = STATUS_STYLE[leave.status] || STATUS_STYLE.Pending

  async function submit() {
    setLoading(true); setError(null)
    try {
      const res = await reviewLeave(leave.id, { status, remarks })
      const attMarked = res.data.attendance_marked ?? 0
      const attError  = res.data.attendance_error  ?? null
      onDone(res.data.data, attMarked, attError)
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:20, padding:24, width:'100%', maxWidth:460, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ fontSize:16, fontWeight:900, color:'#0F172A' }}>Review Leave</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#94A3B8', lineHeight:1 }}>✕</button>
        </div>

        <div style={{ background:'#F8FAFC', borderRadius:12, padding:'14px 16px', marginBottom:18 }}>
          <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:10 }}>
            <span style={{ fontSize:28, lineHeight:1 }}>{TYPE_ICON[leave.leave_type] || '📋'}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:800, color:'#0F172A' }}>{leave.student?.name} — {leave.leave_type} Leave</div>
              <div style={{ fontSize:12, color:'#64748B', fontWeight:600, marginTop:2 }}>Class {leave.student?.class} {leave.student?.section} · Adm. {leave.student?.admission_no}</div>
            </div>
            <span style={{ flexShrink:0, fontSize:11, fontWeight:800, padding:'4px 10px', borderRadius:20, color:st.color, background:st.bg, border:`1px solid ${st.border}` }}>{leave.status}</span>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:12, color:'#475569', marginBottom:8 }}>
            <span>📅</span>
            <span style={{ fontWeight:700 }}>{fmtDate(leave.from_date)}</span>
            <span>→</span>
            <span style={{ fontWeight:700 }}>{fmtDate(leave.to_date)}</span>
            <span style={{ marginLeft:4, background:'#E2E8F0', color:'#475569', borderRadius:20, padding:'2px 8px', fontWeight:700 }}>{leave.total_days}d</span>
          </div>
          <div style={{ fontSize:13, color:'#374151', lineHeight:1.5, background:'#fff', borderRadius:8, padding:'8px 10px' }}>{leave.reason}</div>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Decision</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {['Approved','Rejected'].map(s => (
              <button key={s} onClick={() => setStatus(s)} style={{
                border: status===s ? `2px solid ${s==='Approved'?'#10B981':'#EF4444'}` : '1.5px solid #E2E8F0',
                background: status===s ? (s==='Approved'?'#ECFDF5':'#FEF2F2') : '#F8FAFC',
                borderRadius:10, padding:'12px 8px', cursor:'pointer', fontSize:14, fontWeight:800,
                color: status===s ? (s==='Approved'?'#065F46':'#DC2626') : '#64748B',
              }}>
                {s === 'Approved' ? '✓ Approve' : '✗ Reject'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:18 }}>
          <label style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, display:'block' }}>
            Remarks <span style={{ color:'#94A3B8', fontWeight:400 }}>(optional)</span>
          </label>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Add a note to the parent..."
            style={{ width:'100%', border:'1.5px solid #E2E8F0', borderRadius:10, padding:'10px 12px', fontSize:13, resize:'none', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
        </div>

        {error && <div style={{ background:'#FEF2F2', borderRadius:8, padding:'8px 12px', marginBottom:14, fontSize:13, color:'#DC2626', fontWeight:600 }}>{error}</div>}

        <button onClick={submit} disabled={loading} style={{
          width:'100%', padding:'13px', borderRadius:12, border:'none',
          background: loading ? '#A5B4FC' : status==='Approved' ? '#10B981' : '#EF4444',
          color:'#fff', fontSize:14, fontWeight:800, cursor: loading ? 'default' : 'pointer',
        }}>
          {loading ? 'Saving…' : `${status} Leave`}
        </button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
const PER_PAGE = 20

export default function Leaves() {
  const [rows,      setRows]      = useState([])
  const [classes,   setClasses]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [summary,   setSummary]   = useState({})
  const [meta,      setMeta]      = useState({ page:1, last_page:1, total:0 })
  const [reviewing,  setReviewing]  = useState(null)
  const [deleting,   setDeleting]   = useState(null)  // leave object pending confirm
  const [deleteLoad, setDeleteLoad] = useState(false)
  const [toast,      setToast]      = useState(null)

  // Filters (all server-side)
  const [statusFilter, setStatusFilter] = useState('')
  const [classFilter,  setClassFilter]  = useState('')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)

  const searchTimer = useRef(null)

  useEffect(() => {
    getClasses().then(res => setClasses(res.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    fetchLeaves()
  }, [statusFilter, classFilter, page])

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      fetchLeaves({ searchOverride: search })
    }, 350)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  function fetchLeaves(opts = {}) {
    const s = opts.searchOverride !== undefined ? opts.searchOverride : search
    setLoading(true); setError(null)
    const params = { per_page: PER_PAGE, page }
    if (statusFilter) params.status   = statusFilter
    if (classFilter)  params.class_id = classFilter
    if (s)            params.search   = s
    getLeaves(params)
      .then(res => {
        setRows(res.data.data || [])
        setSummary(res.data.summary || {})
        setMeta(res.data.meta || { page:1, last_page:1, total:0 })
      })
      .catch(() => setError('Could not load leave requests.'))
      .finally(() => setLoading(false))
  }

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function handleReviewDone(updated, attMarked = 0, attError = null) {
    setRows(prev => prev.map(l => l.id === updated.id ? updated : l))
    setSummary(prev => ({
      ...prev,
      pending:  (prev.pending  ?? 0) + (updated.status === 'Pending'  ? 1 : 0) - (reviewing?.status === 'Pending'  ? 1 : 0),
      approved: (prev.approved ?? 0) + (updated.status === 'Approved' ? 1 : 0) - (reviewing?.status === 'Approved' ? 1 : 0),
      rejected: (prev.rejected ?? 0) + (updated.status === 'Rejected' ? 1 : 0) - (reviewing?.status === 'Rejected' ? 1 : 0),
    }))
    setReviewing(null)
    if (updated.status === 'Approved') {
      if (attError) {
        showToast(`Leave approved. Attendance warning: ${attError}`, false)
      } else {
        showToast(`Leave approved. ${attMarked} attendance day(s) marked as Leave.`)
      }
    } else {
      showToast(`Leave ${updated.status.toLowerCase()} successfully.`)
    }
  }

  function handleFilterChange(key, val) {
    if (key === 'status') setStatusFilter(val)
    if (key === 'class')  setClassFilter(val)
    setPage(1)
  }

  async function handleDeleteConfirm() {
    if (!deleting) return
    setDeleteLoad(true)
    try {
      await deleteLeave(deleting.id)
      setRows(prev => prev.filter(l => l.id !== deleting.id))
      setSummary(prev => ({
        ...prev,
        total:    (prev.total    ?? 1) - 1,
        pending:  (prev.pending  ?? 0) - (deleting.status === 'Pending'  ? 1 : 0),
        approved: (prev.approved ?? 0) - (deleting.status === 'Approved' ? 1 : 0),
        rejected: (prev.rejected ?? 0) - (deleting.status === 'Rejected' ? 1 : 0),
      }))
      setDeleting(null)
      showToast('Leave record deleted.')
    } catch (e) {
      showToast(e?.response?.data?.message || 'Could not delete.', false)
      setDeleting(null)
    } finally {
      setDeleteLoad(false)
    }
  }

  const TH = ({ children, w }) => (
    <th style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:800, color:'#64748B', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap', width: w || 'auto', background:'#F8FAFC', borderBottom:'2px solid #E2E8F0' }}>
      {children}
    </th>
  )

  return (
    <div style={{ padding:'20px 24px' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} tr:hover td{background:#F8FAFC!important}`}</style>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:900, color:'#0F172A', margin:0 }}>📋 Leave Requests</h1>
        <p style={{ fontSize:13, color:'#64748B', margin:'4px 0 0', fontWeight:500 }}>Review and manage student leave applications</p>
      </div>

      {/* Summary quick-filter pills */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        {[
          ['',         `📋 All (${summary.total??0})`,          '#6366F1','#EEF2FF'],
          ['Pending',  `⏳ Pending (${summary.pending??0})`,    '#D97706','#FFFBEB'],
          ['Approved', `✅ Approved (${summary.approved??0})`,  '#059669','#ECFDF5'],
          ['Rejected', `❌ Rejected (${summary.rejected??0})`,  '#DC2626','#FEF2F2'],
        ].map(([val, label, color, bg]) => (
          <button key={val} onClick={() => handleFilterChange('status', val)} style={{
            padding:'8px 16px', borderRadius:9,
            border: `1.5px solid ${statusFilter===val ? color : '#E2E8F0'}`,
            background: statusFilter===val ? bg : '#fff',
            color: statusFilter===val ? color : '#64748B',
            fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Search + class filter row */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', background:'#fff', borderRadius:12, padding:12, boxShadow:'0 1px 6px rgba(0,0,0,0.06)' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', fontSize:13 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search student name or admission no…"
            style={{ width:'100%', paddingLeft:30, paddingRight:10, paddingTop:8, paddingBottom:8, borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:12, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
          />
        </div>
        <select
          value={classFilter}
          onChange={e => handleFilterChange('class', e.target.value)}
          style={{ flex:1, minWidth:140, padding:'8px 10px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:13, outline:'none', fontFamily:'inherit', color:'#374151', fontWeight:600, background:'#fff' }}
        >
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>Class {c.name}</option>)}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'12px 16px', marginBottom:16 }}>
          <span style={{ color:'#DC2626', fontSize:13, fontWeight:600 }}>⚠️ {error}</span>
        </div>
      )}

      {/* Data table */}
      <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 8px rgba(0,0,0,0.07)', border:'1px solid #E2E8F0', overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:780 }}>
          <thead>
            <tr>
              <TH w={40}>#</TH>
              <TH>Student</TH>
              <TH w={100}>Class</TH>
              <TH w={110}>Leave Type</TH>
              <TH w={110}>From</TH>
              <TH w={110}>To</TH>
              <TH w={60}>Days</TH>
              <TH w={100}>Status</TH>
              <TH w={110}>Applied On</TH>
              <TH w={120}>Action</TH>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: PER_PAGE }, (_, i) => (
              <tr key={i}>
                {Array.from({ length: 10 }, (_, j) => (
                  <td key={j} style={{ padding:'12px 14px', borderBottom:'1px solid #F1F5F9' }}>
                    <div style={{ height:12, background:'#E2E8F0', borderRadius:4, animation:'pulse 1.5s infinite', width: j===1?'80%':'60%' }}/>
                  </td>
                ))}
              </tr>
            ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign:'center', padding:'60px 20px', color:'#94A3B8' }}>
                  <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
                  <div style={{ fontSize:14, fontWeight:600 }}>No leave requests found</div>
                </td>
              </tr>
            )}

            {!loading && rows.map((leave, idx) => {
              const st = STATUS_STYLE[leave.status] || STATUS_STYLE.Pending
              const rowNum = (meta.page - 1) * PER_PAGE + idx + 1
              return (
                <tr key={leave.id}>
                  <td style={{ padding:'12px 14px', borderBottom:'1px solid #F1F5F9', fontSize:12, color:'#94A3B8', fontWeight:600 }}>{rowNum}</td>

                  <td style={{ padding:'12px 14px', borderBottom:'1px solid #F1F5F9' }}>
                    <div style={{ fontSize:13, fontWeight:800, color:'#0F172A' }}>{leave.student?.name || '—'}</div>
                    <div style={{ fontSize:11, color:'#94A3B8', fontWeight:600 }}>{leave.student?.admission_no}</div>
                  </td>

                  <td style={{ padding:'12px 14px', borderBottom:'1px solid #F1F5F9', fontSize:12, fontWeight:700, color:'#374151' }}>
                    {leave.student?.class} {leave.student?.section}
                  </td>

                  <td style={{ padding:'12px 14px', borderBottom:'1px solid #F1F5F9' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:'#374151' }}>
                      {TYPE_ICON[leave.leave_type]} {leave.leave_type}
                    </span>
                  </td>

                  <td style={{ padding:'12px 14px', borderBottom:'1px solid #F1F5F9', fontSize:12, color:'#374151', fontWeight:600 }}>
                    {fmtDate(leave.from_date)}
                  </td>

                  <td style={{ padding:'12px 14px', borderBottom:'1px solid #F1F5F9', fontSize:12, color:'#374151', fontWeight:600 }}>
                    {fmtDate(leave.to_date)}
                  </td>

                  <td style={{ padding:'12px 14px', borderBottom:'1px solid #F1F5F9' }}>
                    <span style={{ fontSize:12, fontWeight:800, color:'#6366F1', background:'#EEF2FF', borderRadius:20, padding:'2px 8px' }}>
                      {leave.total_days}d
                    </span>
                  </td>

                  <td style={{ padding:'12px 14px', borderBottom:'1px solid #F1F5F9' }}>
                    <span style={{ fontSize:11, fontWeight:800, padding:'4px 10px', borderRadius:20, color:st.color, background:st.bg, border:`1px solid ${st.border}`, whiteSpace:'nowrap' }}>
                      {leave.status}
                    </span>
                  </td>

                  <td style={{ padding:'12px 14px', borderBottom:'1px solid #F1F5F9', fontSize:12, color:'#64748B', fontWeight:600 }}>
                    {fmtDate(leave.applied_at)}
                  </td>

                  <td style={{ padding:'12px 14px', borderBottom:'1px solid #F1F5F9' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button
                        onClick={() => setReviewing(leave)}
                        style={{
                          background: leave.status==='Pending' ? '#6366F1' : '#F1F5F9',
                          color: leave.status==='Pending' ? '#fff' : '#374151',
                          border:'none', borderRadius:8, padding:'6px 10px', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
                        }}
                      >
                        {leave.status === 'Pending' ? 'Review' : 'Update'}
                      </button>
                      <button
                        onClick={() => setDeleting(leave)}
                        title="Delete record"
                        style={{ background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA', borderRadius:8, padding:'6px 8px', fontSize:13, cursor:'pointer', lineHeight:1 }}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:16, background:'#fff', borderRadius:12, padding:'12px 16px', boxShadow:'0 1px 6px rgba(0,0,0,0.06)' }}>
          <span style={{ fontSize:12, color:'#64748B' }}>
            Showing {(meta.page - 1) * PER_PAGE + 1}–{Math.min(meta.page * PER_PAGE, meta.total)} of {meta.total} records
          </span>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #E2E8F0', background: page<=1?'#F8FAFC':'#fff', color: page<=1?'#CBD5E1':'#374151', fontSize:12, fontWeight:700, cursor: page<=1?'not-allowed':'pointer' }}
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(meta.last_page, 7) }, (_, i) => {
              // Show pages near current
              let p = i + 1
              if (meta.last_page > 7) {
                const start = Math.max(1, page - 3)
                p = start + i
                if (p > meta.last_page) return null
              }
              return (
                <button key={p} onClick={() => setPage(p)} style={{
                  padding:'6px 11px', borderRadius:8, border: p===page ? '2px solid #6366F1' : '1px solid #E2E8F0',
                  background: p===page ? '#EEF2FF' : '#fff', color: p===page ? '#4338CA' : '#374151',
                  fontSize:12, fontWeight:700, cursor:'pointer', minWidth:34,
                }}>
                  {p}
                </button>
              )
            })}
            <button
              disabled={page >= meta.last_page}
              onClick={() => setPage(p => p + 1)}
              style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #E2E8F0', background: page>=meta.last_page?'#F8FAFC':'#fff', color: page>=meta.last_page?'#CBD5E1':'#374151', fontSize:12, fontWeight:700, cursor: page>=meta.last_page?'not-allowed':'pointer' }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {reviewing && <ReviewModal leave={reviewing} onClose={() => setReviewing(null)} onDone={(updated, attMarked, attError) => handleReviewDone(updated, attMarked, attError)} />}

      {deleting && (
        <div onClick={() => setDeleting(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:20, padding:28, width:'100%', maxWidth:400, textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🗑️</div>
            <div style={{ fontSize:16, fontWeight:900, color:'#0F172A', marginBottom:8 }}>Delete Leave Record?</div>
            <div style={{ fontSize:13, color:'#64748B', marginBottom:6 }}>
              <strong>{deleting.student?.name}</strong> — {deleting.leave_type} leave
            </div>
            <div style={{ fontSize:12, color:'#94A3B8', marginBottom:24 }}>
              {deleting.from_date} → {deleting.to_date} · <span style={{ color: STATUS_STYLE[deleting.status]?.color }}>{deleting.status}</span>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setDeleting(null)} style={{ flex:1, padding:'11px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#F8FAFC', color:'#374151', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleteLoad} style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:'#EF4444', color:'#fff', fontSize:13, fontWeight:800, cursor: deleteLoad ? 'default' : 'pointer', opacity: deleteLoad ? 0.7 : 1 }}>
                {deleteLoad ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div onClick={() => setToast(null)} style={{
          position:'fixed', bottom:24, right:20,
          background: toast.ok ? '#0F172A' : '#EF4444', color:'#fff',
          borderRadius:12, padding:'12px 20px', fontSize:13, fontWeight:700,
          zIndex:999, cursor:'pointer', boxShadow:'0 4px 20px rgba(0,0,0,0.2)',
        }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}
    </div>
  )
}
