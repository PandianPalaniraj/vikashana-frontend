export default function Toast({ toast }) {
  if (!toast) return null
  const err = toast.type === 'error'
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: err ? '#FEF2F2' : '#F0FDF4',
      border: `1px solid ${err ? '#FECACA' : '#86EFAC'}`,
      color: err ? '#DC2626' : '#16A34A',
      padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    }}>
      {err ? '❌' : '✅'} {toast.msg}
    </div>
  )
}
