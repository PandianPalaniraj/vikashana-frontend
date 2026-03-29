import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useParentStore from '../../store/parentStore'
import { logout, updateProfile, changePassword } from '../../api/auth'

const palette = ['#6366F1', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ name, photo, size = 72 }) {
  const bg = palette[(name || 'A').charCodeAt(0) % palette.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: photo ? '#F8FAFC' : bg, overflow: 'hidden', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 900, color: '#fff',
      border: '3px solid #E2E8F0',
    }}>
      {photo
        ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials(name)
      }
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
      <div style={{ padding: '13px 16px', fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #F1F5F9' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #F8FAFC' }}>
      <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</span>
    </div>
  )
}

export default function ParentProfile() {
  const navigate  = useNavigate()
  const { user, clearAuth, setAuth, token } = useAuthStore()
  const { children, activeStudent, clearParent } = useParentStore(s => ({
    children: s.children, activeStudent: s.activeStudent, clearParent: s.clearParent,
  }))

  // Edit profile state
  const [editOpen, setEditOpen]   = useState(false)
  const [editName, setEditName]   = useState(user?.name || '')
  const [editPhone, setEditPhone] = useState(user?.phone || '')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError]   = useState(null)

  // Change password state
  const [pwOpen, setPwOpen]       = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew]         = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwError, setPwError]     = useState(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  async function handleSaveProfile(e) {
    e.preventDefault()
    setEditSaving(true); setEditError(null)
    try {
      const res = await updateProfile({ name: editName, phone: editPhone })
      if (res.data?.success) {
        setAuth({ ...user, name: res.data.data.name, phone: res.data.data.phone }, token)
        setEditOpen(false)
      } else {
        setEditError('Could not update profile.')
      }
    } catch {
      setEditError('Could not update profile.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (pwNew !== pwConfirm) { setPwError('New passwords do not match.'); return }
    if (pwNew.length < 8)    { setPwError('Password must be at least 8 characters.'); return }
    setPwSaving(true); setPwError(null); setPwSuccess(false)
    try {
      const res = await changePassword({ current_password: pwCurrent, password: pwNew, password_confirmation: pwConfirm })
      if (res.data?.success) {
        setPwSuccess(true)
        setPwCurrent(''); setPwNew(''); setPwConfirm('')
        setTimeout(() => { setPwOpen(false); setPwSuccess(false) }, 1500)
      } else {
        setPwError(res.data?.message || 'Could not change password.')
      }
    } catch (err) {
      setPwError(err?.response?.data?.message || 'Could not change password.')
    } finally {
      setPwSaving(false)
    }
  }

  async function handleLogout() {
    try { await logout() } catch (_) {}
    clearAuth()
    clearParent()
    navigate('/login', { replace: true })
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0',
    fontSize: 14, fontWeight: 600, color: '#0F172A', outline: 'none',
    background: '#F8FAFC', boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: 16 }}>
      <style>{`input:focus{border-color:#6366F1 !important; background:#fff !important;}`}</style>

      {/* Profile header card */}
      <div style={{
        background: 'linear-gradient(135deg,#0F172A 0%,#1E3A5F 55%,#6366F1 100%)',
        borderRadius: 20, padding: '24px 20px', marginBottom: 16, color: '#fff',
        display: 'flex', alignItems: 'center', gap: 16, position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        </div>
        <Avatar name={user?.name} photo={user?.avatar} size={68} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Parent Account</div>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>
            {user?.phone || user?.email}
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20 }}>
              {user?.school?.name}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>

        {/* Account info */}
        <Section title="Account Info">
          <InfoRow label="Full Name"  value={user?.name} />
          <InfoRow label="Phone"      value={user?.phone} />
          <InfoRow label="Email"      value={user?.email} />
          <InfoRow label="School"     value={user?.school?.name} />
          <div style={{ padding: '12px 16px' }}>
            <button
              onClick={() => { setEditName(user?.name || ''); setEditPhone(user?.phone || ''); setEditOpen(true) }}
              style={{
                width: '100%', padding: '10px', border: '1.5px solid #6366F1',
                borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#6366F1',
                background: '#EEF2FF', cursor: 'pointer',
              }}
            >
              ✏️ Edit Profile
            </button>
          </div>
        </Section>

        {/* Linked children */}
        {children.length > 0 && (
          <Section title={`Linked Children (${children.length})`}>
            {children.map((child, i) => (
              <div
                key={child.student_id}
                onClick={() => navigate('/parent/attendance')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderBottom: i < children.length - 1 ? '1px solid #F8FAFC' : 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: child.photo ? '#F8FAFC' : palette[child.name.charCodeAt(0) % palette.length],
                  overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 900, color: '#fff',
                }}>
                  {child.photo
                    ? <img src={child.photo} alt={child.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials(child.name)
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                    {child.name}
                    {activeStudent?.student_id === child.student_id && (
                      <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 700, color: '#6366F1', background: '#EEF2FF', padding: '1px 7px', borderRadius: 10 }}>Active</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>
                    Class {child.class}-{child.section} · {child.admission_no}
                  </div>
                </div>
                <span style={{ fontSize: 14, color: '#CBD5E1' }}>›</span>
              </div>
            ))}
          </Section>
        )}

        {/* Security */}
        <Section title="Security">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F8FAFC' }}>
            <button
              onClick={() => setPwOpen(o => !o)}
              style={{
                width: '100%', padding: '10px', border: '1.5px solid #E2E8F0',
                borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#374151',
                background: '#F8FAFC', cursor: 'pointer', textAlign: 'left',
              }}
            >
              🔒 Change Password
            </button>
          </div>

          {pwOpen && (
            <form onSubmit={handleChangePassword} style={{ padding: '0 16px 16px', display: 'grid', gap: 10 }}>
              {pwError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#065F46', fontWeight: 700 }}>
                  ✅ Password changed successfully!
                </div>
              )}
              <input type="password" placeholder="Current password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="New password (min 8 chars)" value={pwNew} onChange={e => setPwNew(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Confirm new password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} required style={inputStyle} />
              <button
                type="submit" disabled={pwSaving}
                style={{
                  padding: '11px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700,
                  background: pwSaving ? '#94A3B8' : '#6366F1', color: '#fff', cursor: pwSaving ? 'default' : 'pointer',
                }}
              >
                {pwSaving ? 'Saving…' : 'Update Password'}
              </button>
            </form>
          )}
        </Section>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: '1.5px solid #FECACA',
            fontSize: 14, fontWeight: 700, color: '#EF4444', background: '#FEF2F2', cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Edit Profile modal */}
      {editOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
          onClick={() => setEditOpen(false)}
        >
          <form
            onSubmit={handleSaveProfile}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px',
              width: '100%', maxWidth: 480, display: 'grid', gap: 14,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>Edit Profile</div>
            {editError && (
              <div style={{ background: '#FEF2F2', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
                {editError}
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>Full Name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>Phone</label>
              <input value={editPhone} onChange={e => setEditPhone(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button type="button" onClick={() => setEditOpen(false)} style={{ padding: '11px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, fontWeight: 700, color: '#64748B', background: '#F8FAFC', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={editSaving} style={{ padding: '11px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, color: '#fff', background: editSaving ? '#94A3B8' : '#6366F1', cursor: editSaving ? 'default' : 'pointer' }}>
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
