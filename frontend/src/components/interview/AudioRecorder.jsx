// src/components/interview/AudioRecorder.jsx
// UI component for the audio recording interface.
// Renders: live waveform, timer, status badge, start/stop/pause controls
'use client'

import { useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Pause, Play, Square } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format seconds → "MM:SS" */
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/** Map WebSocket status → badge color variant */
function wsStatusBadge(status) {
  const map = {
    connected:    { label: 'Live',         variant: 'default'      },
    connecting:   { label: 'Connecting…',  variant: 'secondary'    },
    disconnected: { label: 'Disconnected', variant: 'outline'      },
    error:        { label: 'Error',        variant: 'destructive'  },
  }
  return map[status] ?? { label: status, variant: 'outline' }
}


// ── Main component ────────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {boolean} props.isRecording
 * @param {boolean} props.isPaused
 * @param {number}  props.duration         - seconds elapsed
 * @param {string}  props.wsStatus         - WebSocket connection status
 * @param {MediaStream|null} props.stream  - Raw mic stream for waveform
 * @param {string}  props.error            - Current error message (or null)
 * @param {function} props.onStart
 * @param {function} props.onStop
 * @param {function} props.onTogglePause
 */
export function AudioRecorder({
  isRecording,
  isPaused,
  duration,
  wsStatus,
  stream,
  error,
  onStart,
  onStop,
  onTogglePause,
}) {
  const canvasRef = useRef(null)
  // We store the Web Audio API objects in refs so they don't cause re-renders
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const animationRef = useRef(null)  // requestAnimationFrame handle

  // ── Waveform setup ──────────────────────────────────────────────────────────

  const startWaveform = useCallback((mediaStream) => {
    const canvas = canvasRef.current
    if (!canvas || !mediaStream) return

    // AudioContext = the browser's audio processing graph
    // We reuse it if it already exists (to avoid "AudioContext was prevented
    // from starting" warnings after user interaction)
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = audioCtxRef.current

    // AnalyserNode reads frequency/waveform data from the audio pipeline
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 128  // Number of frequency bins. Lower = fewer bars = faster.
                             // Must be a power of 2. Try 64, 128, or 256.
    analyserRef.current = analyser

    // Connect: MediaStream → source node → analyser node
    // We do NOT connect to ctx.destination (speakers) — that would cause feedback!
    const source = ctx.createMediaStreamSource(mediaStream)
    source.connect(analyser)
    sourceRef.current = source

    // Frequency data buffer — updated every animation frame
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const canvasCtx = canvas.getContext('2d')

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      const W = canvas.width
      const H = canvas.height
      canvasCtx.clearRect(0, 0, W, H)

      // Draw background
      canvasCtx.fillStyle = 'rgb(15, 23, 42)'  // slate-900
      canvasCtx.fillRect(0, 0, W, H)

      const barCount = dataArray.length
      const barWidth = (W / barCount) * 1.8
      let x = 0

      for (let i = 0; i < barCount; i++) {
        // dataArray[i] is 0–255; scale to canvas height
        const barHeight = (dataArray[i] / 255) * H * 0.85

        // Gradient from cyan (high) to blue (low)
        const intensity = dataArray[i] / 255
        const r = Math.round(6 + intensity * 50)
        const g = Math.round(182 + intensity * 40)
        const b = Math.round(212)
        canvasCtx.fillStyle = `rgb(${r},${g},${b})`

        // Draw bar centered vertically
        canvasCtx.fillRect(x, H - barHeight, barWidth, barHeight)
        x += barWidth + 2
      }
    }

    draw()
  }, [])

  const stopWaveform = useCallback(() => {
    // Cancel the animation loop
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    // Disconnect audio nodes to free resources
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    // Draw a flat idle state on the canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = 'rgb(15, 23, 42)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // Draw a faint center line
      ctx.fillStyle = 'rgba(100, 116, 139, 0.3)'  // slate-500 faint
      ctx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2)
    }
  }, [])

  // ── React to recording state and stream changes ───────────────────────────

  useEffect(() => {
    if (isRecording && !isPaused && stream) {
      startWaveform(stream)
    } else {
      stopWaveform()
    }
    // Cleanup when component unmounts
    return () => stopWaveform()
  }, [isRecording, isPaused, stream, startWaveform, stopWaveform])

  // ── Render ────────────────────────────────────────────────────────────────

  const { label: wsLabel, variant: wsVariant } = wsStatusBadge(wsStatus)

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* Status bar */}
      <div className="flex items-center justify-between">
        <Badge variant={wsVariant}>{wsLabel}</Badge>
        <span className="text-2xl font-mono font-bold text-slate-200 tabular-nums">
          {formatDuration(duration)}
        </span>
        {isRecording && !isPaused && (
          <span className="flex items-center gap-1.5 text-red-400 text-sm font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            REC
          </span>
        )}
        {isPaused && (
          <span className="text-yellow-400 text-sm font-medium">PAUSED</span>
        )}
        {!isRecording && (
          <span className="text-slate-500 text-sm">Ready</span>
        )}
      </div>

      {/* Waveform canvas */}
      <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
        <canvas
          ref={canvasRef}
          width={600}
          height={120}
          className="w-full h-28"
          aria-label="Audio waveform visualizer"
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-300">
          <MicOff className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 justify-center">
        {!isRecording ? (
          <Button
            onClick={onStart}
            size="lg"
            className="gap-2 bg-red-600 hover:bg-red-700 text-white px-8"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </Button>
        ) : (
          <>
            <Button
              onClick={onTogglePause}
              variant="outline"
              size="lg"
              className="gap-2 border-slate-600"
            >
              {isPaused ? (
                <><Play className="w-4 h-4" /> Resume</>
              ) : (
                <><Pause className="w-4 h-4" /> Pause</>
              )}
            </Button>

            <Button
              onClick={onStop}
              variant="destructive"
              size="lg"
              className="gap-2"
            >
              <Square className="w-4 h-4" />
              Stop
            </Button>
          </>
        )}
      </div>

      {/* Browser support warning */}
      {typeof window !== 'undefined' && !window.MediaRecorder && (
        <p className="text-center text-amber-400 text-sm">
          ⚠️ Your browser does not support audio recording.
          Please use Chrome, Firefox, or Edge.
        </p>
      )}
    </div>
  )
}