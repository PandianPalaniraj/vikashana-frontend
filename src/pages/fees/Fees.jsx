import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useBreakpoint } from '../../hooks/responsive.jsx'
import useAppStore from '../../store/appStore'
import useToast from '../../hooks/useToast'
import DataTable from '../../components/ui/DataTable'
import Avatar from '../../components/ui/Avatar'
import Toast from '../../components/ui/Toast'
import WABtn from '../../components/ui/WABtn'
import FeeSettingsModal from './FeeSettingsModal'
import { openWA, invMsg, rcptMsg, printInvoicePDF, printReceiptPDF } from './feeHelpers'
import { fmt, fmtDate, todayStr } from '../../helpers/format'
import { PAYMENT_MODES, FEE_STATUS_META, SCHOOL } from '../../constants'

// ── API helpers ──────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const apiFetch = async (path, opts = {}) => {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', ...(opts.headers || {}) },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || 'Request failed')
  return json
}

// UI payment mode → API method value
const MODE_MAP = { Cash: 'Cash', UPI: 'Online', 'Bank Transfer': 'Online', Cheque: 'Cheque', DD: 'DD', Card: 'Card' }

// Extract student display object from an invoice
const getStudent = inv => {
  const s = inv.student || {}
  return {
    id: s.id,
    name: s.name || 'Unknown',
    class: s.class?.name || '',
    section: s.section?.name || '',
    phone: s.parents?.[0]?.phone || '',
    guardian: s.parents?.[0]?.name || '',
    admission_no: s.admission_no || '',
  }
}

const SB = ({ st }) => {
  const m = FEE_STATUS_META[st] || FEE_STATUS_META.Unpaid
  return <span style={{ background: m.bg, color: m.c, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{m.l}</span>
}

const SkeletonRow = () => (
  <tr>
    {[180, 160, 80, 140, 80, 70, 70, 80, 60, 100].map((w, i) => (
      <td key={i} style={{ padding: '10px 12px' }}>
        <div style={{ height: 12, width: w, background: '#F1F5F9', borderRadius: 4, animation: 'pulse 1.4s ease-in-out infinite' }} />
      </td>
    ))}
  </tr>
)

export default function Fees() {
  const bp       = useBreakpoint()
  const isMobile = bp === 'mobile'
  const { feeTypes, setFeeTypes, setClasses: setStoreClasses } = useAppStore()

  // ── State ──────────────────────────────────────────────────────────────────
  const [view, setView]           = useState('invoices')
  const [invs, setInvs]           = useState([])
  const [meta, setMeta]           = useState({ page: 1, total: 0, per_page: 20, last_page: 1 })
  const [page, setPage]           = useState(1)
  const [kpi, setKpi]             = useState({ billed: 0, collected: 0, due: 0, unpaid: 0, partial: 0, paid: 0 })
  const [academicYears, setAcademicYears] = useState([])
  const [yrId, setYrId]           = useState(null)
  const [classes, setClasses]     = useState([])
  const [allStudents, setAllStudents] = useState([])

  const [fSts, setFSts]           = useState('')
  const [fCls, setFCls]           = useState('')
  const [srch, setSrch]           = useState('')
  const srchRef                   = useRef('')

  const [payInvs, setPayInvs]     = useState([])   // invoices with payments for pay/receipt tabs
  const [loadingPay, setLoadingPay] = useState(false)

  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [toast, showToast]        = useToast()
  const [createM, setCreateM]     = useState(false)
  const [payM, setPayM]           = useState(null)
  const [detailM, setDetailM]     = useState(null)
  const [rcptM, setRcptM]         = useState(null)
  const [settM, setSettM]         = useState(false)
  const [deleteId, setDeleteId]   = useState(null)
  const [editM, setEditM]         = useState(null)
  const [ef, setEf]               = useState({ due_date: '', notes: '', items: [] })

  const bPay = () => ({ amt: '', mode: 'Cash', date: todayStr(), chq: '', upi: '', reference: '', note: '' })
  const [pf, setPf] = useState(bPay())
  const [cf, setCf] = useState({ student_id: '', items: [], dueDate: '', notes: '', yrId: null, mode: 'individual', bulkClass: '', bulkClassId: null, bulkSection: '', month: '' })

  // ── API calls ──────────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    try {
      const r = await apiFetch('/fees/summary')
      if (r.success) setKpi(r.data)
    } catch (_) {}
  }, [])

  const fetchInvoices = useCallback(async (pg = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: pg, per_page: 20 })
      if (fSts) params.set('status', fSts)
      if (fCls) params.set('class_id', fCls)
      if (srchRef.current) params.set('search', srchRef.current)
      const r = await apiFetch(`/fees/invoices?${params}`)
      if (r.success) {
        setInvs(r.data)
        setMeta(r.meta || { page: pg, total: r.data.length, per_page: 20, last_page: 1 })
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [fSts, fCls])

  const searchTimer = useRef(null)
  const handleSrch = v => {
    setSrch(v)
    srchRef.current = v
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchInvoices(1), 400)
  }

  const goPage = pg => { setPage(pg); fetchInvoices(pg) }

  const fetchPayInvs = useCallback(async () => {
    setLoadingPay(true)
    try {
      const params = new URLSearchParams({ with_payments: 1, per_page: 200 })
      if (fCls) params.set('class_id', fCls)
      const r = await apiFetch(`/fees/invoices?${params}`)
      if (r.success) setPayInvs(r.data)
    } catch (_) {}
    setLoadingPay(false)
  }, [fCls])

  // ── Mount: load academic years, classes, students, summary ─────────────────
  useEffect(() => {
    apiFetch('/academic-years').then(r => {
      if (r.success && r.data?.length) {
        setAcademicYears(r.data)
        const cur = r.data.find(y => y.is_current) || r.data[0]
        setYrId(cur.id)
        setCf(f => ({ ...f, yrId: cur.id }))
      }
    }).catch(() => {})

    apiFetch('/classes').then(r => {
      const list = r.data || r.classes || []
      setClasses(list)
    }).catch(() => {})

    apiFetch('/students?per_page=200&status=Active').then(r => {
      if (r.success) setAllStudents(r.data || [])
    }).catch(() => {})

    fetchSummary()
    fetchInvoices(1)
  }, []) // eslint-disable-line

  // Re-fetch when status/class filters change
  useEffect(() => {
    setPage(1)
    fetchInvoices(1)
  }, [fSts, fCls]) // eslint-disable-line

  // ── Create form helpers ────────────────────────────────────────────────────
  const autofill = student_id => {
    const s = allStudents.find(x => x.id === Number(student_id) || x.id === student_id)
    const clsName = s?.class?.name || ''
    const items = feeTypes.filter(ft => ft.active).map(ft => ({
      label: ft.name, amount: ft.defaultAmounts?.[clsName] || 0, on: true,
    }))
    setCf(f => ({ ...f, student_id, items }))
  }

  const autofillClass = (clsName, clsId) => {
    const items = feeTypes.filter(ft => ft.active).map(ft => ({
      label: ft.name, amount: ft.defaultAmounts?.[clsName] || 0, on: true,
    }))
    setCf(f => ({ ...f, bulkClass: clsName, bulkClassId: clsId, items }))
  }

  const resetCf = () => setCf({ student_id: '', items: [], dueDate: '', notes: '', yrId: yrId, mode: 'individual', bulkClass: '', bulkClassId: null, bulkSection: '', month: '' })

  // ── Create invoice ─────────────────────────────────────────────────────────
  const createInv = async () => {
    const items = cf.items.filter(i => i.on && Number(i.amount) > 0).map(i => ({ label: i.label, amount: Number(i.amount) }))
    if (!items.length) { showToast('Add at least one fee item', 'error'); return }

    let body
    if (cf.mode === 'class') {
      if (!cf.bulkClassId) { showToast('Select a class', 'error'); return }
      body = { class_id: cf.bulkClassId, academic_year_id: cf.yrId, month: cf.month || undefined, items, due_date: cf.dueDate || undefined, notes: cf.notes || undefined }
      if (cf.bulkSection) body.section_id = cf.bulkSection
    } else {
      if (!cf.student_id) { showToast('Select a student', 'error'); return }
      body = { student_id: cf.student_id, academic_year_id: cf.yrId, month: cf.month || undefined, items, due_date: cf.dueDate || undefined, notes: cf.notes || undefined }
    }

    setSaving(true)
    try {
      const r = await apiFetch('/fees/invoices', { method: 'POST', body: JSON.stringify(body) })
      if (r.success) {
        setCreateM(false)
        resetCf()
        await Promise.all([fetchInvoices(1), fetchSummary()])
        setPage(1)
        showToast(r.message || 'Invoice(s) created')
      }
    } catch (e) { showToast(e.message, 'error') }
    setSaving(false)
  }

  // ── Record payment ─────────────────────────────────────────────────────────
  const recordPay = async () => {
    const amt = Number(pf.amt)
    const bal = payM.total - payM.paid
    if (!amt || amt <= 0) { showToast('Enter valid amount', 'error'); return }
    if (amt > bal) { showToast(`Max payable: ${fmt(bal)}`, 'error'); return }

    setSaving(true)
    try {
      const body = {
        amount: amt,
        method: MODE_MAP[pf.mode] || pf.mode,
        reference: pf.chq || pf.upi || pf.reference || '',
        paid_at: pf.date,
      }
      const r = await apiFetch(`/fees/invoices/${payM.id}/pay`, { method: 'POST', body: JSON.stringify(body) })
      if (r.success) {
        setPayM(null)
        setPf(bPay())
        await Promise.all([fetchInvoices(page), fetchSummary(), fetchPayInvs()])
        showToast(`Payment ${fmt(amt)} recorded via ${pf.mode}`)
      }
    } catch (e) { showToast(e.message, 'error') }
    setSaving(false)
  }

  // ── View invoice detail ────────────────────────────────────────────────────
  const openDetail = async inv => {
    setDetailM(inv)
    setLoadingDetail(true)
    try {
      const r = await apiFetch(`/fees/invoices/${inv.id}`)
      if (r.success) setDetailM({ ...inv, ...r.data, payments: r.data.payments || [] })
    } catch (e) { showToast(e.message, 'error') }
    setLoadingDetail(false)
  }

  // ── Delete invoice ─────────────────────────────────────────────────────────
  const deleteInv = async id => {
    setSaving(true)
    try {
      await apiFetch(`/fees/invoices/${id}`, { method: 'DELETE' })
      setDeleteId(null)
      await Promise.all([fetchInvoices(page), fetchSummary()])
      showToast('Invoice deleted')
    } catch (e) { showToast(e.message, 'error') }
    setSaving(false)
  }

  // ── Edit invoice ───────────────────────────────────────────────────────────
  const openEditInv = async inv => {
    setEf({ due_date: inv.due_date || '', notes: inv.notes || '', items: (inv.items || []).map(i => ({ ...i })) })
    setEditM(inv)
    try {
      const r = await apiFetch(`/fees/invoices/${inv.id}`)
      if (r.success) {
        setEditM({ ...inv, ...r.data })
        setEf({ due_date: r.data.due_date || '', notes: r.data.notes || '', items: (r.data.items || []).map(i => ({ ...i })) })
      }
    } catch (_) {}
  }

  const saveEditInv = async () => {
    if (!editM) return
    setSaving(true)
    try {
      const body = { due_date: ef.due_date || undefined, notes: ef.notes || undefined, items: ef.items.map(i => ({ label: i.label, amount: Number(i.amount) })) }
      const r = await apiFetch(`/fees/invoices/${editM.id}`, { method: 'PUT', body: JSON.stringify(body) })
      if (r.success) {
        setEditM(null)
        await Promise.all([fetchInvoices(page), fetchSummary()])
        showToast('Invoice updated')
      }
    } catch (e) { showToast(e.message, 'error') }
    setSaving(false)
  }

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  const sendInvWA = inv => {
    const s = getStudent(inv)
    printInvoicePDF(inv, s)
    openWA(s.phone, invMsg(inv, s))
    setInvs(p => p.map(i => i.id === inv.id ? { ...i, wa_sent: true } : i))
    showToast(`PDF downloading — attach it via 📎 in WhatsApp`)
  }

  const sendRcptWA = (inv, pmt) => {
    const s = getStudent(inv)
    printReceiptPDF(inv, pmt, s)
    openWA(s.phone, rcptMsg(inv, pmt, s))
    setInvs(p => p.map(i => i.id === inv.id ? { ...i, rcpt_sent: true } : i))
    if (detailM?.id === inv.id) setDetailM(d => d ? { ...d, rcpt_sent: true } : d)
    showToast(`PDF downloading — attach it via 📎 in WhatsApp`)
  }

  // ── Derived rows for Payments / Receipts tabs ──────────────────────────────
  const payRows = useMemo(() => payInvs.flatMap(inv => {
    const payments = inv.payments || []
    if (!payments.length) return []
    return payments.filter(p =>
      !srch ||
      (inv.student?.name || '').toLowerCase().includes(srch.toLowerCase()) ||
      String(p.id).toLowerCase().includes(srch.toLowerCase())
    ).map(p => ({ ...p, inv, s: getStudent(inv) }))
  }), [payInvs, srch])

  const rcptRows = useMemo(() => payInvs.flatMap(inv => {
    const payments = inv.payments || []
    if (!payments.length) return []
    return payments.filter(p =>
      !srch || (inv.student?.name || '').toLowerCase().includes(srch.toLowerCase())
    ).map(p => ({ ...p, inv, s: getStudent(inv) }))
  }), [payInvs, srch])

  // ── KPI display values ─────────────────────────────────────────────────────
  const collPct = kpi.billed > 0 ? Math.round((kpi.collected / kpi.billed) * 100) : 0
  const kpiCards = [
    { l: 'Total Billed',  v: fmt(kpi.billed    || 0), c: '#6366F1', bg: '#EEF2FF', i: '📋' },
    { l: 'Collected',     v: fmt(kpi.collected  || 0), c: '#10B981', bg: '#ECFDF5', i: '✅' },
    { l: 'Outstanding',   v: fmt(kpi.due        || 0), c: '#EF4444', bg: '#FEF2F2', i: '⏳' },
    { l: 'Unpaid',        v: kpi.unpaid  || 0,         c: '#3B82F6', bg: '#EFF6FF', i: '📤' },
    { l: 'Partial',       v: kpi.partial || 0,         c: '#DC2626', bg: '#FEE2E2', i: '🚨' },
  ]

  // ── Columns ────────────────────────────────────────────────────────────────
  const iCols = [
    { key: 'id',      label: 'Invoice #', render: (_, r) => <span style={{ fontWeight: 700, color: '#6366F1', fontSize: 12 }}>{r.id}</span> },
    { key: 'student', label: 'Student', sortable: false, render: (_, r) => {
      const s = getStudent(r)
      return <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={s.name} /><div><div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div><div style={{ fontSize: 10, color: '#94A3B8' }}>{s.guardian} · {s.phone}</div></div></div>
    }},
    { key: 'cls',     label: 'Class', sortable: false, render: (_, r) => { const s = getStudent(r); return `${s.class}-${s.section}` } },
    { key: 'items',   label: 'Fees', sortable: false, render: (_, r) => (
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 170 }}>
        {r.month && <span style={{ background: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>📅 {r.month}</span>}
        {(r.items || []).map(i => <span key={i.label} style={{ background: '#EEF2FF', color: '#6366F1', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{i.label}</span>)}
      </div>
    )},
    { key: 'total',   label: 'Total',   render: v => <span style={{ fontWeight: 700 }}>{fmt(v)}</span> },
    { key: 'paid',    label: 'Paid',    render: v => <span style={{ fontWeight: 700, color: '#10B981' }}>{fmt(v)}</span> },
    { key: 'bal',     label: 'Balance', sortable: false, render: (_, r) => { const b = r.total - r.paid; return <span style={{ fontWeight: 700, color: b > 0 ? '#EF4444' : '#10B981' }}>{b > 0 ? fmt(b) : '—'}</span> } },
    { key: 'due_date',label: 'Due',     render: v => fmtDate(v) },
    { key: 'status',  label: 'Status',  render: v => <SB st={v} /> },
    { key: 'act',     label: 'Actions', sortable: false, render: (_, r) => (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <button onClick={() => openDetail(r)} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 6, padding: '4px 9px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>👁</button>
        {r.status !== 'Paid' && <button onClick={() => { setPayM(r); setPf({ ...bPay(), amt: String(r.total - r.paid) }) }} style={{ background: '#ECFDF5', color: '#059669', border: 'none', borderRadius: 6, padding: '4px 9px', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>💳</button>}
        <button onClick={() => openEditInv(r)} style={{ background: '#EEF2FF', color: '#6366F1', border: 'none', borderRadius: 6, padding: '4px 9px', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>✏️ Edit</button>
        <button onClick={() => setDeleteId(r.id)} style={{ background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '4px 9px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>🗑</button>
      </div>
    )},
  ]

  const pCols = [
    { key: 'id',        label: 'Receipt #', render: v => <span style={{ fontWeight: 700, color: '#6366F1', fontSize: 12 }}>{v}</span> },
    { key: 'invId',     label: 'Invoice', sortable: false, render: (_, r) => <span style={{ color: '#94A3B8', fontSize: 11 }}>{r.inv.id}</span> },
    { key: 'name',      label: 'Student', sortable: false, render: (_, r) => <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={r.s.name} /><div><div style={{ fontWeight: 600, fontSize: 13 }}>{r.s.name}</div><div style={{ fontSize: 10, color: '#94A3B8' }}>{r.s.class}-{r.s.section}</div></div></div> },
    { key: 'paid_at',   label: 'Paid On', render: v => fmtDate(v) },
    { key: 'amount',    label: 'Amount', render: v => <span style={{ fontWeight: 800, color: '#059669' }}>{fmt(v)}</span> },
    { key: 'method',    label: 'Mode', render: v => <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{v}</span> },
    { key: 'reference', label: 'Ref', sortable: false, render: v => v || '—' },
    { key: 'note',      label: 'Note', render: v => v || '—' },
    { key: 'bal',       label: 'Inv Balance', sortable: false, render: (_, r) => { const b = r.inv.total - r.inv.paid; return <span style={{ fontWeight: 700, color: b > 0 ? '#EF4444' : '#10B981' }}>{b > 0 ? fmt(b) : 'Cleared ✓'}</span> } },
    { key: 'st',        label: 'Status', sortable: false, render: (_, r) => <SB st={r.inv.status} /> },
  ]

  const rCols = [
    { key: 'id',        label: 'Receipt #', render: v => <span style={{ fontWeight: 700, color: '#059669', fontSize: 12 }}>{v}</span> },
    { key: 'stu',       label: 'Student / Parent', sortable: false, render: (_, r) => <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={r.s.name} /><div><div style={{ fontWeight: 600, fontSize: 13 }}>{r.s.name}</div><div style={{ fontSize: 10, color: '#94A3B8' }}>👤 {r.s.guardian} · 📱 {r.s.phone}</div></div></div> },
    { key: 'paid_at',   label: 'Paid On', render: v => fmtDate(v) },
    { key: 'amount',    label: 'Paid', render: v => <span style={{ fontWeight: 800, color: '#059669' }}>{fmt(v)}</span> },
    { key: 'method',    label: 'Mode', render: v => <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{v}</span> },
    { key: 'fees',      label: 'Fee Items', sortable: false, render: (_, r) => <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>{(r.inv.items || []).map(i => <span key={i.label} style={{ background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{i.label}</span>)}</div> },
    { key: 'bal',       label: 'Balance', sortable: false, render: (_, r) => { const b = r.inv.total - r.inv.paid; return <span style={{ fontWeight: 700, color: b > 0 ? '#F59E0B' : '#059669' }}>{b > 0 ? fmt(b) : 'Nil ✓'}</span> } },
    { key: 'st',        label: 'Status', sortable: false, render: (_, r) => <SB st={r.inv.status} /> },
    { key: 'wa',        label: 'WA Sent', sortable: false, render: (_, r) => r.inv.rcpt_sent ? <span style={{ color: '#059669', fontWeight: 700 }}>✅</span> : <span style={{ color: '#94A3B8' }}>—</span> },
    { key: 'act',       label: 'Actions', sortable: false, render: (_, r) => <div style={{ display: 'flex', gap: 5 }}><button onClick={() => setRcptM({ inv: r.inv, pmt: r })} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 6, padding: '4px 9px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>👁</button><WABtn sent={r.inv.rcpt_sent} onClick={() => sendRcptWA(r.inv, r)} label='Send' /></div> },
  ]

  const saveSettings = (ft, cls) => { setFeeTypes(ft); setStoreClasses(cls); setSettM(false); showToast('Fee settings saved!') }

  // ── Pagination info ────────────────────────────────────────────────────────
  const pageStart = (meta.page - 1) * meta.per_page + 1
  const pageEnd   = Math.min(meta.page * meta.per_page, meta.total)

  // ── Render ─────────────────────────────────────────────────────────────────
  return <>
    {/* Tabs */}
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ background: '#F1F5F9', borderRadius: 8, padding: 4, display: 'flex', gap: 4 }}>
        {[['invoices','📄 Invoices'], ['payments','💳 Payments'], ['receipts','🧾 Receipts']].map(([v, l]) => (
          <button key={v} onClick={() => { setView(v); if (v === 'payments' || v === 'receipts') fetchPayInvs() }} style={{ padding: '6px 13px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === v ? '#fff' : 'transparent', color: view === v ? '#6366F1' : '#64748B', boxShadow: view === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            {l}
            {v === 'receipts' && rcptRows.filter(r => !r.inv.rcpt_sent).length > 0 && <span style={{ marginLeft: 4, background: '#F59E0B', color: '#fff', borderRadius: 99, fontSize: 9, padding: '1px 5px', fontWeight: 800 }}>{rcptRows.filter(r => !r.inv.rcpt_sent).length}</span>}
          </button>
        ))}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <button onClick={() => setSettM(true)} style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>⚙️ Fee Settings</button>
        <button onClick={() => setCreateM(true)} style={{ background: '#6366F1', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>+ Create Invoice</button>
      </div>
    </div>

    {/* KPIs */}
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap: 12, marginBottom: 14 }}>
      {kpiCards.map(s => (
        <div key={s.l} style={{ background: s.bg, borderRadius: 11, padding: '11px 14px', border: `1px solid ${s.c}22` }}>
          <div style={{ fontSize: 19, marginBottom: 4 }}>{s.i}</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: s.c }}>{s.v}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginTop: 1 }}>{s.l}</div>
        </div>
      ))}
    </div>

    {/* Collection bar */}
    <div style={{ background: '#fff', borderRadius: 11, padding: '10px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>Collection</span>
      <div style={{ flex: 1, background: '#F1F5F9', borderRadius: 99, height: 9, overflow: 'hidden' }}><div style={{ width: `${collPct}%`, height: '100%', background: collPct >= 75 ? '#10B981' : collPct >= 50 ? '#F59E0B' : '#EF4444', borderRadius: 99, transition: 'width 0.5s' }} /></div>
      <span style={{ fontSize: 17, fontWeight: 900, color: collPct >= 75 ? '#10B981' : '#EF4444', minWidth: 44 }}>{collPct}%</span>
    </div>

    {/* Filters */}
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
      <input placeholder='🔍 Search student / invoice...' value={srch} onChange={e => handleSrch(e.target.value)} style={{ padding: '8px 13px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', outline: 'none', minWidth: 240 }} />
      <select value={fCls} onChange={e => setFCls(e.target.value)} style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', cursor: 'pointer', outline: 'none' }}>
        <option value=''>All Classes</option>
        {classes.map(c => <option key={c.id} value={c.id}>Class {c.name}</option>)}
      </select>
      {view === 'invoices' && (
        <select value={fSts} onChange={e => setFSts(e.target.value)} style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', cursor: 'pointer', outline: 'none' }}>
          {[['','All Status'], ['Unpaid','Unpaid'], ['Partial','Partial'], ['Paid','Paid']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
      <select value={yrId || ''} onChange={e => setYrId(Number(e.target.value))} style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', cursor: 'pointer', outline: 'none' }}>
        {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
      </select>
      {view === 'receipts' && rcptRows.filter(r => !r.inv.rcpt_sent).length > 0 && (
        <button onClick={() => { const u = rcptRows.filter(r => !r.inv.rcpt_sent); u.forEach((r, i) => setTimeout(() => sendRcptWA(r.inv, r), i * 600)); showToast(`Sending ${u.length} receipts…`) }}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          📲 Send {rcptRows.filter(r => !r.inv.rcpt_sent).length} Unsent
        </button>
      )}
    </div>

    {/* Error banner */}
    {error && (
      <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#DC2626' }}>
        ⚠️ {error}
        <button onClick={() => fetchInvoices(page)} style={{ marginLeft: 'auto', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
      </div>
    )}

    {/* Tables */}
    {view === 'invoices' && (
      <>
        {loading ? (
          <div style={{ background: '#fff', borderRadius: 11, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        ) : (
          <DataTable columns={iCols} data={invs} emptyMsg='No invoices found' />
        )}
        {/* Pagination */}
        {meta.total > meta.per_page && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 12, color: '#64748B' }}>
            <span>Showing {pageStart}–{pageEnd} of {meta.total}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => goPage(page - 1)} disabled={page <= 1 || loading} style={{ padding: '5px 11px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontWeight: 600 }}>← Prev</button>
              <span style={{ padding: '5px 11px', fontWeight: 700 }}>{page} / {meta.last_page}</span>
              <button onClick={() => goPage(page + 1)} disabled={page >= meta.last_page || loading} style={{ padding: '5px 11px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', cursor: page >= meta.last_page ? 'default' : 'pointer', opacity: page >= meta.last_page ? 0.4 : 1, fontWeight: 600 }}>Next →</button>
            </div>
          </div>
        )}
      </>
    )}
    {view === 'payments' && <><div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '9px 14px', marginBottom: 12, fontSize: 12, color: '#1E40AF', fontWeight: 600 }}>💳 Payment transactions — use for daily cash reconciliation</div>{loadingPay ? <div style={{ background: '#fff', borderRadius: 11, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</tbody></table></div> : <DataTable columns={pCols} data={payRows} emptyMsg='No payments yet' />}</>}
    {view === 'receipts' && <><div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 8, padding: '9px 14px', marginBottom: 12, fontSize: 12, color: '#065F46', fontWeight: 600 }}>🧾 Send payment receipts to parents via WhatsApp</div>{loadingPay ? <div style={{ background: '#fff', borderRadius: 11, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</tbody></table></div> : <DataTable columns={rCols} data={rcptRows} emptyMsg='No receipts yet' />}</>}

    {/* ── Create Invoice Modal ─────────────────────────────────────────────── */}
    {createM && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, width: isMobile ? 'calc(100vw - 32px)' : 550, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
          <style>{`
  .create-inv-modal select,
  .create-inv-modal input,
  .create-inv-modal textarea {
    font-size: 16px !important;
    font-family: 'Outfit', 'Segoe UI', sans-serif !important;
    -webkit-text-size-adjust: 100% !important;
    color: #1A202C !important;
  }
  .create-inv-modal select option { font-size: 16px !important; }
  .create-inv-modal label { font-size: 11px !important; }
`}</style>
          <div style={{ background: 'linear-gradient(135deg,#0F172A,#6366F1)', padding: '18px 24px', color: '#fff', borderRadius: '16px 16px 0 0' }}><div style={{ fontWeight: 800, fontSize: 16 }}>📄 Create Invoice</div><div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>Create invoice for one student or a whole class</div></div>
          <div className='create-inv-modal' style={{ padding: 22 }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: '#F1F5F9', borderRadius: 10, padding: 4 }}>
              {[['individual', '👤 Individual Student'], ['class', '🏫 Whole Class']].map(([m, l]) => (
                <button key={m} type='button' onClick={() => setCf(f => ({ ...f, mode: m, student_id: '', bulkClass: '', bulkClassId: null, bulkSection: '', items: [] }))}
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: cf.mode === m ? '#fff' : 'transparent', color: cf.mode === m ? '#6366F1' : '#64748B', boxShadow: cf.mode === m ? '0 1px 6px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Individual: select student */}
            {cf.mode === 'individual' && (
              <div style={{ marginBottom: 13 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Student *</label>
                <select value={cf.student_id} onChange={e => autofill(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}>
                  <option value=''>— Select Student —</option>
                  {allStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.admission_no}) · Class {s.class?.name}-{s.section?.name}</option>)}
                </select>
              </div>
            )}

            {/* Class mode */}
            {cf.mode === 'class' && (
              <div style={{ marginBottom: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Class *</label>
                    <select value={cf.bulkClassId || ''} onChange={e => { const c = classes.find(x => x.id === Number(e.target.value)); if (c) autofillClass(c.name, c.id) }}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}>
                      <option value=''>— Select Class —</option>
                      {classes.map(c => <option key={c.id} value={c.id}>Class {c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Section <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optional)</span></label>
                    <select value={cf.bulkSection} onChange={e => setCf(f => ({ ...f, bulkSection: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}>
                      <option value=''>All Sections</option>
                      {['A','B','C','D'].map(s => <option key={s} value={s}>Section {s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 13 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Year</label>
                <select value={cf.yrId || ''} onChange={e => setCf(f => ({ ...f, yrId: Number(e.target.value) }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 16, fontFamily: 'inherit', outline: 'none' }}>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Due Date</label>
                <input type='date' value={cf.dueDate} onChange={e => setCf(f => ({ ...f, dueDate: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: 13 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Month <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optional)</span></label>
              <select value={cf.month} onChange={e => setCf(f => ({ ...f, month: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}>
                <option value=''>— No specific month —</option>
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {cf.items.length > 0 && (
              <div style={{ marginBottom: 13 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>Fee Items</div>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 9, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#F8FAFC' }}><th style={{ padding: '7px 11px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>✓</th><th style={{ padding: '7px 11px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Fee Type</th><th style={{ padding: '7px 11px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>₹</th></tr></thead>
                    <tbody>
                      {cf.items.map((item, i) => (
                        <tr key={item.label} style={{ borderTop: '1px solid #F1F5F9', background: item.on ? '#F0FDF4' : '#FAFAFA' }}>
                          <td style={{ padding: '7px 11px' }}><input type='checkbox' checked={item.on} onChange={e => setCf(f => ({ ...f, items: f.items.map((it, j) => j === i ? { ...it, on: e.target.checked } : it) }))} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#6366F1' }} /></td>
                          <td style={{ padding: '7px 11px', fontSize: 13, fontWeight: item.on ? 600 : 400, color: item.on ? '#1A202C' : '#94A3B8' }}>{item.label}</td>
                          <td style={{ padding: '7px 11px' }}><input type='number' value={item.amount} disabled={!item.on} onChange={e => setCf(f => ({ ...f, items: f.items.map((it, j) => j === i ? { ...it, amount: e.target.value } : it) }))} style={{ width: 90, padding: '4px 7px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 12, fontWeight: 600, outline: 'none', background: item.on ? '#fff' : '#F8FAFC', color: item.on ? '#1A202C' : '#CBD5E1' }} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr style={{ background: '#F0FDF4', borderTop: '2px solid #A7F3D0' }}><td colSpan={2} style={{ padding: '9px 11px', fontWeight: 800, fontSize: 13 }}>Total</td><td style={{ padding: '9px 11px', fontWeight: 900, fontSize: 15, color: '#059669' }}>{fmt(cf.items.filter(i => i.on).reduce((a, i) => a + Number(i.amount || 0), 0))}</td></tr></tfoot>
                  </table>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Notes</label>
              <textarea value={cf.notes} onChange={e => setCf(f => ({ ...f, notes: e.target.value }))} placeholder='Optional remarks...' style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 16, fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: 50, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setCreateM(false); resetCf() }} style={{ flex: 1, background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 9, padding: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createInv} disabled={saving} style={{ flex: 2, background: '#6366F1', color: '#fff', border: 'none', borderRadius: 9, padding: 11, fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                {saving ? '⏳ Creating…' : '✓ Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ── Pay Modal ────────────────────────────────────────────────────────── */}
    {payM && (() => { const s = getStudent(payM); const bal = payM.total - payM.paid; return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, width: isMobile ? 'calc(100vw - 32px)' : 440, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#0F172A,#059669)', padding: '18px 24px', color: '#fff' }}><div style={{ fontWeight: 800, fontSize: 16 }}>💳 Record Payment</div><div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{s.name} · Balance: {fmt(bal)}</div></div>
          <div style={{ padding: 22 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 10, background: '#F8FAFC', borderRadius: 9, padding: '11px 13px', marginBottom: 16 }}>
              {[['Total', fmt(payM.total), false], ['Paid', fmt(payM.paid), false], ['Balance', fmt(bal), true]].map(([k, v, r]) => (
                <div key={k}><div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>{k}</div><div style={{ fontSize: 14, fontWeight: 800, color: r ? '#EF4444' : '#1A202C', marginTop: 2 }}>{v}</div></div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Amount Paying *</label><input type='number' value={pf.amt} onChange={e => setPf(f => ({ ...f, amt: e.target.value }))} max={bal} style={{ width: '100%', padding: '10px 13px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 15, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} /></div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Payment Mode</label>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {PAYMENT_MODES.map(m => <button key={m} onClick={() => setPf(f => ({ ...f, mode: m }))} style={{ padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: pf.mode === m ? '#0F172A' : '#F1F5F9', color: pf.mode === m ? '#fff' : '#64748B', transition: 'all 0.15s' }}>{m}</button>)}
                </div>
              </div>
              {(pf.mode === 'Cheque' || pf.mode === 'DD') && <div><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Cheque / DD Number</label><input value={pf.chq} onChange={e => setPf(f => ({ ...f, chq: e.target.value }))} placeholder='e.g. 001234' style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} /></div>}
              {pf.mode === 'UPI' && <div><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>UPI Reference</label><input value={pf.upi} onChange={e => setPf(f => ({ ...f, upi: e.target.value }))} placeholder='e.g. T2407151234567' style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} /></div>}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Date</label><input type='date' value={pf.date} onChange={e => setPf(f => ({ ...f, date: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Note</label><input value={pf.note} onChange={e => setPf(f => ({ ...f, note: e.target.value }))} placeholder='Remarks...' style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} /></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setPayM(null)} style={{ flex: 1, background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 9, padding: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={recordPay} disabled={saving} style={{ flex: 2, background: '#059669', color: '#fff', border: 'none', borderRadius: 9, padding: 11, fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>
                {saving ? '⏳ Processing…' : '✓ Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )})()}

    {/* ── Detail Modal ─────────────────────────────────────────────────────── */}
    {detailM && (() => { const s = getStudent(detailM); const bal = detailM.total - detailM.paid; return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, width: isMobile ? 'calc(100vw - 32px)' : 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
          <div style={{ background: 'linear-gradient(135deg,#0F172A,#3B82F6)', padding: '18px 24px', color: '#fff', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div><div style={{ fontWeight: 800, fontSize: 16 }}>Invoice {detailM.id}</div><div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{detailM.month ? `📅 ${detailM.month} · ` : ''}Due {fmtDate(detailM.due_date)}</div></div>
            <SB st={detailM.status} />
          </div>
          <div style={{ padding: 22 }}>
            {loadingDetail ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8', fontSize: 13 }}>Loading details…</div>
            ) : <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F8FAFC', borderRadius: 9, padding: '11px 13px', marginBottom: 16 }}>
                <Avatar name={s.name} size={38} /><div><div style={{ fontWeight: 800, fontSize: 14 }}>{s.name}</div><div style={{ fontSize: 11, color: '#64748B' }}>{s.admission_no} · Class {s.class}-{s.section} · {s.phone}</div></div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
                <thead><tr style={{ background: '#0F172A', color: '#fff' }}><th style={{ padding: '7px 11px', textAlign: 'left', borderRadius: '6px 0 0 0' }}>Fee</th><th style={{ padding: '7px 11px', textAlign: 'right', borderRadius: '0 6px 0 0' }}>Amount</th></tr></thead>
                <tbody>{(detailM.items || []).map(i => <tr key={i.label} style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '8px 11px' }}>{i.label}</td><td style={{ padding: '8px 11px', textAlign: 'right', fontWeight: 700 }}>{fmt(i.amount)}</td></tr>)}</tbody>
                <tfoot>
                  <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}><td style={{ padding: '8px 11px', fontWeight: 700 }}>Total</td><td style={{ padding: '8px 11px', textAlign: 'right', fontWeight: 900, fontSize: 15 }}>{fmt(detailM.total)}</td></tr>
                  <tr style={{ background: '#ECFDF5' }}><td style={{ padding: '7px 11px', fontWeight: 700, color: '#059669' }}>Paid</td><td style={{ padding: '7px 11px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>{fmt(detailM.paid)}</td></tr>
                  {bal > 0 && <tr style={{ background: '#FEF2F2' }}><td style={{ padding: '7px 11px', fontWeight: 700, color: '#DC2626' }}>Balance</td><td style={{ padding: '7px 11px', textAlign: 'right', fontWeight: 800, color: '#DC2626' }}>{fmt(bal)}</td></tr>}
                </tfoot>
              </table>
              {(detailM.payments || []).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 }}>Payment History</div>
                  {(detailM.payments || []).map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0FDF4', borderRadius: 8, padding: '8px 12px', marginBottom: 5, border: '1px solid #A7F3D0' }}>
                      <div><div style={{ fontWeight: 700, fontSize: 13 }}>{p.id}</div><div style={{ fontSize: 11, color: '#64748B' }}>{fmtDate(p.paid_at)} · {p.method}{p.reference ? ` · ${p.reference}` : ''}</div></div>
                      <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}><span style={{ fontWeight: 800, color: '#059669' }}>{fmt(p.amount)}</span><WABtn sent={detailM.rcpt_sent} onClick={() => sendRcptWA(detailM, p)} label='Receipt' /></div>
                    </div>
                  ))}
                </div>
              )}
            </>}
            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={() => setDetailM(null)} style={{ flex: 1, background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 9, padding: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
              {detailM.status !== 'Paid' && <button onClick={() => { setDetailM(null); setPayM(detailM); setPf({ ...bPay(), amt: String(bal) }) }} style={{ flex: 1, background: '#ECFDF5', color: '#059669', border: 'none', borderRadius: 9, padding: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>💳 Pay</button>}
              <WABtn sent={detailM.wa_sent} onClick={() => { sendInvWA(detailM); setDetailM(null) }} label='Invoice' size='md' />
            </div>
          </div>
        </div>
      </div>
    )})()}

    {/* ── Receipt Preview Modal ────────────────────────────────────────────── */}
    {rcptM && (() => { const { inv, pmt } = rcptM; const s = getStudent(inv); const bal = inv.total - inv.paid; return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, width: isMobile ? 'calc(100vw - 32px)' : 400, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
          <div style={{ padding: '24px 24px 0' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #E2E8F0', paddingBottom: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 22 }}>🏫</div>
              <div style={{ fontWeight: 900, fontSize: 16, color: '#0F172A', marginTop: 5 }}>{SCHOOL.name}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{SCHOOL.address}</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>📞 {SCHOOL.phone} · ✉️ {SCHOOL.email}</div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 13 }}><span style={{ background: '#ECFDF5', color: '#059669', padding: '5px 16px', borderRadius: 99, fontSize: 12, fontWeight: 800, border: '1px solid #A7F3D0' }}>🧾 PAYMENT RECEIPT</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, background: '#F8FAFC', borderRadius: 9, padding: '11px 13px', marginBottom: 13 }}>
              {[['Receipt', pmt.id], ['Invoice', inv.id], ['Date', fmtDate(pmt.paid_at)], ['Mode', pmt.method], ['Ref', pmt.reference || '—']].map(([k, v]) => (
                <div key={k}><div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div><div style={{ fontSize: 12, fontWeight: 700, marginTop: 1 }}>{v}</div></div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#F8FAFC', borderRadius: 9, padding: '10px 13px', marginBottom: 13 }}>
              <Avatar name={s.name} size={34} /><div><div style={{ fontWeight: 800, fontSize: 13 }}>{s.name}</div><div style={{ fontSize: 11, color: '#64748B' }}>{s.admission_no} · Class {s.class}-{s.section}</div><div style={{ fontSize: 11, color: '#64748B' }}>👤 {s.guardian} · 📱 {s.phone}</div></div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 4 }}>
              <tbody>{(inv.items || []).map(i => <tr key={i.label} style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '7px 10px' }}>{i.label}</td><td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>{fmt(i.amount)}</td></tr>)}</tbody>
              <tfoot>
                <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}><td style={{ padding: '7px 10px', fontWeight: 700 }}>Total</td><td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 900 }}>{fmt(inv.total)}</td></tr>
                <tr style={{ background: '#ECFDF5' }}><td style={{ padding: '7px 10px', fontWeight: 700, color: '#059669' }}>This Payment</td><td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 900, color: '#059669' }}>{fmt(pmt.amount)}</td></tr>
                {bal > 0 && <tr style={{ background: '#FEF2F2' }}><td style={{ padding: '7px 10px', fontWeight: 700, color: '#DC2626' }}>Balance</td><td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 900, color: '#DC2626' }}>{fmt(bal)}</td></tr>}
              </tfoot>
            </table>
            <div style={{ textAlign: 'center', margin: '11px 0', padding: 8, borderRadius: 7, background: bal === 0 ? '#ECFDF5' : '#FEF3C7', border: `1px solid ${bal === 0 ? '#A7F3D0' : '#FCD34D'}` }}>
              <span style={{ fontWeight: 800, fontSize: 12, color: bal === 0 ? '#059669' : '#D97706' }}>{bal === 0 ? '✅ ALL DUES CLEARED' : '⚠️ PARTIALLY PAID — BALANCE DUE'}</span>
            </div>
            <div style={{ textAlign: 'center', fontSize: 10, color: '#94A3B8', marginBottom: 18 }}>Computer-generated receipt. No signature required.</div>
          </div>
          <div style={{ padding: '0 22px 22px', display: 'flex', gap: 9 }}>
            <button onClick={() => setRcptM(null)} style={{ flex: 1, background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 9, padding: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
            <WABtn sent={inv.rcpt_sent} onClick={() => { sendRcptWA(inv, pmt); setRcptM(null) }} label={`Send to ${s.phone}`} size='md' />
          </div>
        </div>
      </div>
    )})()}

    {/* ── Edit Invoice Modal ───────────────────────────────────────────────── */}
    {editM && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, width: isMobile ? 'calc(100vw - 32px)' : 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#0F172A,#6366F1)', padding: '18px 24px', color: '#fff' }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>✏️ Edit Invoice {editM.id}</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{getStudent(editM).name}</div>
          </div>
          <div style={{ padding: 22, overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Due Date</label>
              <input type='date' value={ef.due_date} onChange={e => setEf(f => ({ ...f, due_date: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Fee Items</label>
              {ef.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input value={item.label} onChange={e => setEf(f => { const items = [...f.items]; items[idx] = { ...items[idx], label: e.target.value }; return { ...f, items } })} placeholder='Label' style={{ flex: 2, padding: '8px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none' }} />
                  <input type='number' value={item.amount} onChange={e => setEf(f => { const items = [...f.items]; items[idx] = { ...items[idx], amount: e.target.value }; return { ...f, items } })} placeholder='Amount' style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none' }} />
                  <button onClick={() => setEf(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} style={{ background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '6px 9px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✕</button>
                </div>
              ))}
              <button onClick={() => setEf(f => ({ ...f, items: [...f.items, { label: '', amount: 0 }] }))} style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600, marginTop: 2 }}>+ Add Item</button>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Notes</label>
              <textarea value={ef.notes} onChange={e => setEf(f => ({ ...f, notes: e.target.value }))} placeholder='Optional remarks...' style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: 50, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditM(null)} style={{ flex: 1, background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 9, padding: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveEditInv} disabled={saving} style={{ flex: 2, background: '#6366F1', color: '#fff', border: 'none', borderRadius: 9, padding: 11, fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '⏳ Saving…' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
    {deleteId && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, width: isMobile ? 'calc(100vw - 32px)' : 380, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#0F172A,#DC2626)', padding: '18px 24px', color: '#fff' }}><div style={{ fontWeight: 800, fontSize: 16 }}>🗑 Delete Invoice</div></div>
          <div style={{ padding: 22 }}>
            <div style={{ fontSize: 14, color: '#374151', marginBottom: 20 }}>Are you sure you want to delete invoice <strong>{deleteId}</strong>? This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 9, padding: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => deleteInv(deleteId)} disabled={saving} style={{ flex: 1, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 9, padding: 11, fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '⏳ Deleting…' : '🗑 Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {settM && <FeeSettingsModal feeTypes={feeTypes} classes={classes} onSave={saveSettings} onClose={() => setSettM(false)} />}
    <Toast toast={toast} />
  </>
}
