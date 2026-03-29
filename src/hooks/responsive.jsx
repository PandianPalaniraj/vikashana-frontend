import { useState, useEffect } from 'react'

// ── useBreakpoint ─────────────────────────────────────────────
export function useBreakpoint() {
  const get = () => {
    const w = window.innerWidth
    return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'
  }
  const [bp, setBp] = useState(get)
  useEffect(() => {
    const fn = () => setBp(get())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return bp
}

// ── Responsive grid helpers ───────────────────────────────────
// Returns a CSS gridTemplateColumns string based on bp
export function cols(bp, mobile = 1, tablet = 2, desktop = 4) {
  const n = bp === 'mobile' ? mobile : bp === 'tablet' ? tablet : desktop
  return `repeat(${n}, 1fr)`
}

// ── Spacing ───────────────────────────────────────────────────
export function pad(bp, mobile = 12, tablet = 16, desktop = 24) {
  return bp === 'mobile' ? mobile : bp === 'tablet' ? tablet : desktop
}

// ── Font size ─────────────────────────────────────────────────
export function fs(bp, mobile = 12, tablet = 13, desktop = 14) {
  return bp === 'mobile' ? mobile : bp === 'tablet' ? tablet : desktop
}

// ── Responsive card ───────────────────────────────────────────
export function cardStyle(bp, extra = {}) {
  return {
    background: '#fff',
    borderRadius: bp === 'mobile' ? 12 : 16,
    padding: bp === 'mobile' ? '14px 14px' : bp === 'tablet' ? '18px' : '22px',
    boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
    ...extra,
  }
}

// ── Widget row ────────────────────────────────────────────────
// Always 2 cols on mobile, configurable on tablet/desktop
export function widgetGrid(bp, tabletCols = 2, desktopCols = 4) {
  return {
    display: 'grid',
    gridTemplateColumns: cols(bp, 2, tabletCols, desktopCols),
    gap: bp === 'mobile' ? 10 : 14,
    marginBottom: bp === 'mobile' ? 16 : 22,
  }
}

// ── Table → Card stack on mobile ──────────────────────────────
// Use this to decide whether to render a <table> or card list
export function isMobile(bp) { return bp === 'mobile' }
export function isTablet(bp) { return bp === 'tablet' }
export function isDesktop(bp) { return bp === 'desktop' }

// ── Filter bar ────────────────────────────────────────────────
export function filterBarStyle(bp) {
  return {
    display: 'flex',
    flexWrap: 'wrap',
    gap: bp === 'mobile' ? 8 : 10,
    marginBottom: bp === 'mobile' ? 12 : 16,
    background: '#fff',
    borderRadius: 12,
    padding: bp === 'mobile' ? '10px 12px' : 14,
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
  }
}

// ── Input style ───────────────────────────────────────────────
export function inputStyle(extra = {}) {
  return {
    padding: '9px 12px',
    borderRadius: 8,
    border: '1.5px solid #E2E8F0',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    ...extra,
  }
}

// ── Primary button ────────────────────────────────────────────
export function primaryBtn(bp, extra = {}) {
  return {
    background: 'linear-gradient(135deg,#6366F1,#4F46E5)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: bp === 'mobile' ? '10px 16px' : '11px 22px',
    fontSize: bp === 'mobile' ? 12 : 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(99,102,241,0.3)',
    whiteSpace: 'nowrap',
    ...extra,
  }
}

// ── Stat widget ───────────────────────────────────────────────
export function StatWidget({ icon, label, value, sub, color, bg, bp }) {
  return (
    <div style={{
      background: '#fff', borderRadius: bp === 'mobile' ? 12 : 16,
      padding: bp === 'mobile' ? '12px 14px' : '18px 20px',
      boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
      border: `1px solid ${color}18`,
      display: 'flex', flexDirection: 'column', gap: bp === 'mobile' ? 6 : 10,
    }}>
      <div style={{ width: bp === 'mobile' ? 38 : 48, height: bp === 'mobile' ? 38 : 48, background: bg, borderRadius: bp === 'mobile' ? 10 : 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: bp === 'mobile' ? 18 : 24 }}>{icon}</div>
      <div>
        <div style={{ fontSize: bp === 'mobile' ? 22 : 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: bp === 'mobile' ? 11 : 12, fontWeight: 700, color: '#374151', marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Mobile card row (replaces table row) ──────────────────────
export function MobileCard({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '14px 16px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 10,
      border: '1px solid #F1F5F9', ...style,
    }}>
      {children}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────
export function SectionHeader({ title, action, bp }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: bp === 'mobile' ? 14 : 20, flexWrap: 'wrap', gap: 10 }}>
      <div style={{ fontWeight: 900, fontSize: bp === 'mobile' ? 18 : 22, color: '#0F172A' }}>{title}</div>
      {action}
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────
export function Toast({ toast }) {
  if (!toast) return null
  const err = toast.type === 'error'
  return (
    <div style={{
      position: 'fixed', bottom: 76, right: 16, zIndex: 9999,
      background: err ? '#FEF2F2' : '#F0FDF4',
      border: `1px solid ${err ? '#FECACA' : '#86EFAC'}`,
      color: err ? '#DC2626' : '#16A34A',
      padding: '11px 18px', borderRadius: 10, fontSize: 13,
      fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      maxWidth: 320,
    }}>
      {err ? '❌' : '✅'} {toast.msg}
    </div>
  )
}