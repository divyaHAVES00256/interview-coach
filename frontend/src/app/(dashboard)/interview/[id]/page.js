// src/app/(dashboard)/interview/[id]/page.js
// The main interview session page

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AudioRecorder } from '@/components/interview/AudioRecorder'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { getInterview, endInterview } from '@/services/interviews'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, LogOut } from 'lucide-react'

export default function InterviewPage() {
  const { id } = useParams()           // The session ID from the URL
  const router = useRouter()

  // ── Session data ──────────────────────────────────────────────────────────
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionError, setSessionError] = useState(null)

  // ── Transcripts ───────────────────────────────────────────────────────────
  const [transcripts, setTranscripts] = useState([])

  // ── Recording state ───────────────────────────────────────────────────────
  const [recorderError, setRecorderError] = useState(null)
  const [wsStatus, setWsStatus] = useState('disconnected')

  // ── Ending the session ────────────────────────────────────────────────────
  const [isEnding, setIsEnding] = useState(false)

  // ── Load session details on mount ─────────────────────────────────────────
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

  // ── Transcript handler ────────────────────────────────────────────────────
  const handleTranscript = useCallback(({ text, chunkIndex }) => {
    if (!text || text === '[silence]') return
    setTranscripts(prev => [
      ...prev,
      { text, chunkIndex, timestamp: new Date() },
    ])
  }, [])

  // ── useAudioRecorder hook ─────────────────────────────────────────────────
  const {
    isRecording,
    isPaused,
    duration,
    stream,
    startRecording,
    stopRecording,
    togglePause,
  } = useAudioRecorder({
    sessionId: id,
    onTranscript: handleTranscript,
    onError: setRecorderError,
    onStatusChange: setWsStatus,
  })

  // ── End interview ─────────────────────────────────────────────────────────
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

  // ── Render states ─────────────────────────────────────────────────────────

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (sessionError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-slate-300">
        <p className="text-red-400 font-medium">Failed to load session: {sessionError}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold capitalize">
              {session.domain} Interview
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="capitalize text-slate-400 border-slate-600">
                {session.difficulty}
              </Badge>
              {session.company_mode && (
                <Badge variant="secondary" className="capitalize">
                  {session.company_mode} style
                </Badge>
              )}
              <span className="text-xs text-slate-500">Session #{id}</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:text-white gap-2"
            onClick={handleEndInterview}
            disabled={isEnding}
          >
            {isEnding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            End Interview
          </Button>
        </div>

        {/* Audio Recorder */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Recording
          </h2>
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

        {/* Live Transcript Feed */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Live Transcript
          </h2>
          {transcripts.length === 0 ? (
            <p className="text-slate-500 text-sm italic">
              Your speech will appear here in 5-second chunks once you start recording…
            </p>
          ) : (
            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-2">
              {transcripts.map((t) => (
                <div key={t.chunkIndex} className="flex gap-3 items-start">
                  <span className="text-xs text-slate-500 tabular-nums pt-0.5 shrink-0">
                    {t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <p className="text-slate-200 text-sm leading-relaxed">{t.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}