export default function Badge({ label, color, bg }) {
  return (
    <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
      {label}
    </span>
  )
}
