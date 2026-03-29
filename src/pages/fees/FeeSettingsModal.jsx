import { useState } from 'react'
import { useBreakpoint } from '../../hooks/responsive.jsx'

export default function FeeSettingsModal({ feeTypes, classes: iC, onSave, onClose }) {
  const bp       = useBreakpoint()
  const isMobile = bp === 'mobile'
  const isTablet = bp === 'tablet'
  const [tab, setTab]   = useState('classes')
  const [lFT, setLFT]   = useState(feeTypes.map(ft => ({ ...ft, defaultAmounts: { ...ft.defaultAmounts } })))
  const [lCls, setLCls] = useState(iC.map(c => ({ ...c })))
  const [nFT, setNFT]   = useState('')
  const [nCls, setNCls] = useState('')

  const addCls = () => {
    const n = nCls.trim(); if (!n || lCls.find(c => c.name === n)) return
    setLCls(p => [...p, { id: `c${Date.now()}`, name: n, active: true }])
    setLFT(p => p.map(ft => ({ ...ft, defaultAmounts: { ...ft.defaultAmounts, [n]: 0 } })))
    setNCls('')
  }
  const togCls = id => setLCls(p => p.map(c => c.id === id ? { ...c, active: !c.active } : c))
  const remCls = id => {
    const c = lCls.find(x => x.id === id); if (!c) return
    setLCls(p => p.filter(x => x.id !== id))
    setLFT(p => p.map(ft => { const d = { ...ft.defaultAmounts }; delete d[c.name]; return { ...ft, defaultAmounts: d } }))
  }
  const addFT = () => {
    const n = nFT.trim(); if (!n) return
    const a = {}; lCls.forEach(c => { a[c.name] = 0 })
    setLFT(p => [...p, { id: `ft${Date.now()}`, name: n, defaultAmounts: a, active: true }])
    setNFT('')
  }
  const updAmt = (id, cn, v) => setLFT(p => p.map(ft => ft.id === id ? { ...ft, defaultAmounts: { ...ft.defaultAmounts, [cn]: Number(v) } } : ft))
  const togFT  = id => setLFT(p => p.map(ft => ft.id === id ? { ...ft, active: !ft.active } : ft))
  const remFT  = id => setLFT(p => p.filter(ft => ft.id !== id))
  const actCls = lCls.filter(c => c.active)

  const T = ({ label, value }) => (
    <button onClick={() => setTab(value)} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: tab === value ? '#6366F1' : '#F1F5F9', color: tab === value ? '#fff' : '#64748B', transition: 'all 0.15s' }}>{label}</button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 760, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ background: 'linear-gradient(135deg,#0F172A,#6366F1)', padding: '18px 24px', color: '#fff', borderRadius: '16px 16px 0 0' }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>⚙️ Fee Settings</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>Manage classes and fee types dynamically</div>
        </div>
        <div style={{ padding: '18px 24px 24px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, background: '#F8FAFC', padding: 5, borderRadius: 9, width: 'fit-content' }}>
            <T label='🏫 Classes' value='classes' /><T label='💰 Fee Types' value='feetypes' />
          </div>

          {tab === 'classes' && <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input value={nCls} onChange={e => setNCls(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCls()} placeholder='Class name e.g. "1","LKG","11-Science"' style={{ flex: 1, padding: '9px 13px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 13, outline: 'none' }} />
              <button onClick={addCls} style={{ background: '#6366F1', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {[{ l: '1–5', c: ['1','2','3','4','5'] }, { l: '6–8', c: ['6','7','8'] }, { l: '9–10', c: ['9','10'] }, { l: '11–12', c: ['11','12'] }, { l: 'KG', c: ['LKG','UKG'] }, { l: 'Nursery', c: ['Nursery','Jr.KG','Sr.KG'] }].map(p => (
                <button key={p.l} onClick={() => {
                  const toAdd = p.c.filter(n => !lCls.find(c => c.name === n)); if (!toAdd.length) return
                  setLCls(prev => [...prev, ...toAdd.map(n => ({ id: `c${Date.now()}${n}`, name: n, active: true }))])
                  setLFT(prev => prev.map(ft => { const d = { ...ft.defaultAmounts }; toAdd.forEach(n => { d[n] = 0 }); return { ...ft, defaultAmounts: d } }))
                }} style={{ background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE', borderRadius: 7, padding: '4px 11px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ {p.l}</button>
              ))}
            </div>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#F8FAFC' }}>{['#', 'Class', 'Active', 'Toggle', 'Remove'].map(h => <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {lCls.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>No classes yet.</td></tr>}
                  {lCls.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9', background: c.active ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#94A3B8' }}>{i + 1}</td>
                      <td style={{ padding: '10px 14px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: c.active ? '#10B981' : '#CBD5E1' }} /><span style={{ fontSize: 14, fontWeight: 700, color: c.active ? '#1A202C' : '#94A3B8' }}>Class {c.name}</span></div></td>
                      <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 11, background: c.active ? '#D1FAE5' : '#F1F5F9', color: c.active ? '#059669' : '#94A3B8', padding: '3px 9px', borderRadius: 20, fontWeight: 700 }}>{c.active ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ padding: '10px 14px' }}><button onClick={() => togCls(c.id)} style={{ background: c.active ? '#ECFDF5' : '#F1F5F9', color: c.active ? '#059669' : '#94A3B8', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{c.active ? 'ON' : 'OFF'}</button></td>
                      <td style={{ padding: '10px 14px' }}><button onClick={() => remCls(c.id)} style={{ background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>}

          {tab === 'feetypes' && <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input value={nFT} onChange={e => setNFT(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFT()} placeholder='Fee type name (e.g. Lab Fee, Activity Fee)' style={{ flex: 1, padding: '9px 13px', borderRadius: 8, border: '2px solid #E2E8F0', fontSize: 13, outline: 'none' }} />
              <button onClick={addFT} style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
            </div>
            {actCls.length === 0 && <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400E', marginBottom: 12 }}>⚠️ Add classes first from the Classes tab.</div>}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}><div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 + actCls.length * 105 }}>
                <thead><tr style={{ background: '#F8FAFC' }}>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', minWidth: 150, position: 'sticky', left: 0, background: '#F8FAFC', zIndex: 1 }}>Fee Type</th>
                  {actCls.map(c => <th key={c.id} style={{ padding: '9px 12px', textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', minWidth: 100 }}>Cls {c.name} (₹)</th>)}
                  <th style={{ padding: '9px 12px', textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Active</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Del</th>
                </tr></thead>
                <tbody>
                  {lFT.length === 0 && <tr><td colSpan={actCls.length + 3} style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>No fee types yet.</td></tr>}
                  {lFT.map(ft => (
                    <tr key={ft.id} style={{ borderBottom: '1px solid #F1F5F9', background: ft.active ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding: '9px 14px', position: 'sticky', left: 0, background: ft.active ? '#fff' : '#FAFAFA', zIndex: 1 }}><div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: ft.active ? '#10B981' : '#CBD5E1', flexShrink: 0 }} /><span style={{ fontSize: 13, fontWeight: 600, color: ft.active ? '#1A202C' : '#94A3B8' }}>{ft.name}</span></div></td>
                      {actCls.map(c => <td key={c.id} style={{ padding: '6px 10px', textAlign: 'center' }}><input type='number' value={ft.defaultAmounts[c.name] ?? 0} onChange={e => updAmt(ft.id, c.name, e.target.value)} disabled={!ft.active} style={{ width: 85, padding: '4px 7px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 12, fontWeight: 600, textAlign: 'center', outline: 'none', background: ft.active ? '#fff' : '#F8FAFC', color: ft.active ? '#1A202C' : '#CBD5E1' }} /></td>)}
                      <td style={{ padding: '7px 12px', textAlign: 'center' }}><button onClick={() => togFT(ft.id)} style={{ background: ft.active ? '#ECFDF5' : '#F1F5F9', color: ft.active ? '#059669' : '#94A3B8', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{ft.active ? 'ON' : 'OFF'}</button></td>
                      <td style={{ padding: '7px 12px', textAlign: 'center' }}><button onClick={() => remFT(ft.id)} style={{ background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '3px 9px', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          </>}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={onClose} style={{ flex: 1, background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 9, padding: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => onSave(lFT, lCls)} style={{ flex: 2, background: '#10B981', color: '#fff', border: 'none', borderRadius: 9, padding: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>✓ Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  )
}
