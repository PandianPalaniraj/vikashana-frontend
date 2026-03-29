export const fmt     = n => `₹${Number(n).toLocaleString('en-IN')}`
export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
export const todayStr = () => new Date().toISOString().slice(0, 10)

let _ctr = 3000
export const uid = prefix => `${prefix}${String(++_ctr).padStart(4, '0')}`

export function getGrade(pct) {
  if (pct >= 91) return { g: 'A1', gp: 10, c: '#059669', bg: '#D1FAE5' }
  if (pct >= 81) return { g: 'A2', gp: 9,  c: '#10B981', bg: '#ECFDF5' }
  if (pct >= 71) return { g: 'B1', gp: 8,  c: '#3B82F6', bg: '#EFF6FF' }
  if (pct >= 61) return { g: 'B2', gp: 7,  c: '#6366F1', bg: '#EEF2FF' }
  if (pct >= 51) return { g: 'C1', gp: 6,  c: '#F59E0B', bg: '#FFFBEB' }
  if (pct >= 41) return { g: 'C2', gp: 5,  c: '#F97316', bg: '#FFF7ED' }
  if (pct >= 33) return { g: 'D',  gp: 4,  c: '#EF4444', bg: '#FEF2F2' }
  return               { g: 'E',  gp: 0,  c: '#DC2626', bg: '#FEE2E2' }
}
