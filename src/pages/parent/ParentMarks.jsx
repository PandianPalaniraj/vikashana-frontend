import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useParentStore from '../../store/parentStore'
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

function gradeColor(pct) {
  if (pct >= 85) return '#10B981'
  if (pct >= 70) return '#6366F1'
  if (pct >= 55) return '#F59E0B'
  return '#EF4444'
}

function gradeLabel(pct) {
  if (pct >= 85) return 'Excellent'
  if (pct >= 70) return 'Good'
  if (pct >= 55) return 'Average'
  return 'Needs Attention'
}

// ── Screen 1: Exam list ───────────────────────────────────────────────────────
function ExamList({ byExam, onSelect }) {
  const examNames = Object.keys(byExam)

  if (examNames.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>No marks recorded yet</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {examNames.map(name => {
        const ms  = byExam[name]
        const obt = ms.reduce((s, m) => s + (Number(m.marks_obtained) || 0), 0)
        const max = ms.reduce((s, m) => s + (Number(m.max_marks) || 0), 0)
        const pct = max > 0 ? Math.round((obt / max) * 100) : 0
        const c   = gradeColor(pct)
        const passCount = ms.filter(m => m.result ? m.result === 'Pass' : (Number(m.max_marks) > 0 ? (Number(m.marks_obtained) / Number(m.max_marks)) >= 0.35 : false)).length

        return (
          <div
            key={name}
            onClick={() => onSelect(name)}
            style={{
              background: '#fff', borderRadius: 16, padding: '16px 18px',
              boxShadow: '0 1px 8px rgba(0,0,0,0.07)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14,
              border: `1px solid ${c}22`,
            }}
          >
            {/* Grade circle */}
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: `${c}18`, border: `2px solid ${c}44`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: c, lineHeight: 1 }}>{pct}%</div>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 3 }}>{name}</div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                {obt} / {max} marks · {ms.length} subjects
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: c, marginTop: 2 }}>
                {gradeLabel(pct)}
                {passCount < ms.length && (
                  <span style={{ marginLeft: 8, color: '#EF4444' }}>
                    {ms.length - passCount} fail{ms.length - passCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ width: 40, textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 18, color: '#94A3B8' }}>›</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Screen 2: Exam detail (Marks + Report Card tabs) ─────────────────────────
function ExamDetail({ examName, examMarks, allMarks, activeStudent, onBack }) {
  const [tab, setTab] = useState('marks')

  const obt = examMarks.reduce((s, m) => s + (Number(m.marks_obtained) || 0), 0)
  const max = examMarks.reduce((s, m) => s + (Number(m.max_marks) || 0), 0)
  const pct = max > 0 ? Math.round((obt / max) * 100) : 0
  const c   = gradeColor(pct)

  const sorted = [...examMarks].sort((a, b) => {
    const pa = Number(a.max_marks) > 0 ? Number(a.marks_obtained) / Number(a.max_marks) : 0
    const pb = Number(b.max_marks) > 0 ? Number(b.marks_obtained) / Number(b.max_marks) : 0
    return pb - pa
  })
  const topSubject  = sorted[0]
  const weakSubject = sorted[sorted.length - 1]

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 700, color: '#6366F1', padding: '0 0 14px',
        }}
      >
        ‹ All Exams
      </button>

      {/* Summary banner */}
      <div style={{
        background: `linear-gradient(135deg,${c}ee,${c}bb)`,
        borderRadius: 18, padding: '18px 20px', marginBottom: 14, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>{examName}</div>
          <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: 'rgba(255,255,255,0.9)' }}>{gradeLabel(pct)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{obt} / {max} marks</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12 }}>
          {topSubject && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>Top Subject</div>
              <div style={{ fontWeight: 800, color: '#fff' }}>⭐ {topSubject.subject}</div>
            </div>
          )}
          {weakSubject && weakSubject !== topSubject && (
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>Needs Focus</div>
              <div style={{ fontWeight: 800, color: '#fff' }}>📌 {weakSubject.subject}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#fff', borderRadius: 12, padding: 4, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 14 }}>
        {[
          { key: 'marks',  label: '📊 Marks'       },
          { key: 'report', label: '📋 Report Card'  },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '9px 4px', border: 'none', borderRadius: 9,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: tab === t.key ? '#6366F1' : 'none',
              color: tab === t.key ? '#fff' : '#64748B',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Marks tab ── */}
      {tab === 'marks' && (
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ padding: '13px 16px', fontSize: 13, fontWeight: 800, color: '#0F172A', borderBottom: '1px solid #F1F5F9' }}>
            Subject-wise Marks
          </div>
          {examMarks.map((m, i) => {
            const mmax  = Number(m.max_marks) || 0
            const mobt  = Number(m.marks_obtained) || 0
            const mpct  = mmax > 0 ? Math.round((mobt / mmax) * 100) : 0
            const mc    = gradeColor(mpct)
            const pass  = m.result ? m.result === 'Pass' : mpct >= 35
            return (
              <div key={i} style={{ padding: '12px 16px', borderBottom: i < examMarks.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{m.subject}</span>
                    {!pass && <span style={{ marginLeft: 6, fontSize: 10, color: '#fff', background: '#EF4444', fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>FAIL</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: mc }}>
                      {mobt}<span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>/{mmax}</span>
                    </span>
                    {m.grade && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: mc, background: `${mc}18`, padding: '2px 8px', borderRadius: 20 }}>
                        {m.grade}
                      </span>
                    )}
                  </div>
                </div>
                {mmax > 0 && (
                  <div style={{ background: '#F1F5F9', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, background: mc, width: `${mpct}%`, transition: 'width 0.5s ease' }} />
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginTop: 3 }}>
                  {mmax > 0 ? `${mpct}%` : 'Not entered'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Report Card tab ── */}
      {tab === 'report' && (
        <ReportCard examName={examName} examMarks={examMarks} allMarks={allMarks} activeStudent={activeStudent} />
      )}
    </div>
  )
}

// ── Report Card ───────────────────────────────────────────────────────────────
function ReportCard({ examName, examMarks, allMarks, activeStudent }) {
  const obt = examMarks.reduce((s, m) => s + (Number(m.marks_obtained) || 0), 0)
  const max = examMarks.reduce((s, m) => s + (Number(m.max_marks) || 0), 0)
  const pct = max > 0 ? Math.round((obt / max) * 100) : 0

  const passCount = examMarks.filter(m =>
    m.result ? m.result === 'Pass' : (Number(m.max_marks) > 0 ? (Number(m.marks_obtained) / Number(m.max_marks)) >= 0.35 : false)
  ).length
  const overall = passCount === examMarks.length ? 'PASS' : 'FAIL'

  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0' }}>
      {/* Report header */}
      <div style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)', padding: '20px 18px', color: '#fff' }}>
        <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>
          Progress Report Card
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{activeStudent.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
              Class {activeStudent.class}-{activeStudent.section} · Adm. {activeStudent.admission_no}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: gradeColor(pct) === '#10B981' ? '#6EE7B7' : gradeColor(pct) === '#EF4444' ? '#FCA5A5' : '#FDE68A' }}>{pct}%</div>
            <div style={{
              fontSize: 11, fontWeight: 800, marginTop: 2,
              color: overall === 'PASS' ? '#6EE7B7' : '#FCA5A5',
              background: overall === 'PASS' ? 'rgba(110,231,183,0.15)' : 'rgba(252,165,165,0.15)',
              padding: '2px 10px', borderRadius: 20,
            }}>
              {overall}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
          Exam: {examName}
        </div>
      </div>

      {/* Marks table */}
      <div>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 60px 60px 50px 48px',
          padding: '10px 16px', background: '#F8FAFC',
          borderBottom: '2px solid #E2E8F0',
          fontSize: 10, fontWeight: 700, color: '#64748B', gap: 6,
        }}>
          <span>SUBJECT</span>
          <span style={{ textAlign: 'center' }}>MAX</span>
          <span style={{ textAlign: 'center' }}>SCORED</span>
          <span style={{ textAlign: 'center' }}>%</span>
          <span style={{ textAlign: 'center' }}>GRADE</span>
        </div>

        {examMarks.map((m, i) => {
          const mmax = Number(m.max_marks) || 0
          const mobt = Number(m.marks_obtained) || 0
          const mpct = mmax > 0 ? Math.round((mobt / mmax) * 100) : 0
          const mc   = gradeColor(mpct)
          const pass = m.result ? m.result === 'Pass' : mpct >= 35
          return (
            <div
              key={i}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 60px 60px 50px 48px',
                padding: '10px 16px', gap: 6, alignItems: 'center',
                borderBottom: i < examMarks.length - 1 ? '1px solid #F8FAFC' : 'none',
                background: !pass ? '#FFF9F9' : 'transparent',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{m.subject}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>{mmax}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: mc, textAlign: 'center' }}>{mobt}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: mc, textAlign: 'center' }}>{mmax > 0 ? `${mpct}%` : '—'}</span>
              <span style={{ textAlign: 'center' }}>
                {m.grade
                  ? <span style={{ fontSize: 11, fontWeight: 800, color: mc, background: `${mc}18`, padding: '2px 6px', borderRadius: 8 }}>{m.grade}</span>
                  : <span style={{ fontSize: 11, fontWeight: 700, color: pass ? '#10B981' : '#EF4444' }}>{pass ? 'P' : 'F'}</span>
                }
              </span>
            </div>
          )
        })}

        {/* Totals row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 60px 60px 50px 48px',
          padding: '12px 16px', gap: 6, alignItems: 'center',
          background: '#F0F4FF', borderTop: '2px solid #E0E7FF',
        }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#0F172A' }}>TOTAL</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textAlign: 'center' }}>{max}</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: gradeColor(pct), textAlign: 'center' }}>{obt}</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: gradeColor(pct), textAlign: 'center' }}>{pct}%</span>
          <span style={{
            fontSize: 11, fontWeight: 800, textAlign: 'center',
            color: overall === 'PASS' ? '#10B981' : '#EF4444',
          }}>
            {overall}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>
          {gradeLabel(pct)} · {passCount}/{examMarks.length} subjects passed
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ParentMarks() {
  const navigate = useNavigate()
  const activeStudent = useParentStore(s => s.activeStudent)
  const [marks, setMarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedExam, setSelectedExam] = useState(null)  // null = list view

  useEffect(() => {
    if (!activeStudent) { navigate('/parent/select', { replace: true }); return }
    load()
  }, [activeStudent])

  function load() {
    setLoading(true); setError(null)
    parentApi.getMarks(activeStudent.student_id)
      .then(res => {
        if (!res.success) throw new Error()
        setMarks(res.data || [])
        setSelectedExam(null)
      })
      .catch(() => setError('Could not load marks. Please try again.'))
      .finally(() => setLoading(false))
  }

  if (!activeStudent) return null

  // Group marks by exam name
  const byExam = {}
  marks.forEach(m => {
    const key = m.exam || 'Unknown'
    if (!byExam[key]) byExam[key] = []
    byExam[key].push(m)
  })

  const examMarks = selectedExam ? (byExam[selectedExam] || []) : []

  return (
    <div style={{ padding: 16 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* Header — changes based on view */}
      <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginBottom: 16 }}>
        {selectedExam ? selectedExam : `${activeStudent.name}'s Marks`}
      </div>

      {error && <ErrorBanner msg={error} onRetry={load} />}

      {loading && (
        <div style={{ display: 'grid', gap: 12 }}>
          {[1,2,3].map(i => <Skeleton key={i} h={84} />)}
        </div>
      )}

      {!loading && !error && !selectedExam && (
        <ExamList byExam={byExam} onSelect={setSelectedExam} />
      )}

      {!loading && !error && selectedExam && (
        <ExamDetail
          examName={selectedExam}
          examMarks={examMarks}
          allMarks={marks}
          activeStudent={activeStudent}
          onBack={() => setSelectedExam(null)}
        />
      )}
    </div>
  )
}
