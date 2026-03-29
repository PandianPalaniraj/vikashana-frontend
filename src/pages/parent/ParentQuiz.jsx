import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useParentStore from '../../store/parentStore'
import parentApi from '../../api/parent'

// ── Helpers ───────────────────────────────────────────────────────────────────
const OPTION_KEYS  = ['A', 'B', 'C', 'D']
const OPTION_LABELS = { A: 'option_a', B: 'option_b', C: 'option_c', D: 'option_d' }

const DIFF_STYLE = {
  Easy:   { color: '#10B981', bg: '#ECFDF5' },
  Medium: { color: '#F59E0B', bg: '#FFFBEB' },
  Hard:   { color: '#EF4444', bg: '#FEF2F2' },
}

const CLASS_COLORS = ['#6366F1','#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6']

function Skeleton({ h = 72, r = 14 }) {
  return <div style={{ background: '#E2E8F0', borderRadius: r, height: h, animation: 'pulse 1.5s infinite' }} />
}

// ── Screen 1: Class selection ─────────────────────────────────────────────────
function ClassList({ onSelect }) {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    parentApi.getQuizClasses()
      .then(res => { if (!res.success) throw new Error(); setClasses(res.data || []) })
      .catch(() => setError('Could not load classes.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'grid', gap: 10 }}>
      {[1,2,3,4].map(i => <Skeleton key={i} h={80} />)}
    </div>
  )

  if (error) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#EF4444', fontWeight: 600 }}>{error}</div>
  )

  if (classes.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 6 }}>No quiz questions yet</div>
      <div style={{ fontSize: 13 }}>Ask your school to add quiz questions.</div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {classes.map((cls, i) => {
        const color = CLASS_COLORS[i % CLASS_COLORS.length]
        return (
          <div
            key={cls.class_id}
            onClick={() => onSelect(cls)}
            style={{
              background: '#fff', borderRadius: 16, padding: '16px 18px',
              boxShadow: '0 1px 8px rgba(0,0,0,0.07)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14,
              border: `1px solid ${color}22`,
              transition: 'transform 0.1s',
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: `${color}18`, border: `2px solid ${color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>
              🏫
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Class {cls.class_name}</div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 3 }}>
                {cls.question_count} question{cls.question_count !== 1 ? 's' : ''} available
              </div>
            </div>
            <div style={{ fontSize: 18, color: '#CBD5E1' }}>›</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Screen 2: Subject selection ───────────────────────────────────────────────
function SubjectList({ selectedClass, onSelect, onBack }) {
  const [subjects, setSubjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    parentApi.getQuizSubjects(selectedClass.class_id)
      .then(res => { if (!res.success) throw new Error(); setSubjects(res.data || []) })
      .catch(() => setError('Could not load subjects.'))
      .finally(() => setLoading(false))
  }, [selectedClass.class_id])

  const SUBJECT_ICONS = ['📐','📖','🔬','📜','🎨','🌍','💻','🎵','🏃','🧪','📊','✏️']

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#6366F1', padding: '0 0 14px' }}>
        ‹ Classes
      </button>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
        Class {selectedClass.class_name}
      </div>
      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginBottom: 16 }}>Select a subject to start the quiz</div>

      {loading && <div style={{ display: 'grid', gap: 10 }}>{[1,2,3].map(i => <Skeleton key={i} h={76} />)}</div>}
      {error   && <div style={{ textAlign: 'center', padding: 40, color: '#EF4444', fontWeight: 600 }}>{error}</div>}

      {!loading && !error && (
        <div style={{ display: 'grid', gap: 10 }}>
          {subjects.map((sub, i) => {
            const color = CLASS_COLORS[i % CLASS_COLORS.length]
            return (
              <div
                key={sub.subject_id}
                onClick={() => onSelect(sub)}
                style={{
                  background: '#fff', borderRadius: 16, padding: '16px 18px',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.07)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14,
                  border: `1px solid ${color}22`,
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: `${color}18`, border: `2px solid ${color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                }}>
                  {SUBJECT_ICONS[i % SUBJECT_ICONS.length]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{sub.subject_name}</div>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 3 }}>
                    {sub.question_count} question{sub.question_count !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: color, padding: '4px 10px', borderRadius: 20 }}>
                    Start →
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Screen 3a: Question count picker ─────────────────────────────────────────
const COUNT_OPTIONS = [5, 10, 15, 20, 30]

function QuizSetup({ selectedClass, selectedSubject, onStart, onBack }) {
  const [count, setCount] = useState(10)

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#6366F1', padding: '0 0 14px' }}>
        ‹ Subjects
      </button>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
        {selectedSubject.subject_name} · Class {selectedClass.class_name}
      </div>
      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginBottom: 24 }}>
        How many questions do you want to attempt?
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 28 }}>
        {COUNT_OPTIONS.map(n => (
          <button
            key={n}
            onClick={() => setCount(n)}
            style={{
              border: count === n ? '2.5px solid #6366F1' : '1.5px solid #E2E8F0',
              background: count === n ? '#EEF2FF' : '#fff',
              borderRadius: 14, padding: '16px 4px',
              textAlign: 'center', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, color: count === n ? '#4338CA' : '#0F172A' }}>{n}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: count === n ? '#6366F1' : '#94A3B8', marginTop: 2 }}>Qs</div>
          </button>
        ))}
      </div>

      <div style={{
        background: '#F8FAFC', borderRadius: 14, padding: '16px 18px', marginBottom: 24,
        border: '1px solid #E2E8F0', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🧠</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
          {count} Question{count !== 1 ? 's' : ''}
        </div>
        <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
          {selectedSubject.subject_name} · Class {selectedClass.class_name}
        </div>
      </div>

      <button
        onClick={() => onStart(count)}
        style={{
          width: '100%', padding: '15px', borderRadius: 14, border: 'none',
          background: 'linear-gradient(135deg,#6366F1,#4338CA)', color: '#fff',
          fontSize: 15, fontWeight: 800, cursor: 'pointer',
        }}
      >
        Start Quiz →
      </button>
    </div>
  )
}

// ── Screen 3b: Quiz game ──────────────────────────────────────────────────────
function QuizGame({ selectedClass, selectedSubject, questionCount, onBack, onFinish }) {
  const [questions, setQuestions] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [current,   setCurrent]   = useState(0)
  const [chosen,    setChosen]    = useState(null)    // 'A'|'B'|'C'|'D'
  const [result,    setResult]    = useState(null)    // { correct, correct_answer, explanation }
  const [checking,  setChecking]  = useState(false)
  const [score,     setScore]     = useState(0)

  useEffect(() => {
    parentApi.getQuizQuestions(selectedClass.class_id, selectedSubject.subject_id, questionCount)
      .then(res => { if (!res.success) throw new Error(); setQuestions(res.data || []) })
      .catch(() => setError('Could not load questions.'))
      .finally(() => setLoading(false))
  }, [])

  const q = questions[current]

  async function handleAnswer(option) {
    if (chosen || checking) return
    setChosen(option)
    setChecking(true)
    try {
      const res = await parentApi.checkQuizAnswer(q.id, option)
      setResult(res)
      if (res.correct) setScore(s => s + 1)
    } catch {
      // fallback: mark unknown
      setResult({ correct: false, correct_answer: '?', explanation: '' })
    } finally {
      setChecking(false)
    }
  }

  function handleNext() {
    if (current + 1 >= questions.length) {
      onFinish(score + (result?.correct ? 0 : 0), questions.length, score)
    } else {
      setCurrent(c => c + 1)
      setChosen(null)
      setResult(null)
    }
  }

  if (loading) return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Skeleton h={30} />
      <Skeleton h={120} />
      {[1,2,3,4].map(i => <Skeleton key={i} h={56} />)}
    </div>
  )

  if (error) return <div style={{ textAlign: 'center', padding: 40, color: '#EF4444', fontWeight: 600 }}>{error}</div>

  if (questions.length === 0) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
      <div style={{ fontWeight: 600 }}>No questions available for this subject.</div>
    </div>
  )

  const diffStyle = DIFF_STYLE[q.difficulty] || DIFF_STYLE.Medium
  const progress  = ((current + 1) / questions.length) * 100

  return (
    <div>
      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#6366F1', padding: 0 }}>
          ✕ Quit
        </button>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>
          {current + 1} / {questions.length}
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#6366F1' }}>
          Score: {score}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: '#E2E8F0', borderRadius: 4, height: 6, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 4, background: '#6366F1', width: `${progress}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Question card */}
      <div style={{
        background: 'linear-gradient(135deg,#0F172A,#1E3A5F)',
        borderRadius: 20, padding: '22px 20px', marginBottom: 16, color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: diffStyle.color, background: `${diffStyle.color}22`, padding: '2px 10px', borderRadius: 20 }}>
            {q.difficulty}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{selectedSubject.subject_name}</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5, color: '#fff' }}>
          {q.question}
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
        {OPTION_KEYS.map(key => {
          const text    = q[OPTION_LABELS[key]]
          const isChosen  = chosen === key
          const isCorrect = result?.correct_answer === key
          const isWrong   = isChosen && result && !result.correct

          let bg = '#fff', border = '1.5px solid #E2E8F0', color = '#0F172A'
          if (result) {
            if (isCorrect)     { bg = '#ECFDF5'; border = '2px solid #10B981'; color = '#065F46' }
            else if (isWrong)  { bg = '#FEF2F2'; border = '2px solid #EF4444'; color = '#DC2626' }
            else if (isChosen) { bg = '#F8FAFC'; border = '1.5px solid #CBD5E1'; color = '#94A3B8' }
          } else if (isChosen) {
            bg = '#EEF2FF'; border = '2px solid #6366F1'; color = '#4338CA'
          }

          return (
            <button
              key={key}
              onClick={() => handleAnswer(key)}
              disabled={!!chosen}
              style={{
                background: bg, border, borderRadius: 14, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12, cursor: chosen ? 'default' : 'pointer',
                textAlign: 'left', width: '100%',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: result
                  ? isCorrect ? '#10B981' : isWrong ? '#EF4444' : '#E2E8F0'
                  : isChosen ? '#6366F1' : '#F1F5F9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 900,
                color: (isCorrect || isWrong || isChosen) ? '#fff' : '#64748B',
              }}>
                {result && isCorrect ? '✓' : result && isWrong ? '✗' : key}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color, flex: 1, lineHeight: 1.4 }}>{text}</span>
            </button>
          )
        })}
      </div>

      {/* Feedback / explanation */}
      {result && (
        <div style={{
          background: result.correct ? '#ECFDF5' : '#FEF2F2',
          border: `1.5px solid ${result.correct ? '#A7F3D0' : '#FECACA'}`,
          borderRadius: 14, padding: '14px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>
            {result.correct ? '😊' : '😢'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: result.correct ? '#065F46' : '#DC2626', marginBottom: result.explanation ? 4 : 0 }}>
              {result.correct ? 'Correct!' : `Wrong — Answer is ${result.correct_answer}`}
            </div>
            {result.explanation && (
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{result.explanation}</div>
            )}
          </div>
        </div>
      )}

      {/* Next / Finish button */}
      {result && (
        <button
          onClick={handleNext}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: '#6366F1', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
          }}
        >
          {current + 1 >= questions.length ? '🏁 See Results' : 'Next Question →'}
        </button>
      )}
    </div>
  )
}

// ── Screen 4: Results ─────────────────────────────────────────────────────────
function QuizResults({ score, total, selectedClass, selectedSubject, onPlayAgain, onHome }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  const { emoji, label, color } = pct >= 80
    ? { emoji: '🏆', label: 'Excellent!',      color: '#10B981' }
    : pct >= 60
    ? { emoji: '👍', label: 'Good Job!',        color: '#6366F1' }
    : pct >= 40
    ? { emoji: '📚', label: 'Keep Practising',  color: '#F59E0B' }
    : { emoji: '💪', label: 'Try Again!',       color: '#EF4444' }

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      {/* Result card */}
      <div style={{
        background: 'linear-gradient(135deg,#0F172A,#1E3A5F)',
        borderRadius: 24, padding: '36px 24px', marginBottom: 20, color: '#fff',
      }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>{emoji}</div>
        <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 56, fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>out of {total}</div>
        <div style={{ marginTop: 16, display: 'inline-block', background: `${color}33`, border: `1.5px solid ${color}66`, borderRadius: 20, padding: '6px 20px' }}>
          <span style={{ fontSize: 18, fontWeight: 900, color }}>{pct}%</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Correct',   value: score,          color: '#10B981', bg: '#ECFDF5' },
          { label: 'Wrong',     value: total - score,  color: '#EF4444', bg: '#FEF2F2' },
          { label: 'Score',     value: `${pct}%`,      color: '#6366F1', bg: '#EEF2FF' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '14px 8px' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: s.color, opacity: 0.75, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginBottom: 20 }}>
        {selectedSubject.subject_name} · Class {selectedClass.class_name}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gap: 10 }}>
        <button
          onClick={onPlayAgain}
          style={{ padding: '14px', borderRadius: 14, border: 'none', background: '#6366F1', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
        >
          🔄 Play Again
        </button>
        <button
          onClick={onHome}
          style={{ padding: '14px', borderRadius: 14, border: '1.5px solid #E2E8F0', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          ← Back to Classes
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ParentQuiz() {
  const navigate = useNavigate()
  const activeStudent = useParentStore(s => s.activeStudent)

  // Screen: 'classes' | 'subjects' | 'setup' | 'game' | 'results'
  const [screen,          setScreen]          = useState('classes')
  const [selectedClass,   setSelectedClass]   = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedCount,   setSelectedCount]   = useState(10)
  const [finalScore,      setFinalScore]      = useState(0)
  const [totalQuestions,  setTotalQuestions]  = useState(0)
  const [gameKey,         setGameKey]         = useState(0)   // force remount on replay

  useEffect(() => {
    if (!activeStudent) navigate('/parent/select', { replace: true })
  }, [activeStudent])

  if (!activeStudent) return null

  function handleClassSelect(cls) {
    setSelectedClass(cls)
    setScreen('subjects')
  }

  function handleSubjectSelect(sub) {
    setSelectedSubject(sub)
    setScreen('setup')
  }

  function handleCountStart(count) {
    setSelectedCount(count)
    setGameKey(k => k + 1)
    setScreen('game')
  }

  function handleFinish(unused, total, score) {
    setFinalScore(score)
    setTotalQuestions(total)
    setScreen('results')
  }

  function handlePlayAgain() {
    setScreen('setup')
  }

  function handleBackToClasses() {
    setSelectedClass(null)
    setSelectedSubject(null)
    setScreen('classes')
  }

  return (
    <div style={{ padding: 16 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* Page title — changes per screen */}
      {screen === 'classes' && (
        <>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>Quiz</div>
          <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginBottom: 16 }}>
            Select a class to start playing
          </div>
        </>
      )}

      {screen === 'classes'  && <ClassList onSelect={handleClassSelect} />}
      {screen === 'subjects' && selectedClass && (
        <SubjectList
          selectedClass={selectedClass}
          onSelect={handleSubjectSelect}
          onBack={() => setScreen('classes')}
        />
      )}
      {screen === 'setup' && selectedClass && selectedSubject && (
        <QuizSetup
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
          onStart={handleCountStart}
          onBack={() => setScreen('subjects')}
        />
      )}
      {screen === 'game' && selectedClass && selectedSubject && (
        <QuizGame
          key={gameKey}
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
          questionCount={selectedCount}
          onBack={() => setScreen('setup')}
          onFinish={handleFinish}
        />
      )}
      {screen === 'results' && selectedClass && selectedSubject && (
        <QuizResults
          score={finalScore}
          total={totalQuestions}
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
          onPlayAgain={handlePlayAgain}
          onHome={handleBackToClasses}
        />
      )}
    </div>
  )
}
