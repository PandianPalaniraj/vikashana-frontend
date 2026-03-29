import { useState, useMemo } from 'react'
import { PAGE_SIZE } from '../../constants'

export default function DataTable({ columns, data, emptyMsg = 'No records found' }) {
  const [page, setPage]    = useState(1)
  const [sortCol, setSCol] = useState(null)
  const [sortDir, setSDir] = useState('asc')

  const sorted = useMemo(() => {
    if (!sortCol) return data
    return [...data].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol]
      if (av == null) return 1; if (bv == null) return -1
      const c = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? c : -c
    })
  }, [data, sortCol, sortDir])

  const total = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safe  = Math.min(page, total)
  const rows  = sorted.slice((safe - 1) * PAGE_SIZE, safe * PAGE_SIZE)

  const nums = Array.from({ length: total }, (_, i) => i + 1)
    .filter(p => p === 1 || p === total || Math.abs(p - safe) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push('...'); acc.push(p); return acc }, [])

  const handleSort = col => {
    setSCol(col); setSDir(d => sortCol === col ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); setPage(1)
  }

  const PBtn = ({ ch, pg, dis }) => (
    <button onClick={() => setPage(Math.max(1, Math.min(total, pg)))} disabled={dis}
      style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid #E2E8F0', background: dis ? '#F8FAFC' : '#fff', color: dis ? '#CBD5E1' : '#475569', cursor: dis ? 'not-allowed' : 'pointer', fontSize: 11 }}>
      {ch}
    </button>
  )

  return (
    <div style={{ background: '#fff', borderRadius: 13, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
              {columns.map(col => (
                <th key={col.key}
                  onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                  style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', cursor: col.sortable !== false ? 'pointer' : 'default', userSelect: 'none' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    {col.sortable !== false && (
                      <span style={{ fontSize: 9, color: sortCol === col.key ? '#6366F1' : '#CBD5E1' }}>
                        {sortCol === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={columns.length} style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
                  <div style={{ fontSize: 32 }}>🔍</div>
                  <div style={{ marginTop: 8, fontWeight: 600 }}>{emptyMsg}</div>
                </td></tr>
              : rows.map((row, i) => (
                <tr key={row.id ?? i}
                  style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFBFC'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  {columns.map(col => (
                    <td key={col.key} style={{ padding: '11px 14px', fontSize: 13, verticalAlign: 'middle' }}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid #F1F5F9', background: '#FAFBFC' }}>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>
          Showing <strong>{sorted.length === 0 ? 0 : (safe - 1) * PAGE_SIZE + 1}</strong>–<strong>{Math.min(safe * PAGE_SIZE, sorted.length)}</strong> of <strong>{sorted.length}</strong>
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <PBtn ch="«" pg={1}       dis={safe === 1} />
          <PBtn ch="‹" pg={safe - 1} dis={safe === 1} />
          {nums.map((p, i) => p === '...'
            ? <span key={`e${i}`} style={{ padding: '0 3px', color: '#94A3B8', fontSize: 11 }}>…</span>
            : <button key={p} onClick={() => setPage(p)} style={{ padding: '4px 9px', borderRadius: 5, border: '1px solid', fontSize: 11, fontWeight: p === safe ? 700 : 400, cursor: 'pointer', borderColor: p === safe ? '#6366F1' : '#E2E8F0', background: p === safe ? '#6366F1' : '#fff', color: p === safe ? '#fff' : '#475569' }}>{p}</button>
          )}
          <PBtn ch="›" pg={safe + 1} dis={safe === total} />
          <PBtn ch="»" pg={total}    dis={safe === total} />
        </div>
      </div>
    </div>
  )
}
