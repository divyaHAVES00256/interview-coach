// src/hooks/useAudioRecorder.js
// The AudioRecorder component consumes this hook and handles the UI.

import { useState, useRef, useCallback, useEffect } from 'react'
import { getWsToken } from '@/services/interviews'

// chunking audio
const CHUNK_INTERVAL_MS = 5000  // 5 seconds

// WebSocket server base URL — direct to FastAPI
const WS_BASE = 'ws://localhost:8000'

/**
 * @param {object} options
 * @param {number|string} options.sessionId  
 * @param {function} options.onTranscript    
 * @param {function} options.onError         
 * @param {function} options.onStatusChange  
 */
export function useAudioRecorder({
  sessionId,
  onTranscript,
  onError,
  onStatusChange,
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)         
  const [wsStatus, setWsStatus] = useState('disconnected')  // 'disconnected' | 'connecting' | 'connected' | 'error'

  // Refs for mutable objects 
  const mediaRecorderRef = useRef(null)
  const wsRef = useRef(null)
  const streamRef = useRef(null)     
  const timerIntervalRef = useRef(null)

  // ── Internal helpers ──────────────────────────────────────────────────────

  const _updateWsStatus = useCallback((status) => {
    setWsStatus(status)
    onStatusChange?.(status)
  }, [onStatusChange])

  const _stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }, [])

  const _startTimer = useCallback(() => {
    _stopTimer()
    timerIntervalRef.current = setInterval(() => {
      setDuration(d => d + 1)
    }, 1000)
  }, [_stopTimer])

  // ── Connect WebSocket ─────────────────────────────────────────────────────

  const _connectWebSocket = useCallback(async () => {
    // Get JWT token from BFF (reads httpOnly cookie server-side)
    let token
    try {
      token = await getWsToken()
    } catch {
      onError?.('Authentication failed — please log in again')
      return null
    }

    const wsUrl = `${WS_BASE}/ws/interview/${sessionId}?token=${token}`
    _updateWsStatus('connecting')

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl)

      ws.binaryType = 'arraybuffer'
    
      // connection established
      ws.onopen = () => {
        console.log('WebSocket connected')
        _updateWsStatus('connecting')  
        resolve(ws)
      }

      //server sends message
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          if (msg.type === 'status') {
            if (msg.status === 'connected') {
              _updateWsStatus('connected')
            }
            // 'processing' status: the server is working on a chunk
            console.log('WS status:', msg.status, msg.message)
          }

          else if (msg.type === 'transcript') {
            onTranscript?.({ text: msg.text, chunkIndex: msg.chunk_index })
          }

          else if (msg.type === 'error') {
            console.error('WS server error:', msg.code, msg.message)
            onError?.(`Server error: ${msg.message}`)
          }

          else if (msg.type === 'pong') {
            // Keepalive response — no action needed
          }

        } catch {
          console.warn('Received non-JSON WS message:', event.data)
        }
      }

    //   connection/network problem occurs
      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        _updateWsStatus('error')
        onError?.('WebSocket connection error. Is the backend running?')
        reject(new Error('WebSocket error'))
      }

      // connection closes
      ws.onclose = (event) => {
        _updateWsStatus('disconnected')
        if (event.code === 4001) {
          onError?.('Session unauthorized — invalid token')
        } else if (event.code === 4004) {
          onError?.('Session not found on server')
        }
        console.log(`WebSocket closed: code=${event.code} reason=${event.reason}`)
      }
    })
  }, [sessionId, onTranscript, onError, _updateWsStatus])

  // ── Start recording ───────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (isRecording) return

    // 1. Connect WebSocket first (so it's ready before audio starts)
    let ws
    try {
      ws = await _connectWebSocket()
      if (!ws) return  
    } catch {
      return  
    }

    // 2. Request microphone access
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // these constraints improve speech recognition quality
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,  // 16kHz is ideal for Whisper
        },
        video: false,
      })
    } catch (err) {
      ws.close()
      if (err.name === 'NotAllowedError') {
        onError?.('Microphone permission denied. Please allow mic access and try again.')
      } else if (err.name === 'NotFoundError') {
        onError?.('No microphone found. Please connect a microphone.')
      } else {
        onError?.(`Microphone error: ${err.message}`)
      }
      return
    }

    // 3. Store refs
    streamRef.current = stream
    wsRef.current = ws

    // 4. Create MediaRecorder : audio/webm;codecs=opus 
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    const recorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = recorder

    // 5. Handle data chunks
    recorder.ondataavailable = (event) => {
      // event.data is a Blob of audio f
      if (event.data && event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
        // send binary audio data over WebSocket
        wsRef.current.send(event.data)
        console.log(`Sent audio chunk: ${(event.data.size / 1024).toFixed(1)} KB`)
      }
    }

    recorder.onerror = (event) => {
      console.error('MediaRecorder error:', event.error)
      onError?.(`Recording error: ${event.error?.message}`)
    }

    recorder.onstop = () => {
      // stop all microphone tracks when recorder stops
      stream.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // 6. Start recording 
    // timeslice=CHUNK_INTERVAL_MS makes ondataavailable
    // fire every 5 seconds automatically (instead of only when stopped)
    recorder.start(CHUNK_INTERVAL_MS)
    setIsRecording(true)
    setIsPaused(false)
    setDuration(0)
    _startTimer()

  }, [isRecording, _connectWebSocket, onError, _startTimer])

  // ── Stop recording ────────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    _stopTimer()

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()  // triggers ondataavailable one final time
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Recording stopped by user')
      wsRef.current = null
    }

    setIsRecording(false)
    setIsPaused(false)
  }, [_stopTimer])

  // ── Pause / Resume ────────────────────────────────────────────────────────

  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return

    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      _stopTimer()
      setIsPaused(true)
    } else if (mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      _startTimer()
      setIsPaused(false)
    }
  }, [_startTimer, _stopTimer])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  // Essential: if the user navigates away mid-recording, stop everything

  useEffect(() => {
    return () => {
      _stopTimer()
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop()
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted')
      }
    }
  }, [_stopTimer])

  return {
    // State
    isRecording,
    isPaused,
    duration,
    wsStatus,
    // The raw MediaStream — AudioRecorder uses this for the waveform visualizer
    stream: streamRef.current,
    // Controls
    startRecording,
    stopRecording,
    togglePause,
  }
}