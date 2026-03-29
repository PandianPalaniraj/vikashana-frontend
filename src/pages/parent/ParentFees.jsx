import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useParentStore from '../../store/parentStore'
import useAuthStore from '../../store/authStore'
import parentApi from '../../api/parent'

function Skeleton({ h = 80, r = 12 }) {
  return <div style={{ background: '#E2E8F0', borderRadius: r, height: h, animation: 'pulse 1.5s infinite' }} />
}

function ErrorBanner({ msg, onRetry }) {
  return (
    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>⚠️ {msg}</span>
      <button onClick={onRetry} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
    </div>
  )
}

const STATUS_BADGE = {
  Paid:    { color: '#10B981', bg: '#ECFDF5', label: 'Paid'    },
  Partial: { color: '#F59E0B', bg: '#FFFBEB', label: 'Partial' },
  Unpaid:  { color: '#EF4444', bg: '#FEF2F2', label: 'Unpaid'  },
  Overdue: { color: '#DC2626', bg: '#FEF2F2', label: 'Overdue' },
}

function InvoiceCard({ inv, activeStudent, parentName }) {
  const [expanded, setExpanded] = useState(false)
  const today = new Date()
  const due = inv.due_date ? new Date(inv.due_date) : null
  const isOverdue = inv.status !== 'Paid' && due && due < today

  const badge = isOverdue ? STATUS_BADGE.Overdue : (STATUS_BADGE[inv.status] || STATUS_BADGE.Unpaid)
  const balance = (inv.total || 0) - (inv.paid || 0)

  const waMsg = encodeURIComponent(
    `Hi, I'm ${parentName}, parent of ${activeStudent.name} (Class ${activeStudent.class}-${activeStudent.section}). I'd like to inquire about invoice ${inv.invoice_no} of ₹${inv.total}.`
  )

  return (
    <div style={{
      background: '#fff', borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
      border: isOverdue ? '1px solid #FECACA' : '1px solid #F1F5F9',
    }}>
      {/* Card header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{inv.invoice_no}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: badge.color, background: badge.bg,
              padding: '2px 8px', borderRadius: 20,
            }}>
              {badge.label}
            </span>
            {isOverdue && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626' }}>⚠️ Overdue</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 3 }}>
            {inv.month} {due && `· Due: ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: balance > 0 ? '#EF4444' : '#10B981' }}>
            ₹{(balance > 0 ? balance : inv.total)?.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>
            {balance > 0 ? `of ₹${inv.total?.toLocaleString('en-IN')}` : 'Paid in full'}
          </div>
        </div>
        <div style={{ marginLeft: 8, fontSize: 16, color: '#94A3B8', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : '' }}>›</div>
      </div>

      {/* Expandable: line items + payment history */}
      {expanded && (
        <div style={{ borderTop: '1px solid #F1F5F9', padding: '12px 16px', background: '#FAFBFC' }}>
          {/* Fee line items */}
          {Array.isArray(inv.items) && inv.items.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Fee Breakdown</div>
              {inv.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < inv.items.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                  <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{item.label || item.name || item.description}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>₹{item.amount?.toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '2px solid #E2E8F0', marginTop: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Total</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#0F172A' }}>₹{inv.total?.toLocaleString('en-IN')}</span>
              </div>
              {inv.paid > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>Paid</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>₹{inv.paid?.toLocaleString('en-IN')}</span>
                </div>
              )}
              {balance > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#EF4444' }}>Balance</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#EF4444' }}>₹{balance?.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          )}

          {/* Payment history */}
          {Array.isArray(inv.payments) && inv.payments.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Payment History</div>
              {inv.payments.map((pmt, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < inv.payments.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{pmt.method}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{pmt.paid_at ? new Date(pmt.paid_at).toLocaleDateString('en-IN') : ''}{pmt.reference ? ` · ${pmt.reference}` : ''}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#10B981' }}>₹{pmt.amount?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ParentFees() {
  const navigate = useNavigate()
  const activeStudent = useParentStore(s => s.activeStudent)
  const user = useAuthStore(s => s.user)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('pending')   // pending | paid

  useEffect(() => {
    if (!activeStudent) { navigate('/parent/select', { replace: true }); return }
    load()
  }, [activeStudent])

  function load() {
    setLoading(true); setError(null)
    parentApi.getFees(activeStudent.student_id)
      .then(res => {
        if (!res.success) throw new Error()
        setInvoices(res.data || [])
      })
      .catch(() => setError('Could not load fees. Please try again.'))
      .finally(() => setLoading(false))
  }

  if (!activeStudent) return null

  const today = new Date()
  const pending = invoices.filter(i => i.status !== 'Paid')
  const paid    = invoices.filter(i => i.status === 'Paid')
  const displayed = tab === 'pending' ? pending : paid

  const totalBilled  = invoices.reduce((s, i) => s + (i.total || 0), 0)
  const totalPaid    = invoices.reduce((s, i) => s + (i.paid || 0), 0)
  const totalBalance = totalBilled - totalPaid
  const hasOverdue   = pending.some(i => i.due_date && new Date(i.due_date) < today)

  const waMsg = encodeURIComponent(
    `Hi, I'm ${user?.name || 'Parent'}, parent of ${activeStudent.name} (Class ${activeStudent.class}-${activeStudent.section}, Roll: ${activeStudent.admission_no}). I have a query about fees.`
  )
  const schoolPhone = useAuthStore.getState().user?.school?.phone

  return (
    <div style={{ padding: 16 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginBottom: 16 }}>
        {activeStudent.name}'s Fees
      </div>

      {error && <ErrorBanner msg={error} onRetry={load} />}

      {loading && (
        <div style={{ display: 'grid', gap: 12 }}>
          <Skeleton h={100} />
          <Skeleton h={72} />
          {[1,2,3].map(i => <Skeleton key={i} h={80} />)}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'grid', gap: 14 }}>

          {/* Summary card */}
          <div style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)', borderRadius: 18, padding: '20px 20px', color: '#fff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'center' }}>
              {[
                { label: 'Total Billed', value: totalBilled, color: '#fff' },
                { label: 'Total Paid',   value: totalPaid,   color: '#10B981' },
                { label: 'Balance Due',  value: totalBalance, color: totalBalance > 0 ? '#EF4444' : '#10B981' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>
                    ₹{s.value.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Status indicator */}
            <div style={{
              marginTop: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px',
              textAlign: 'center', fontSize: 13, fontWeight: 700,
              color: hasOverdue ? '#FCA5A5' : totalBalance > 0 ? '#FDE68A' : '#6EE7B7',
            }}>
              {hasOverdue
                ? '🔴 Overdue payments — please clear immediately'
                : totalBalance > 0
                ? `⚠️ ₹${totalBalance.toLocaleString('en-IN')} pending`
                : '✅ All fees cleared — no dues'}
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', background: '#fff', borderRadius: 12, padding: 4, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            {[
              { key: 'pending', label: `Pending (${pending.length})` },
              { key: 'paid',    label: `Paid (${paid.length})`       },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1, padding: '8px 4px', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                  background: tab === t.key ? '#6366F1' : 'none',
                  color: tab === t.key ? '#fff' : '#64748B',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Invoice list */}
          {displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{tab === 'pending' ? '🎉' : '📋'}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {tab === 'pending' ? 'No pending fees!' : 'No paid invoices yet'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {displayed.map(inv => (
                <InvoiceCard
                  key={inv.id}
                  inv={inv}
                  activeStudent={activeStudent}
                  parentName={user?.name}
                />
              ))}
            </div>
          )}

          {/* Contact school */}
          <a
            href={schoolPhone
              ? `https://wa.me/${schoolPhone.replace(/\D/g,'')}?text=${waMsg}`
              : `https://wa.me/?text=${waMsg}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block', background: '#25D366', color: '#fff', textAlign: 'center',
              borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700,
              textDecoration: 'none', boxShadow: '0 2px 12px rgba(37,211,102,0.3)',
            }}
          >
            📱 Contact School about Fees
          </a>
        </div>
      )}
    </div>
  )
}
