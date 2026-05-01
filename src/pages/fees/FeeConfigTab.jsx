import { useEffect, useMemo, useState } from 'react'

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

// Transport intentionally omitted — it lives in the Transport Fees sub-tab
// (distance-tier based) and shouldn't be configured per class here.
const FEE_TYPES = ['Tuition', 'Library', 'Sports', 'Lab', 'Exam', 'Hostel', 'Activity', 'Other']
const TERMS     = ['Term 1', 'Term 2', 'Term 3', 'Annual', 'Monthly', 'Q1', 'Q2', 'Q3', 'Q4']

const fmtINR = n => Number(n || 0).toLocaleString('en-IN')

// ── Matrix builder: configs × classes → one row per class ────────────────────
function buildMatrix(configs, classes) {
  const allFeeTypes = [...new Set(configs.map(c => c.fee_type))].sort()
  const matrix = classes.map(cls => {
    const classConfigs = configs.filter(c => c.class_id === cls.id)
    const feeMap = {}
    classConfigs.forEach(cfg => {
      // If there are multiple terms for the same fee_type, collapse by sum so
      // the matrix stays one cell per (class, fee_type). The detail rows live
      // in the Edit/View modals.
      if (feeMap[cfg.fee_type]) {
        feeMap[cfg.fee_type] = {
          ...feeMap[cfg.fee_type],
          amount: Number(feeMap[cfg.fee_type].amount) + Number(cfg.amount),
        }
      } else {
        feeMap[cfg.fee_type] = cfg
      }
    })
    const total = classConfigs.reduce((sum, c) => sum + Number(c.amount || 0), 0)
    return {
      class_id:   cls.id,
      class_name: cls.name,
      feeMap,
      total,
      configs:    classConfigs,
      hasConfig:  classConfigs.length > 0,
    }
  })
  return { matrix, feeTypes: allFeeTypes }
}

// ══════════════════════════════════════════════════════════════════════════════
export default function FeeConfigTab({ showToast, isMobile }) {
  const [classes, setClasses]   = useState([])
  const [years,   setYears]     = useState([])
  const [configs, setConfigs]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [selectedYear, setSelectedYear] = useState('')

  const [editModal, setEditModal] = useState(null)
  const [viewModal, setViewModal] = useState(null)
  const [configView, setConfigView] = useState('class') // 'class' | 'transport'

  // Bootstrap: classes + academic years
  useEffect(() => {
    Promise.all([
      apiFetch('/classes').catch(() => ({ data: [] })),
      apiFetch('/academic-years').catch(() => ({ data: [] })),
    ]).then(([cls, yr]) => {
      setClasses(cls.data || [])
      setYears(yr.data || [])
      const current = (yr.data || []).find(y => y.is_current) || (yr.data || [])[0]
      if (current) setSelectedYear(String(current.id))
    })
  }, [])

  const loadConfigs = async () => {
    if (!selectedYear) return
    setLoading(true)
    try {
      const r = await apiFetch(`/fee-configs?academic_year_id=${selectedYear}`)
      setConfigs(r.data || [])
    } catch (e) {
      showToast?.(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadConfigs() }, [selectedYear])

  const { matrix, feeTypes } = useMemo(
    () => buildMatrix(configs, classes),
    [configs, classes]
  )

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>⚙️ Fee Configuration</h3>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '4px 0 0', maxWidth: 540, lineHeight: 1.5 }}>
            {configView === 'class'
              ? <>One row per class. Click <strong>Edit</strong> to set fee types and amounts. Invoices auto-create when students are enrolled.</>
              : <>Distance-based annual fees. Applied when a student selects transport during enrollment.</>}
          </p>
        </div>
        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 13, fontWeight: 600, color: '#374151', background: '#fff', cursor: 'pointer' }}>
          <option value="">— Select Year —</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.name}{y.is_current ? ' (current)' : ''}</option>)}
        </select>
      </div>

      {/* Sub-view toggle: Class fees ↔ Transport fees */}
      <div style={{ display: 'flex', gap: 4, background: '#E2E8F0', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 20 }}>
        {[
          { key: 'class',     label: '🏫 Class Fees' },
          { key: 'transport', label: '🚌 Transport Fees' },
        ].map(v => (
          <button key={v.key} onClick={() => setConfigView(v.key)}
            style={{ padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: configView === v.key ? '#fff' : 'transparent', color: configView === v.key ? '#6366F1' : '#64748B', boxShadow: configView === v.key ? '0 1px 6px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.18s' }}>
            {v.label}
          </button>
        ))}
      </div>

      {configView === 'transport' && (
        <TransportFeesConfig
          selectedYear={selectedYear}
          showToast={showToast}
          isMobile={isMobile}
        />
      )}

      {/* Class fees matrix */}
      {configView === 'class' && (loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>Loading fee configurations…</div>
      ) : matrix.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 16, border: '1px dashed #E2E8F0' }}>
          <div style={{ fontSize: 40 }}>🏫</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginTop: 12 }}>No classes set up yet</div>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 6 }}>Create classes from Settings → Classes first.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.8, minWidth: 120, position: 'sticky', left: 0, background: '#0F172A', zIndex: 2 }}>Class</th>
                  {feeTypes.map(t => (
                    <th key={t} style={{ padding: '14px 16px', textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6, minWidth: 120, whiteSpace: 'nowrap' }}>{t}</th>
                  ))}
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#FCD34D', textTransform: 'uppercase', letterSpacing: 0.6, minWidth: 110 }}>Total</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6, minWidth: 130 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={row.class_id}
                    style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                    {/* Class */}
                    <td style={{ padding: '14px 20px', fontWeight: 800, fontSize: 14, color: '#0F172A', position: 'sticky', left: 0, background: i % 2 === 0 ? '#fff' : '#FAFBFC', zIndex: 1, borderRight: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 32, height: 32, background: row.hasConfig ? '#EEF2FF' : '#F8FAFC', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🏫</span>
                        {row.class_name}
                      </div>
                    </td>
                    {/* Fee-type cells */}
                    {feeTypes.map(t => {
                      const cfg = row.feeMap[t]
                      return (
                        <td key={t} style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {cfg
                            ? <span style={{ fontWeight: 700, fontSize: 13, color: '#10B981' }}>₹{fmtINR(cfg.amount)}</span>
                            : <span style={{ color: '#CBD5E1', fontSize: 18 }}>—</span>}
                        </td>
                      )
                    })}
                    {/* Total */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {row.hasConfig
                        ? <span style={{ background: '#ECFDF5', color: '#059669', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800 }}>₹{fmtINR(row.total)}</span>
                        : <span style={{ background: '#FEF3C7', color: '#D97706', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Not configured</span>}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button onClick={() => setEditModal({ class_id: row.class_id, class_name: row.class_name, configs: row.configs })}
                          style={{ background: '#EEF2FF', color: '#6366F1', border: '1px solid #C7D2FE', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          ✏️ Edit
                        </button>
                        {row.hasConfig && (
                          <button onClick={() => setViewModal({ class_name: row.class_name, configs: row.configs, total: row.total })}
                            style={{ background: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            👁 View
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {editModal && (
        <EditFeeConfigModal
          data={editModal}
          selectedYear={selectedYear}
          existingConfigs={configs}
          onClose={() => setEditModal(null)}
          onSaved={async () => {
            setEditModal(null)
            await loadConfigs()
            showToast?.('Fee config saved')
          }}
          showToast={showToast}
        />
      )}

      {viewModal && (
        <ViewFeeConfigModal data={viewModal} onClose={() => setViewModal(null)}/>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
const modalInputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 7,
  border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none',
  fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box',
}

function EditFeeConfigModal({ data, selectedYear, existingConfigs, onClose, onSaved, showToast }) {
  const [rows, setRows] = useState(() => {
    if (data.configs.length > 0) {
      return data.configs.map(c => ({
        id:          c.id ?? null,
        fee_type:    c.fee_type,
        term:        c.term,
        amount:      String(c.amount),
        description: c.description || '',
      }))
    }
    return [{ id: null, fee_type: 'Tuition', term: 'Term 1', amount: '', description: '' }]
  })
  const [saving, setSaving] = useState(false)

  // IDs that existed when the modal opened — anything missing on save means
  // the user removed it. We delete those rows on the backend.
  const initialIds = useMemo(
    () => data.configs.map(c => c.id).filter(Boolean),
    [data.configs]
  )

  const addRow = () => setRows(prev => [
    ...prev,
    { id: null, fee_type: 'Tuition', term: 'Term 1', amount: '', description: '' },
  ])
  const removeRow = (i) => {
    if (rows.length === 1) return
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }
  const updateRow = (i, field, value) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))

  const handleSave = async () => {
    const invalid = rows.some(r => !r.fee_type || !r.term || r.amount === '' || isNaN(Number(r.amount)))
    if (invalid) {
      showToast?.('Fill Fee Type, Term and Amount for every row', 'error')
      return
    }

    setSaving(true)
    try {
      // Bulk upsert via the existing /fee-configs/bulk endpoint.
      await apiFetch('/fee-configs/bulk', {
        method: 'POST',
        body: {
          class_id:         data.class_id,
          academic_year_id: selectedYear,
          fees: rows.map(r => ({
            term:        r.term,
            fee_type:    r.fee_type,
            amount:      Number(r.amount),
            description: r.description || null,
          })),
        },
      })

      // Delete rows the user removed from this modal session.
      const keptIds = new Set(rows.map(r => r.id).filter(Boolean))
      const removed = initialIds.filter(id => !keptIds.has(id))
      await Promise.all(removed.map(id =>
        apiFetch(`/fee-configs/${id}`, { method: 'DELETE' }).catch(() => null)
      ))

      onSaved()
    } catch (e) {
      showToast?.(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, width: 'min(720px, 100%)', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>⚙️ Edit Fee Config</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>Class: {data.class_name}</div>
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, color: '#fff', width: 32, height: 32, fontSize: 16, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* Column headers — match the row grid below */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 1.8fr 40px', gap: 10, marginBottom: 8, padding: '0 4px' }}>
            {['Fee Type *', 'Term *', 'Amount (₹) *', 'Description', ''].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 1.8fr 40px', gap: 10, alignItems: 'center', background: '#F8FAFC', borderRadius: 10, padding: '10px 12px', border: '1px solid #F1F5F9' }}>
                <select value={row.fee_type} onChange={e => updateRow(i, 'fee_type', e.target.value)} style={modalInputStyle}>
                  {FEE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <select value={row.term} onChange={e => updateRow(i, 'term', e.target.value)} style={modalInputStyle}>
                  {TERMS.map(t => <option key={t}>{t}</option>)}
                </select>
                <input type="number" min="0" value={row.amount}
                  onChange={e => updateRow(i, 'amount', e.target.value)} placeholder="0" style={modalInputStyle}/>
                <input value={row.description}
                  onChange={e => updateRow(i, 'description', e.target.value)} placeholder="Optional" style={modalInputStyle}/>
                <button onClick={() => removeRow(i)} disabled={rows.length === 1}
                  style={{ background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: 6, width: 32, height: 32, fontSize: 14, cursor: rows.length === 1 ? 'not-allowed' : 'pointer', opacity: rows.length === 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button onClick={addRow}
            style={{ marginTop: 12, width: '100%', padding: '10px', background: '#F8FAFC', border: '2px dashed #C7D2FE', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#6366F1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            + Add Fee Type
          </button>

          {totalAmount > 0 && (
            <div style={{ marginTop: 16, background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>Total Fees for {data.class_name}</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#059669' }}>₹{fmtINR(totalAmount)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, flexShrink: 0, background: '#FAFAFA' }}>
          <button onClick={onClose}
            style={{ flex: 1, background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, background: 'linear-gradient(135deg,#6366F1,#4F46E5)', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
            {saving ? 'Saving…' : '💾 Save Fee Config'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
function ViewFeeConfigModal({ data, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, width: 'min(560px, 100%)', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>📋 Fee Details</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>Class: {data.class_name}</div>
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, color: '#fff', width: 32, height: 32, fontSize: 16, cursor: 'pointer', fontWeight: 700 }}>
            ✕
          </button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                {['Fee Type', 'Term', 'Amount', 'Description'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.configs.map((cfg, i) => (
                <tr key={cfg.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: 13 }}>
                    <span style={{ background: '#EEF2FF', color: '#6366F1', padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>{cfg.fee_type}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748B' }}>{cfg.term}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 800, fontSize: 14, color: '#10B981' }}>₹{fmtINR(cfg.amount)}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748B' }}>{cfg.description || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#ECFDF5', borderTop: '2px solid #6EE7B7' }}>
                <td colSpan={2} style={{ padding: '12px 14px', fontWeight: 800, fontSize: 14, color: '#065F46' }}>Total</td>
                <td colSpan={2} style={{ padding: '12px 14px', fontWeight: 900, fontSize: 16, color: '#059669' }}>₹{fmtINR(data.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          <button onClick={onClose}
            style={{ width: '100%', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Transport fees — distance-range based, separate from class fee configs.
function TransportFeesConfig({ selectedYear, showToast, isMobile }) {
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [saving,  setSaving]  = useState(false)

  const emptyForm = { distance_from: '', distance_to: '', amount: '', label: '' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (!selectedYear) return
    setLoading(true)
    apiFetch(`/transport-fee-configs?academic_year_id=${selectedYear}`)
      .then(r => setConfigs(r.data || []))
      .catch(e => showToast?.(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [selectedYear])

  const handleAdd = async () => {
    if (form.distance_from === '' || form.distance_to === '' || !form.amount) {
      showToast?.('Distance From, Distance To and Amount are required', 'error')
      return
    }
    setSaving(true)
    try {
      const r = await apiFetch('/transport-fee-configs', {
        method: 'POST',
        body: { ...form, academic_year_id: selectedYear },
      })
      setConfigs(prev => [...prev, r.data].sort((a, b) => Number(a.distance_from) - Number(b.distance_from)))
      setForm(emptyForm)
      setShowAdd(false)
      showToast?.('Transport fee added')
    } catch (e) {
      showToast?.(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editRow) return
    setSaving(true)
    try {
      const r = await apiFetch(`/transport-fee-configs/${editRow.id}`, {
        method: 'PUT',
        body: {
          distance_from: editRow.distance_from,
          distance_to:   editRow.distance_to,
          amount:        editRow.amount,
          label:         editRow.label || null,
        },
      })
      setConfigs(prev => prev.map(c => c.id === editRow.id ? r.data : c))
      setEditRow(null)
      showToast?.('Transport fee updated')
    } catch (e) {
      showToast?.(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transport fee range?')) return
    try {
      await apiFetch(`/transport-fee-configs/${id}`, { method: 'DELETE' })
      setConfigs(prev => prev.filter(c => c.id !== id))
      showToast?.('Transport fee deleted')
    } catch (e) {
      showToast?.(e.message, 'error')
    }
  }

  const labelStyle = { fontSize: 10, fontWeight: 800, color: '#64748B', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 }
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 13, color: '#94A3B8' }}>
          {configs.length} range{configs.length === 1 ? '' : 's'} configured
        </div>
        <button onClick={() => setShowAdd(s => !s)}
          style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {showAdd ? '× Cancel' : '+ Add Range'}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#F8FAFF', border: '1px solid #C7D2FE', borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#4338CA', marginBottom: 14 }}>➕ New Distance Range</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1.5fr', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Distance From (km) *</label>
              <input type="number" min="0" step="0.1" value={form.distance_from}
                onChange={e => setForm(f => ({ ...f, distance_from: e.target.value }))} placeholder="e.g. 0" style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Distance To (km) *</label>
              <input type="number" min="0" step="0.1" value={form.distance_to}
                onChange={e => setForm(f => ({ ...f, distance_to: e.target.value }))} placeholder="e.g. 5" style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Annual Amount (₹) *</label>
              <input type="number" min="0" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 10000" style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Label (optional)</label>
              <input value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Zone A" style={inputStyle}/>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={handleAdd} disabled={saving}
              style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Add Range'}
            </button>
            <button onClick={() => { setShowAdd(false); setForm(emptyForm) }}
              style={{ background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading transport fees…</div>
      ) : configs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 16, border: '1px dashed #E2E8F0' }}>
          <div style={{ fontSize: 40 }}>🚌</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginTop: 12 }}>No transport fees configured</div>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 6, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
            Add distance ranges and fees. Students who select transport during enrollment will be billed accordingly.
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)' }}>
                  {['Range', 'Annual Amount', 'Label', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '14px 18px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: h === 'Annual Amount' ? '#FCD34D' : '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {configs.map((cfg, i) => (
                  <tr key={cfg.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ background: '#EEF2FF', color: '#6366F1', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                        {cfg.distance_from} – {cfg.distance_to} km
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 15, fontWeight: 800, color: '#10B981' }}>
                      ₹{fmtINR(cfg.amount)}
                      <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginLeft: 4 }}>P/A</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 13, color: '#64748B' }}>{cfg.label || '—'}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditRow({ ...cfg })}
                          style={{ background: '#EEF2FF', color: '#6366F1', border: '1px solid #C7D2FE', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDelete(cfg.id)}
                          style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FCA5A5', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && setEditRow(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: 'min(480px, 100%)', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>✏️ Edit Transport Fee</div>
              <button onClick={() => setEditRow(null)}
                style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, color: '#fff', width: 30, height: 30, fontSize: 16, cursor: 'pointer', fontWeight: 700 }}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Distance From (km) *</label>
                  <input type="number" min="0" step="0.1" value={editRow.distance_from}
                    onChange={e => setEditRow(r => ({ ...r, distance_from: e.target.value }))} style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Distance To (km) *</label>
                  <input type="number" min="0" step="0.1" value={editRow.distance_to}
                    onChange={e => setEditRow(r => ({ ...r, distance_to: e.target.value }))} style={inputStyle}/>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Annual Amount (₹) *</label>
                <input type="number" min="0" value={editRow.amount}
                  onChange={e => setEditRow(r => ({ ...r, amount: e.target.value }))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Label (optional)</label>
                <input value={editRow.label || ''}
                  onChange={e => setEditRow(r => ({ ...r, label: e.target.value }))} placeholder="e.g. Zone A" style={inputStyle}/>
              </div>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
              <button onClick={() => setEditRow(null)}
                style={{ flex: 1, background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleUpdate} disabled={saving}
                style={{ flex: 2, background: 'linear-gradient(135deg,#6366F1,#4F46E5)', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
