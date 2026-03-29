export default function Avatar({ name, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${name.charCodeAt(0) * 7}, 52%, 66%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#fff',
    }}>
      {name.split(' ').map(w => w[0]).join('').slice(0, 2)}
    </div>
  )
}
