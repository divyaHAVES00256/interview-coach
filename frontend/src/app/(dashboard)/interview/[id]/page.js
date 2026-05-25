// src/app/(dashboard)/interview/[id]/page.js
// The main interview session page

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AudioRecorder } from '@/components/interview/AudioRecorder'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { getInterview, endInterview } from '@/services/interviews'
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Zap, Mic, ScrollText, LogOut, ArrowLeft } from 'lucide-react'

import './interview.css'

// ── Fonts ────────────────────────────────────────────────────
const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-syne',
})
const dm = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm',
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

// Deterministic waveform bars for empty transcript state
const EMPTY_WAVE_BARS = [1, 2, 3, 4, 5, 6, 7]

// Truncate session ID for display
function shortId(id) {
  if (!id) return '—'
  const s = String(id)
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s
}

export default function InterviewPage() {
  const { id }  = useParams()
  const router  = useRouter()

  // ── Session data (unchanged) ──────────────────────────────
  const [session,        setSession]        = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionError,   setSessionError]   = useState(null)

  // ── Transcripts (unchanged) ───────────────────────────────
  const [transcripts, setTranscripts] = useState([])

  // ── Recording state (unchanged) ───────────────────────────
  const [recorderError, setRecorderError] = useState(null)
  const [wsStatus,      setWsStatus]      = useState('disconnected')

  // ── Ending (unchanged) ────────────────────────────────────
  const [isEnding, setIsEnding] = useState(false)

  // ── Load session on mount (unchanged) ─────────────────────
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

  // ── Transcript handler (unchanged) ────────────────────────
  const handleTranscript = useCallback(({ text, chunkIndex }) => {
    if (!text || text === '[silence]') return
    setTranscripts(prev => [
      ...prev,
      { text, chunkIndex, timestamp: new Date() },
    ])
  }, [])

  // ── useAudioRecorder (unchanged) ──────────────────────────
  const {
    isRecording,
    isPaused,
    duration,
    stream,
    startRecording,
    stopRecording,
    togglePause,
  } = useAudioRecorder({
    sessionId:      id,
    onTranscript:   handleTranscript,
    onError:        setRecorderError,
    onStatusChange: setWsStatus,
  })

  // ── End interview (unchanged) ─────────────────────────────
  const handleEndInterview = async () => {
    if (isEnding) return
    setIsEnding(true)

    if (isRecording) {
      stopRecording()
    }

    try {
      await endInterview(id)
      router.push(`/results/${id}`)
    } catch (err) {
      setRecorderError(err.message)
      setIsEnding(false)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — Loading
  // ═══════════════════════════════════════════════════════════
  if (sessionLoading) {
    return (
      <div className={`iview-loading ${syne.variable} ${dm.variable} ${mono.variable}`}>
        <div className="iview-loading-spinner" aria-hidden="true" />
        <p className="iview-loading-text">Loading session…</p>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — Error
  // ═══════════════════════════════════════════════════════════
  if (sessionError) {
    return (
      <div className={`iview-error-screen ${syne.variable} ${dm.variable} ${mono.variable}`}>
        <div className="iview-error-badge">
          <span className="iview-error-dot" aria-hidden="true" />
          Session error
        </div>
        <p className="iview-error-msg">
          Failed to load session: {sessionError}
        </p>
        <button
          className="iview-back-btn"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
          Back to Dashboard
        </button>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — Main
  // ═══════════════════════════════════════════════════════════
  return (
    <div className={`iview-root ${syne.variable} ${dm.variable} ${mono.variable}`}>

      {/* ── Ambient layer ──────────────────────────────────── */}
      <div className="iview-noise"            aria-hidden="true" />
      <div className="iview-scan"             aria-hidden="true" />
      <div className="iview-orb iview-orb-1"  aria-hidden="true" />
      <div className="iview-orb iview-orb-2"  aria-hidden="true" />

      <div className="iview-layer">

        {/* ══════════════════════════════════════════════════
            TOP BAR
        ══════════════════════════════════════════════════ */}
        <header className="iview-topbar" role="banner">

          {/* Logo */}
          <Link href="/dashboard" className="iview-logo" aria-label="InterviewAI — back to dashboard">
            <div className="iview-logo-mark" aria-hidden="true">
              <Zap size={15} strokeWidth={2.5} />
            </div>
            <span className="iview-logo-name">InterviewCoach</span>
          </Link>

          {/* End Interview */}
          <button
            className="iview-end-btn"
            onClick={handleEndInterview}
            disabled={isEnding}
            aria-busy={isEnding}
            aria-label="End this interview session"
          >
            {isEnding ? (
              <>
                <span className="iview-loading-spinner"
                  style={{ width: 14, height: 14, borderWidth: 2 }}
                  aria-hidden="true"
                />
                Ending…
              </>
            ) : (
              <>
                <LogOut size={14} strokeWidth={2} aria-hidden="true" />
                End Interview
              </>
            )}
          </button>
        </header>

        {/* ══════════════════════════════════════════════════
            MAIN CONTENT
        ══════════════════════════════════════════════════ */}
        <main className="iview-main">

          {/* ── Session info bar ─────────────────────────── */}
          <div className="iview-info-bar iview-fi-1" role="status" aria-label="Session details">

            {/* Domain badge */}
            <span className="iview-badge iview-badge-domain">
              <span className="iview-badge-dot" aria-hidden="true" />
              {session.domain}
            </span>

            <span className="iview-info-sep" aria-hidden="true" />

            {/* Difficulty badge */}
            <span className={`iview-badge iview-badge-diff iview-badge-${session.difficulty}`}>
              {session.difficulty}
            </span>

            {/* Company mode — conditional */}
            {session.company_mode && (
              <>
                <span className="iview-info-sep" aria-hidden="true" />
                <span className="iview-badge iview-badge-company">
                  {session.company_mode} style
                </span>
              </>
            )}

            <span className="iview-info-sep" aria-hidden="true" />

            {/* Session ID */}
            <span className="iview-session-id" aria-label={`Session ID: ${id}`}>
              #{shortId(id)}
            </span>

            {/* Timer */}
            <div className="iview-timer" aria-label={`Elapsed time: ${duration ?? '00:00'}`}>
              <span
                className={`iview-timer-dot ${
                  isRecording && !isPaused
                    ? 'iview-timer-dot-recording'
                    : 'iview-timer-dot-idle'
                }`}
                aria-hidden="true"
              />
              {duration ?? '00:00'}
            </div>
          </div>

          {/* ── Audio Recorder card ───────────────────────── */}
          <div className="iview-card iview-fi-2">
            <div className="iview-card-head">
              <div className="iview-card-icon" aria-hidden="true">
                <Mic size={16} strokeWidth={1.8} />
              </div>
              <span className="iview-card-title">Recording</span>
            </div>
            <div className="iview-card-body">
              {/*
                AudioRecorder internals are NOT restyled.
                Props passed through exactly as in the original.
              */}
              <AudioRecorder
                isRecording={isRecording}
                isPaused={isPaused}
                duration={duration}
                wsStatus={wsStatus}
                stream={stream}
                error={recorderError}
                onStart={startRecording}
                onStop={stopRecording}
                onTogglePause={togglePause}
              />
            </div>
          </div>

          {/* ── Live Transcript card ──────────────────────── */}
          <div className="iview-card iview-fi-3">
            <div className="iview-card-head">
              <div className="iview-card-icon" aria-hidden="true">
                <ScrollText size={16} strokeWidth={1.8} />
              </div>
              <span className="iview-card-title">Live Transcript</span>
            </div>
            <div className="iview-card-body">

              {transcripts.length === 0 ? (
                /* ── Empty state ── */
                <div className="iview-empty" role="status" aria-live="polite">
                  <div className="iview-empty-wave" aria-hidden="true">
                    {EMPTY_WAVE_BARS.map((i) => (
                      <div key={i} className="iview-empty-wave-bar" />
                    ))}
                  </div>
                  <p className="iview-empty-title">Waiting for speech…</p>
                  <p className="iview-empty-desc">
                    Your words will appear here in 5-second chunks once
                    you start recording.
                  </p>
                </div>
              ) : (
                /* ── Transcript chunks ── */
                <div
                  className="iview-transcript-list"
                  role="log"
                  aria-live="polite"
                  aria-label="Live transcript"
                >
                  {transcripts.map((t) => (
                    <div key={t.chunkIndex} className="iview-chunk">
                      <span className="iview-chunk-time" aria-label="Timestamp">
                        {t.timestamp.toLocaleTimeString([], {
                          hour:   '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      <span className="iview-chunk-bar" aria-hidden="true" />
                      <p className="iview-chunk-text">{t.text}</p>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

        </main>
      </div>
    </div>
  )
}