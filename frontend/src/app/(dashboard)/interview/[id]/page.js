// src/app/(dashboard)/interview/[id]/page.js
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AudioRecorder } from '@/components/interview/AudioRecorder'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { getInterview, endInterview } from '@/services/interviews'
import { submitAnswer, pollScore } from '@/services/answers'
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google'
import {
  Zap, Mic, LogOut, ArrowLeft, Loader2,
  CheckCircle2, AlertCircle, ChevronRight,
  Pause, Square, Play, Circle,
  BookOpen, FileText, BarChart2,
} from 'lucide-react'
import './interview.css'

const syne = Syne({ subsets: ['latin'], weight: ['600','700','800'], variable: '--font-syne' })
const dm   = DM_Sans({ subsets: ['latin'], weight: ['400','500'], variable: '--font-dm' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400','500'], variable: '--font-mono' })

const EMPTY_WAVE_BARS = [1,2,3,4,5,6,7]

function shortId(id) {
  if (!id) return '—'
  const s = String(id)
  return s.length > 12 ? `${s.slice(0,6)}…${s.slice(-4)}` : s
}

function parseDurationToSeconds(durationString) {
  if (!durationString) return 0
  const parts = String(durationString).split(':')
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10) || 0
    const s = parseInt(parts[1], 10) || 0
    return m * 60 + s
  }
  const n = parseFloat(durationString)
  return isNaN(n) ? 0 : n
}

/* ── tiny reusable pill ─────────────────────────────────────────── */
function Pill({ children, color = 'default' }) {
  const palette = {
    default: { bg:'rgba(255,255,255,0.06)', border:'rgba(255,255,255,0.1)',   text:'rgba(255,255,255,0.5)' },
    indigo:  { bg:'rgba(99,102,241,0.15)',  border:'rgba(99,102,241,0.35)',   text:'#a5b4fc' },
    amber:   { bg:'rgba(251,191,36,0.12)',  border:'rgba(251,191,36,0.3)',    text:'#fcd34d' },
    green:   { bg:'rgba(52,211,153,0.12)',  border:'rgba(52,211,153,0.3)',    text:'#6ee7b7' },
    red:     { bg:'rgba(248,113,113,0.15)', border:'rgba(248,113,113,0.3)',   text:'#fca5a5' },
  }
  const c = palette[color] || palette.default
  return (
    <span style={{
      display:'inline-flex', alignItems:'center',
      background:c.bg, border:`1px solid ${c.border}`, color:c.text,
      borderRadius:999, padding:'3px 10px',
      fontSize:'0.67rem', fontFamily:'var(--font-mono)',
      letterSpacing:'0.07em', textTransform:'uppercase', whiteSpace:'nowrap',
    }}>
      {children}
    </span>
  )
}

/* ── animated waveform bars during recording ────────────────────── */
function Waveform({ active }) {
  const heights = [30, 55, 75, 90, 75, 55, 30, 45, 65, 45]
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, height:40 }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width: 4, borderRadius: 4,
          background: active ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.1)',
          height: active ? `${h}%` : '20%',
          animation: active ? `wave 0.8s ${i * 0.08}s ease-in-out infinite alternate` : 'none',
          transition: 'height 0.3s ease',
        }} />
      ))}
    </div>
  )
}

/* ── 3-step progress bar (top of page, below topbar) ───────────── */
function StepBar({ phase }) {
  const step = ['idle','recording','paused'].includes(phase) ? 1 :
               ['submitting'].includes(phase)                ? 2 :
               ['scored','failed'].includes(phase)           ? 3 : 1
  const steps = [
    { n:1, label:'Read Question', icon: BookOpen  },
    { n:2, label:'Record Answer', icon: Mic       },
    { n:3, label:'View Results',  icon: BarChart2 },
  ]
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      gap: 0, padding:'0.65rem 1.5rem',
      borderBottom:'1px solid rgba(255,255,255,0.05)',
    }}>
      {steps.map((s, idx) => {
        const done    = step > s.n
        const current = step === s.n
        const Icon    = s.icon
        return (
          <div key={s.n} style={{ display:'flex', alignItems:'center' }}>
            {/* node */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <div style={{
                width:30, height:30, borderRadius:'50%',
                display:'flex', alignItems:'center', justifyContent:'center',
                background: done    ? 'rgba(52,211,153,0.2)'   :
                            current ? 'rgba(99,102,241,0.25)'  :
                                      'rgba(255,255,255,0.05)',
                border: `1.5px solid ${
                  done    ? 'rgba(52,211,153,0.5)'  :
                  current ? 'rgba(99,102,241,0.6)'  :
                            'rgba(255,255,255,0.1)'}`,
                transition:'all 0.35s',
              }}>
                {done
                  ? <CheckCircle2 size={14} style={{ color:'#6ee7b7' }} />
                  : <Icon size={13} style={{ color: current ? '#a5b4fc' : 'rgba(255,255,255,0.25)' }} />
                }
              </div>
              <span className={mono.className} style={{
                fontSize:'0.6rem', letterSpacing:'0.07em', textTransform:'uppercase',
                color: done ? '#6ee7b7' : current ? '#a5b4fc' : 'rgba(255,255,255,0.2)',
                whiteSpace:'nowrap',
              }}>
                {s.label}
              </span>
            </div>
            {/* connector */}
            {idx < steps.length - 1 && (
              <div style={{
                width:80, height:1, margin:'0 8px', marginBottom:18,
                background: step > s.n
                  ? 'rgba(52,211,153,0.4)'
                  : 'rgba(255,255,255,0.07)',
                transition:'background 0.35s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── main page ──────────────────────────────────────────────────── */
export default function InterviewPage() {
  const { id }  = useParams()
  const router  = useRouter()
  const transcriptEndRef = useRef(null)

  /* state (same as spec) */
  const [session,        setSession]        = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionError,   setSessionError]   = useState(null)
  const [transcripts,    setTranscripts]    = useState([])
  const [recorderError,  setRecorderError]  = useState(null)
  const [wsStatus,       setWsStatus]       = useState('disconnected')
  const [isEnding,       setIsEnding]       = useState(false)
  const [isSubmitting,   setIsSubmitting]   = useState(false)
  const [submitError,    setSubmitError]    = useState(null)
  const [scoreResult,    setScoreResult]    = useState(null)

  /* NEW STATE — multi-question */
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  /* session fetch */
  useEffect(() => {
    async function fetchSession() {
      try {
        const data = await getInterview(id)
        setSession(data)
      } catch (err) {
        setSessionError(err.message)
      } finally {
        setSessionLoading(false)
      }
    }
    fetchSession()
  }, [id])

  /* auto-scroll transcript to bottom */
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [transcripts])

  /* recorder callbacks */
  const handleTranscript = useCallback(({ text, chunkIndex }) => {
    if (!text || text === '[silence]') return
    setTranscripts(prev => [...prev, { text, chunkIndex, timestamp: new Date() }])
  }, [])

  const { isRecording, isPaused, duration, stream, startRecording, stopRecording, togglePause } =
    useAudioRecorder({
      sessionId: id,
      onTranscript: handleTranscript,
      onError: setRecorderError,
      onStatusChange: setWsStatus,
    })

  /* end interview */
  const handleEndInterview = async () => {
    if (isEnding) return
    setIsEnding(true)
    if (isRecording) stopRecording()
    try {
      await endInterview(id)
      router.push(`/results/${id}`)
    } catch (err) {
      setRecorderError(err.message)
      setIsEnding(false)
    }
  }

  /* stop + score */
  const handleStopAndScore = async () => {
    stopRecording()
    const fullTranscript = transcripts.map(t => t.text).join(' ')
    if (!fullTranscript.trim()) {
      setSubmitError('No transcript detected. Please record your answer before submitting.')
      return
    }
    const currentQuestion = session?.questions?.[currentQuestionIndex]
    if (!currentQuestion) {
      setSubmitError('Could not find question data. Please refresh and try again.')
      return
    }
    const audioDuration = parseDurationToSeconds(duration)
    setIsSubmitting(true)
    setSubmitError(null)
    setScoreResult(null)
    try {
      const { answer_id } = await submitAnswer(currentQuestion.id, fullTranscript, audioDuration)
      const result = await pollScore(answer_id)
      setScoreResult(result)
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit answer. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* advance to next question and reset all per-question state */
  async function handleNextQuestion() {
    setCurrentQuestionIndex(prev => prev + 1)
    setTranscripts([])
    setScoreResult(null)
    setSubmitError(null)
    setRecorderError(null)
    // recording already stopped at this point
  }

  /* skip current question */
  function handleSkipQuestion() {
    if (isLastQuestion) {
      handleEndInterview()
    } else {
      setCurrentQuestionIndex(prev => prev + 1)
      setTranscripts([])
      setScoreResult(null)
      setSubmitError(null)
      setRecorderError(null)
    }
  }

  /* ── loading guard ─────────────────────────────────────────────── */
  if (sessionLoading) {
    return (
      <div className={`${syne.variable} ${dm.variable} ${mono.variable} iview-root`}>
        <div className="iview-noise" /><div className="iview-scan" />
        <div className="iview-orb iview-orb-1" /><div className="iview-orb iview-orb-2" />
        <div className="iview-layer" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
            <Loader2 size={32} className="animate-spin" style={{ color:'rgba(165,180,252,0.8)' }} />
            <span className={mono.className} style={{ fontSize:'0.72rem', opacity:0.35, letterSpacing:'0.1em' }}>
              LOADING SESSION
            </span>
          </div>
        </div>
      </div>
    )
  }

  /* ── error guard ───────────────────────────────────────────────── */
  if (sessionError) {
    return (
      <div className={`${syne.variable} ${dm.variable} ${mono.variable} iview-root`}>
        <div className="iview-noise" /><div className="iview-scan" />
        <div className="iview-orb iview-orb-1" /><div className="iview-orb iview-orb-2" />
        <div className="iview-layer" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem' }}>
          <AlertCircle size={28} style={{ color:'#f87171' }} />
          <p className={dm.className} style={{ color:'#fca5a5', margin:0 }}>{sessionError}</p>
          <Link href="/dashboard" style={{ display:'flex', alignItems:'center', gap:6, color:'rgba(255,255,255,0.35)', fontSize:'0.875rem', fontFamily:'var(--font-dm)' }}>
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  /* derive current question + multi-question helpers */
  const currentQuestion = session?.questions?.[currentQuestionIndex]
  const totalQuestions  = session?.questions?.length ?? 0
  const isLastQuestion  = currentQuestionIndex === totalQuestions - 1

  /* derive phase for state machine */
  const phase =
    scoreResult?.overall_score != null          ? 'scored'     :
    scoreResult?.processing_status === 'failed' ? 'failed'     :
    isSubmitting                                ? 'submitting'  :
    isPaused                                    ? 'paused'      :
    isRecording                                 ? 'recording'   :
                                                  'idle'

  /* ws status indicator color */
  const wsColor =
    wsStatus === 'connected'    ? '#4ade80' :
    wsStatus === 'connecting'   ? '#facc15' : '#f87171'

  /* ──────────────────── MAIN RENDER ──────────────────────────────── */
  return (
    <div className={`${syne.variable} ${dm.variable} ${mono.variable} iview-root`}>
      <div className="iview-noise" />
      <div className="iview-scan" />
      <div className="iview-orb iview-orb-1" />
      <div className="iview-orb iview-orb-2" />

      <div className="iview-layer" style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

        {/* ══════════════ TOPBAR ════════════════════════════════════ */}
        <header className="iview-topbar" style={{ flexShrink:0 }}>
          {/* Logo */}
          <div className="iview-logo">
            <Zap size={17} style={{ color:'#a5b4fc' }} />
            <span className={syne.className} style={{ fontWeight:700, letterSpacing:'-0.01em' }}>
              InterviewAI
            </span>
          </div>

          {/* Session meta — centre */}
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            {/* live ws dot */}
            <span style={{ width:7, height:7, borderRadius:'50%', background:wsColor, boxShadow: wsStatus==='connected' ? `0 0 6px ${wsColor}` : 'none', flexShrink:0 }} />
            {session?.domain && (
              <span className={mono.className} style={{ fontSize:'0.68rem', opacity:0.45, letterSpacing:'0.05em', textTransform:'capitalize' }}>
                {session.domain}
              </span>
            )}
            <span style={{ opacity:0.2, fontSize:'0.75rem' }}>·</span>
            <span className={mono.className} style={{ fontSize:'0.68rem', opacity:0.45, letterSpacing:'0.05em', textTransform:'capitalize' }}>
              {session?.difficulty}
            </span>
            {session?.company_mode && (
              <>
                <span style={{ opacity:0.2, fontSize:'0.75rem' }}>·</span>
                <span className={mono.className} style={{ fontSize:'0.68rem', opacity:0.45, letterSpacing:'0.05em' }}>
                  {session.company_mode}
                </span>
              </>
            )}
          </div>

          {/* End button */}
          <button
            className="iview-end-btn"
            onClick={handleEndInterview}
            disabled={isEnding}
          >
            {isEnding ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
            End Interview
          </button>
        </header>

        {/* ══════════════ STEP PROGRESS BAR ════════════════════════ */}
        <StepBar phase={phase} />

        {/* ══════════════ SPLIT LAYOUT ══════════════════════════════ */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: '1rem',
          padding: '1rem 1.25rem 1.25rem',
          maxWidth: 1160,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
          overflow: 'hidden',
          minHeight: 0,
        }}>

          {/* ═════════════ LEFT COLUMN — QUESTION ═══════════════════ */}
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', minWidth:0, overflow:'hidden' }}>

            {/* ── Question card ── */}
            <div className="iview-card" style={{
              flex: 1, display:'flex', flexDirection:'column',
              padding:'1.75rem 2rem', gap:'1.25rem', overflow:'hidden',
            }}>
              {/* Header row */}
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
                <Pill color="indigo">
                  Q{currentQuestionIndex + 1} of {totalQuestions}
                </Pill>
                {currentQuestion?.question_type && (
                  <Pill>{currentQuestion.question_type}</Pill>
                )}
                {currentQuestion?.is_follow_up && (
                  <Pill color="amber">Follow-up</Pill>
                )}
              </div>

              {/* The question — primary reading surface */}
              <div style={{ flex:1, overflowY:'auto', paddingRight:4 }}>
                {currentQuestion ? (
                  <p className={dm.className} style={{
                    fontSize:'clamp(1.05rem, 1.8vw, 1.25rem)',
                    lineHeight:1.75, margin:0,
                    color:'rgba(255,255,255,0.92)',
                    fontWeight:500,
                  }}>
                    {currentQuestion.question_text}
                  </p>
                ) : (
                  <p className={dm.className} style={{ opacity:0.35, fontStyle:'italic', margin:0 }}>
                    No question available for this session.
                  </p>
                )}
              </div>

              {/* STAR tip — always visible, anchored to bottom of card */}
              <div style={{
                padding:'0.85rem 1rem',
                background:'rgba(99,102,241,0.06)',
                border:'1px solid rgba(99,102,241,0.14)',
                borderRadius:10, flexShrink:0,
              }}>
                <p className={dm.className} style={{ margin:0, fontSize:'0.82rem', lineHeight:1.6, color:'rgba(165,180,252,0.75)' }}>
                  <strong style={{ fontWeight:600, color:'rgba(165,180,252,0.9)' }}>💡 STAR method:</strong>{' '}
                  Frame your answer as <em>Situation → Task → Action → Result</em> for maximum clarity and impact.
                </p>
              </div>
            </div>

            {/* ── Live transcript card ── */}
            <div className="iview-card" style={{
              padding:'1rem 1.25rem',
              height:150, flexShrink:0,
              display:'flex', flexDirection:'column', gap:8,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <FileText size={12} style={{ opacity:0.35 }} />
                <span className={mono.className} style={{ fontSize:'0.62rem', letterSpacing:'0.1em', opacity:0.35, textTransform:'uppercase' }}>
                  Live Transcript
                </span>
                {/* pulsing REC indicator while recording */}
                {isRecording && !isPaused && (
                  <span style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'#f87171', animation:'pulse 1s infinite' }} />
                    <span className={mono.className} style={{ fontSize:'0.6rem', color:'#f87171', letterSpacing:'0.08em' }}>REC</span>
                  </span>
                )}
              </div>

              <div style={{ flex:1, overflowY:'auto', paddingRight:4 }}>
                {transcripts.length === 0 ? (
                  <p className={mono.className} style={{ opacity:0.2, fontSize:'0.78rem', margin:0, fontStyle:'italic' }}>
                    Your words will appear here as you speak…
                  </p>
                ) : (
                  <p className={dm.className} style={{
                    margin:0, fontSize:'0.85rem', lineHeight:1.7,
                    color:'rgba(255,255,255,0.72)',
                  }}>
                    {transcripts.map(t => t.text).join(' ')}
                    <span ref={transcriptEndRef} />
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ═════════════ RIGHT COLUMN — RECORDING PANEL ══════════ */}
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', minWidth:0 }}>

            {/* ── Main action card ── */}
            <div className="iview-card" style={{
              flex:1,
              display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center',
              padding:'2rem 1.5rem',
              gap:'1.75rem',
              textAlign:'center',
              position:'relative',
            }}>

              {/* ── IDLE ── */}
              {phase === 'idle' && (
                <>
                  {/* Large mic button */}
                  <button
                    onClick={startRecording}
                    style={{
                      width:96, height:96, borderRadius:'50%',
                      background:'rgba(99,102,241,0.15)',
                      border:'2px solid rgba(99,102,241,0.4)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor:'pointer', transition:'all 0.2s',
                      flexShrink:0,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(99,102,241,0.28)'
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(99,102,241,0.15)'
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                    aria-label="Start recording"
                  >
                    <Mic size={38} style={{ color:'#a5b4fc' }} />
                  </button>

                  <div>
                    <p className={syne.className} style={{ fontWeight:700, fontSize:'1.05rem', margin:'0 0 6px', color:'rgba(255,255,255,0.9)' }}>
                      Ready to answer?
                    </p>
                    <p className={dm.className} style={{ fontSize:'0.82rem', opacity:0.38, margin:0, lineHeight:1.5 }}>
                      Tap the mic when you're ready.<br />Take your time — there's no rush.
                    </p>
                  </div>

                  <button
                    onClick={startRecording}
                    style={{
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                      background:'rgba(99,102,241,0.85)',
                      border:'none', borderRadius:10,
                      color:'#fff', cursor:'pointer',
                      padding:'0.75rem 2rem',
                      fontSize:'0.875rem', fontWeight:600,
                      fontFamily:'var(--font-syne)',
                      letterSpacing:'0.02em',
                      width:'100%',
                      transition:'background 0.2s, transform 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,1)'; e.currentTarget.style.transform='translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(99,102,241,0.85)'; e.currentTarget.style.transform='translateY(0)' }}
                  >
                    <Mic size={16} /> Start Recording
                  </button>

                  {/* Skip question text button */}
                  <button onClick={handleSkipQuestion} style={{
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.25)',
                    fontSize: '0.75rem', cursor: 'pointer',
                    fontFamily: 'var(--font-dm)',
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                    marginTop: -8,
                  }}>
                    {isLastQuestion ? 'Skip & finish' : 'Skip this question'}
                  </button>
                </>
              )}

              {/* ── RECORDING ── */}
              {phase === 'recording' && (
                <>
                  {/* Pulsing record ring */}
                  <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <div style={{
                      position:'absolute', width:110, height:110, borderRadius:'50%',
                      background:'rgba(239,68,68,0.08)',
                      animation:'ping 1.6s cubic-bezier(0,0,0.2,1) infinite',
                    }} />
                    <div style={{
                      position:'absolute', width:88, height:88, borderRadius:'50%',
                      background:'rgba(239,68,68,0.05)',
                      animation:'ping 1.6s 0.4s cubic-bezier(0,0,0.2,1) infinite',
                    }} />
                    <div style={{
                      width:72, height:72, borderRadius:'50%',
                      background:'rgba(239,68,68,0.15)',
                      border:'2px solid rgba(239,68,68,0.5)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <Circle size={22} style={{ color:'#f87171', fill:'#f87171' }} />
                    </div>
                  </div>

                  {/* Timer + status */}
                  <div>
                    <div className={mono.className} style={{
                      fontSize:'2.5rem', fontWeight:500,
                      letterSpacing:'0.06em', color:'rgba(255,255,255,0.93)', lineHeight:1,
                    }}>
                      {duration || '00:00'}
                    </div>
                    <p className={mono.className} style={{
                      fontSize:'0.62rem', letterSpacing:'0.14em',
                      color:'#f87171', marginTop:6, opacity:0.85,
                    }}>
                      ● RECORDING
                    </p>
                  </div>

                  {/* Waveform */}
                  <Waveform active />

                  {/* hidden AudioRecorder keeps the hook wired */}
                  <div style={{ display:'none' }}>
                    <AudioRecorder
                      isRecording={isRecording} isPaused={isPaused}
                      duration={duration} stream={stream}
                      onStart={startRecording} onStop={handleStopAndScore}
                      onTogglePause={togglePause}
                      waveBarCount={EMPTY_WAVE_BARS.length}
                    />
                  </div>

                  {/* Controls */}
                  <div style={{ display:'flex', gap:'0.6rem', width:'100%' }}>
                    <button
                      onClick={togglePause}
                      style={{
                        flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                        background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                        borderRadius:10, color:'rgba(255,255,255,0.7)', cursor:'pointer',
                        padding:'0.65rem', fontSize:'0.8rem',
                        fontFamily:'var(--font-syne)', fontWeight:600,
                        transition:'background 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.11)'}
                      onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                    >
                      <Pause size={14} /> Pause
                    </button>
                    <button
                      onClick={handleStopAndScore}
                      style={{
                        flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                        background:'rgba(99,102,241,0.9)', border:'none',
                        borderRadius:10, color:'#fff', cursor:'pointer',
                        padding:'0.65rem', fontSize:'0.8rem',
                        fontFamily:'var(--font-syne)', fontWeight:700,
                        transition:'background 0.2s, transform 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,1)'; e.currentTarget.style.transform='translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.background='rgba(99,102,241,0.9)'; e.currentTarget.style.transform='translateY(0)' }}
                    >
                      <Square size={12} style={{ fill:'#fff' }} /> Submit Answer
                    </button>
                  </div>
                </>
              )}

              {/* ── PAUSED ── */}
              {phase === 'paused' && (
                <>
                  <div style={{
                    width:72, height:72, borderRadius:'50%',
                    background:'rgba(251,191,36,0.12)',
                    border:'2px solid rgba(251,191,36,0.35)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0,
                  }}>
                    <Pause size={28} style={{ color:'#fcd34d' }} />
                  </div>

                  <div>
                    <div className={mono.className} style={{ fontSize:'2.5rem', fontWeight:500, letterSpacing:'0.06em', color:'rgba(255,255,255,0.93)', lineHeight:1 }}>
                      {duration || '00:00'}
                    </div>
                    <p className={mono.className} style={{ fontSize:'0.62rem', letterSpacing:'0.12em', color:'#fcd34d', marginTop:6, opacity:0.85 }}>
                      ⏸ PAUSED
                    </p>
                  </div>

                  <Waveform active={false} />

                  <div style={{ display:'flex', gap:'0.6rem', width:'100%' }}>
                    <button
                      onClick={togglePause}
                      style={{
                        flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                        background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.3)',
                        borderRadius:10, color:'#fcd34d', cursor:'pointer',
                        padding:'0.65rem', fontSize:'0.8rem',
                        fontFamily:'var(--font-syne)', fontWeight:600,
                        transition:'background 0.2s',
                      }}
                    >
                      <Play size={14} /> Resume
                    </button>
                    <button
                      onClick={handleStopAndScore}
                      style={{
                        flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                        background:'rgba(99,102,241,0.9)', border:'none',
                        borderRadius:10, color:'#fff', cursor:'pointer',
                        padding:'0.65rem', fontSize:'0.8rem',
                        fontFamily:'var(--font-syne)', fontWeight:700,
                        transition:'background 0.2s',
                      }}
                    >
                      <Square size={12} style={{ fill:'#fff' }} /> Submit Answer
                    </button>
                  </div>
                </>
              )}

              {/* ── SUBMITTING ── */}
              {phase === 'submitting' && (
                <>
                  <div style={{
                    width:80, height:80, borderRadius:'50%',
                    background:'rgba(99,102,241,0.1)',
                    border:'2px solid rgba(99,102,241,0.25)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0,
                  }}>
                    <Loader2 size={34} className="animate-spin" style={{ color:'rgba(165,180,252,0.9)' }} />
                  </div>

                  <div>
                    <p className={syne.className} style={{ fontWeight:700, fontSize:'1.05rem', margin:'0 0 6px', color:'rgba(255,255,255,0.9)' }}>
                      Analysing your answer…
                    </p>
                    <p className={dm.className} style={{ fontSize:'0.82rem', opacity:0.38, margin:0, lineHeight:1.5 }}>
                      AI is scoring your response.<br />This usually takes 10–20 seconds.
                    </p>
                  </div>

                  {/* Animated bounce dots */}
                  <div style={{ display:'flex', gap:7 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{
                        width:8, height:8, borderRadius:'50%',
                        background:'rgba(99,102,241,0.65)',
                        animation:`bounce 1.2s ${i*0.2}s ease-in-out infinite`,
                      }} />
                    ))}
                  </div>
                </>
              )}

              {/* ── SCORED ── */}
              {phase === 'scored' && (
                <>
                  {/* Score circle */}
                  <div style={{
                    width:100, height:100, borderRadius:'50%',
                    background:'rgba(52,211,153,0.1)',
                    border:'2px solid rgba(52,211,153,0.35)',
                    display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center',
                    gap:2, flexShrink:0,
                  }}>
                    <span className={syne.className} style={{ fontSize:'1.9rem', fontWeight:800, color:'#6ee7b7', lineHeight:1 }}>
                      {Number(scoreResult.overall_score).toFixed(1)}
                    </span>
                    <span className={mono.className} style={{ fontSize:'0.58rem', opacity:0.45, letterSpacing:'0.08em' }}>/ 10</span>
                  </div>

                  {!isLastQuestion ? (
                    /* ── NOT last question: heading + two buttons ── */
                    <>
                      <div>
                        <p className={syne.className} style={{ fontWeight:700, fontSize:'1.05rem', margin:'0 0 5px', color:'rgba(255,255,255,0.92)' }}>
                          Answer scored! 🎉
                        </p>
                        <p className={dm.className} style={{ fontSize:'0.82rem', opacity:0.38, margin:0 }}>
                          View your full breakdown with AI feedback
                        </p>
                      </div>

                      <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem', width:'100%' }}>
                        {/* Next Question button */}
                        <button
                          onClick={handleNextQuestion}
                          style={{
                            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                            background:'rgba(52,211,153,0.85)',
                            border:'none', borderRadius:10,
                            color:'#022c22', cursor:'pointer',
                            padding:'0.75rem 1.75rem',
                            fontSize:'0.875rem', fontWeight:700,
                            fontFamily:'var(--font-syne)',
                            width:'100%',
                            transition:'background 0.2s, transform 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background='rgba(52,211,153,1)'; e.currentTarget.style.transform='translateY(-1px)' }}
                          onMouseLeave={e => { e.currentTarget.style.background='rgba(52,211,153,0.85)'; e.currentTarget.style.transform='translateY(0)' }}
                        >
                          Next Question → <ChevronRight size={15} />
                        </button>

                        {/* End Interview ghost button */}
                        <button
                          onClick={handleEndInterview}
                          style={{
                            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                            background:'rgba(255,255,255,0.07)',
                            border:'1px solid rgba(255,255,255,0.12)',
                            borderRadius:10,
                            color:'#fff', cursor:'pointer',
                            padding:'0.75rem 1.75rem',
                            fontSize:'0.875rem', fontWeight:600,
                            fontFamily:'var(--font-syne)',
                            width:'100%',
                            transition:'background 0.2s, transform 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.transform='translateY(-1px)' }}
                          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.transform='translateY(0)' }}
                        >
                          End Interview
                        </button>
                      </div>
                    </>
                  ) : (
                    /* ── Last question: "All answered" heading + single View Results button ── */
                    <>
                      <div>
                        <p className={syne.className} style={{ fontWeight:700, fontSize:'1.05rem', margin:'0 0 5px', color:'rgba(255,255,255,0.92)' }}>
                          All questions answered! 🎉
                        </p>
                        <p className={dm.className} style={{ fontSize:'0.82rem', opacity:0.38, margin:0 }}>
                          View your full breakdown with AI feedback
                        </p>
                      </div>

                      <button
                        onClick={async () => { await endInterview(id); router.push(`/results/${id}`) }}
                        style={{
                          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                          background:'rgba(52,211,153,0.85)',
                          border:'none', borderRadius:10,
                          color:'#022c22', cursor:'pointer',
                          padding:'0.75rem 1.75rem',
                          fontSize:'0.875rem', fontWeight:700,
                          fontFamily:'var(--font-syne)',
                          width:'100%',
                          transition:'background 0.2s, transform 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background='rgba(52,211,153,1)'; e.currentTarget.style.transform='translateY(-1px)' }}
                        onMouseLeave={e => { e.currentTarget.style.background='rgba(52,211,153,0.85)'; e.currentTarget.style.transform='translateY(0)' }}
                      >
                        View Full Results → <ChevronRight size={15} />
                      </button>
                    </>
                  )}
                </>
              )}

              {/* ── FAILED ── */}
              {phase === 'failed' && (
                <>
                  <div style={{
                    width:80, height:80, borderRadius:'50%',
                    background:'rgba(239,68,68,0.1)',
                    border:'2px solid rgba(239,68,68,0.25)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0,
                  }}>
                    <AlertCircle size={32} style={{ color:'#f87171' }} />
                  </div>

                  <div>
                    <p className={syne.className} style={{ fontWeight:700, fontSize:'1.05rem', margin:'0 0 5px', color:'#fca5a5' }}>
                      Scoring failed
                    </p>
                    <p className={dm.className} style={{ fontSize:'0.82rem', opacity:0.45, margin:0 }}>
                      Something went wrong. Please try again.
                    </p>
                  </div>

                  <button
                    onClick={() => { setScoreResult(null); setSubmitError(null) }}
                    style={{
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                      background:'rgba(255,255,255,0.07)',
                      border:'1px solid rgba(255,255,255,0.12)',
                      borderRadius:10, color:'rgba(255,255,255,0.75)', cursor:'pointer',
                      padding:'0.7rem 1.5rem',
                      fontSize:'0.875rem', fontFamily:'var(--font-syne)', fontWeight:600,
                      width:'100%',
                    }}
                  >
                    Try Again
                  </button>
                </>
              )}

              {/* Inline errors */}
              {submitError && phase !== 'failed' && (
                <p className={dm.className} style={{ color:'#fca5a5', fontSize:'0.8rem', margin:0, textAlign:'center' }}>
                  {submitError}
                </p>
              )}
              {recorderError && (
                <p className={mono.className} style={{ color:'#f87171', fontSize:'0.7rem', margin:0, textAlign:'center', opacity:0.8 }}>
                  {recorderError}
                </p>
              )}
            </div>

            {/* ── Session ID strip ── */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'0.55rem 1rem',
              background:'rgba(255,255,255,0.025)',
              border:'1px solid rgba(255,255,255,0.05)',
              borderRadius:10, flexShrink:0,
            }}>
              <span className={mono.className} style={{ fontSize:'0.62rem', opacity:0.22, letterSpacing:'0.07em' }}>SESSION</span>
              <span className={mono.className} style={{ fontSize:'0.62rem', opacity:0.22, letterSpacing:'0.07em' }}>{shortId(session?.id)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── keyframes ───────────────────────────────────────────────── */}
      <style>{`
        @keyframes ping  { 75%,100% { transform:scale(1.6); opacity:0; } }
        @keyframes pulse { 0%,100%  { opacity:1; } 50% { opacity:0.25; } }
        @keyframes bounce{ 0%,80%,100% { transform:translateY(0); } 40% { transform:translateY(-7px); } }
        @keyframes wave  { from { transform:scaleY(0.4); } to { transform:scaleY(1); } }
      `}</style>
    </div>
  )
}