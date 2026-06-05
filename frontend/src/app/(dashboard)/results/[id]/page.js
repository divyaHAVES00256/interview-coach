'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSessionResults } from '@/services/answers'
import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ArrowLeft,
  Loader2,
  MessageSquare,
  BookOpen,
} from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────

function hasAnyScore(data) {
  return Array.isArray(data?.results) && data.results.some(r => r.score !== null)
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function avg(results, field) {
  const scored = results.filter(r => r.score && r.score[field] != null)
  if (!scored.length) return null
  return scored.reduce((sum, r) => sum + r.score[field], 0) / scored.length
}

function fmt(val, decimals = 1) {
  return val != null ? Number(val).toFixed(decimals) : '—'
}

// ─── Score Ring (SVG animated arc) ────────────────────────────────────────────

function ScoreRing({ score }) {
  const arcRef = useRef(null)
  const numRef = useRef(null)
  const RADIUS = 56
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS

  useEffect(() => {
    if (score == null) return
    const arc = arcRef.current
    const numEl = numRef.current
    if (!arc || !numEl) return

    // Animate arc
    arc.style.strokeDasharray = CIRCUMFERENCE
    arc.style.strokeDashoffset = CIRCUMFERENCE
    const rafId = requestAnimationFrame(() => {
      arc.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)'
      arc.style.strokeDashoffset = CIRCUMFERENCE * (1 - score / 10)
    })

    // Count-up number
    const duration = 1200
    let start = null
    function step(ts) {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      numEl.textContent = (ease * score).toFixed(1)
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)

    return () => cancelAnimationFrame(rafId)
  }, [score, CIRCUMFERENCE])

  const ringColor =
    score >= 8 ? '#1D9E75' :
    score >= 6 ? '#534AB7' :
    '#BA7517'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 140 140" className="w-36 h-36" role="img" aria-label={`Overall score: ${fmt(score)} out of 10`}>
          {/* Track */}
          <circle cx="70" cy="70" r={RADIUS} fill="none" strokeWidth="10" stroke="rgba(128,128,128,0.15)" />
          {/* Arc */}
          <circle
            ref={arcRef}
            cx="70" cy="70" r={RADIUS}
            fill="none" strokeWidth="10"
            stroke={ringColor}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE}
            transform="rotate(-90 70 70)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span ref={numRef} className="text-4xl font-semibold text-white leading-none tabular-nums">
            {score != null ? '0.0' : '—'}
          </span>
          <span className="text-zinc-500 text-sm mt-0.5">/10</span>
        </div>
      </div>
      <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Overall score</p>
    </div>
  )
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────

function RadarChart({ techAccuracy, clarity, starAlignment, completeness }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (typeof window === 'undefined') return

    import('chart.js').then(({ Chart, RadarController, LineElement, PointElement, RadialLinearScale, Filler, Tooltip, Legend }) => {
      Chart.register(RadarController, LineElement, PointElement, RadialLinearScale, Filler, Tooltip, Legend)

      if (chartRef.current) {
        chartRef.current.destroy()
      }

      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const gridColor  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
      const tickColor  = isDark ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.4)'
      const labelColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)'

      chartRef.current = new Chart(canvasRef.current, {
        type: 'radar',
        data: {
          labels: ['Tech accuracy', 'Clarity', 'STAR align', 'Completeness'],
          datasets: [{
            label: 'Your scores',
            data: [
              techAccuracy  ?? 0,
              clarity       ?? 0,
              starAlignment ?? 0,
              completeness  ?? 0,
            ],
            fill: true,
            backgroundColor: 'rgba(83,74,183,0.18)',
            borderColor: '#534AB7',
            borderWidth: 2,
            pointBackgroundColor: '#534AB7',
            pointRadius: 3,
            pointHoverRadius: 5,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: 'easeOutCubic' },
          plugins: { legend: { display: false } },
          scales: {
            r: {
              min: 0, max: 10,
              ticks: {
                stepSize: 2,
                font: { size: 9 },
                color: tickColor,
                backdropColor: 'transparent',
              },
              grid:       { color: gridColor },
              angleLines: { color: gridColor },
              pointLabels: { font: { size: 10 }, color: labelColor },
            }
          }
        }
      })
    }).catch(() => {
      // Chart.js not available — silently skip
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [techAccuracy, clarity, starAlignment, completeness])

  return (
    <div className="relative w-full h-44">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Radar chart: Technical accuracy ${fmt(techAccuracy)}, Clarity ${fmt(clarity)}, STAR alignment ${fmt(starAlignment)}, Completeness ${fmt(completeness)}`}
      >
        Tech {fmt(techAccuracy)}, Clarity {fmt(clarity)}, STAR {fmt(starAlignment)}, Completeness {fmt(completeness)}
      </canvas>
    </div>
  )
}

// ─── Performance Bar ──────────────────────────────────────────────────────────

function PerfBar({ label, value, color, delay = 0 }) {
  const fillRef = useRef(null)

  useEffect(() => {
    if (value == null || !fillRef.current) return
    const id = setTimeout(() => {
      if (fillRef.current) {
        fillRef.current.style.width = `${(value / 10) * 100}%`
      }
    }, delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-xs text-zinc-500 text-right font-mono shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          ref={fillRef}
          style={{
            width: '0%',
            backgroundColor: color,
            transition: 'width 1.1s cubic-bezier(0.4,0,0.2,1)',
          }}
          className="h-full rounded-full"
        />
      </div>
      <span className="w-8 text-xs font-semibold text-white tabular-nums">{fmt(value)}</span>
    </div>
  )
}

// ─── Dimension Card ───────────────────────────────────────────────────────────

function DimensionCard({ label, value, color, delay = 0 }) {
  const fillRef = useRef(null)

  useEffect(() => {
    if (value == null || !fillRef.current) return
    const id = setTimeout(() => {
      if (fillRef.current) {
        fillRef.current.style.width = `${(value / 10) * 100}%`
      }
    }, delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-semibold text-white">{fmt(value)}</span>
        <span className="text-zinc-600 text-sm">/10</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          ref={fillRef}
          style={{
            width: '0%',
            backgroundColor: color,
            transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
          }}
          className="h-full rounded-full"
        />
      </div>
    </div>
  )
}

// ─── Ideal Answer Toggle ──────────────────────────────────────────────────────

function IdealAnswerToggle({ idealAnswer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-zinc-700/60 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-zinc-800/50 hover:bg-zinc-800/80 transition-colors"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-xs font-mono text-zinc-300 uppercase tracking-wider">
          <BookOpen size={12} aria-hidden="true" />
          Ideal answer
        </span>
        {open
          ? <ChevronUp size={13} className="text-zinc-400" />
          : <ChevronDown size={13} className="text-zinc-400" />
        }
      </button>
      {open && (
        <div className="px-3 py-3 bg-zinc-900/40">
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{idealAnswer}</p>
        </div>
      )}
    </div>
  )
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({ result }) {
  const [expanded, setExpanded] = useState(false)

  const isScored   = result.score !== null
  const isAnswered = result.answer !== null
  const score      = result.score ?? {}
  const strengths  = parseJsonArray(score.strengths_json)
  const improvements = parseJsonArray(score.improvements_json)
  const transcript = result.answer?.transcript ?? ''
  const snippetText = transcript.length > 220
    ? transcript.slice(0, 220) + '…'
    : transcript

  const scorePillEl = isScored ? (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-700/40">
      {Number(score.overall_score).toFixed(1)}/10
    </span>
  ) : isAnswered ? (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium bg-amber-600/20 text-amber-300 border border-amber-700/40">
      <Loader2 size={10} className="animate-spin" /> Scoring…
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-medium bg-zinc-700/40 text-zinc-500 border border-zinc-600/30">
      Skipped
    </span>
  )

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">

      {/* Header row */}
      <div
        className={`flex items-start gap-3 px-4 py-3 ${isScored ? 'cursor-pointer hover:bg-zinc-800/40 transition-colors' : ''}`}
        onClick={isScored ? () => setExpanded(e => !e) : undefined}
      >
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-medium bg-indigo-600/25 text-indigo-300 border border-indigo-700/50 uppercase tracking-wider">
              Q{result.order_index + 1}
            </span>
            {result.question_type && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-medium bg-zinc-700/50 text-zinc-300 border border-zinc-600/50 uppercase tracking-wider">
                {result.question_type}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-200 leading-snug line-clamp-2">{result.question_text}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {scorePillEl}
          {isScored && (
            <span className="text-zinc-500">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          )}
        </div>
      </div>

      {/* Expandable body */}
      {isScored && expanded && (
        <div className="border-t border-zinc-800 px-4 py-4 space-y-4">

          {/* Transcript snippet */}
          {snippetText && (
            <div>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-1.5">Your answer</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{snippetText}</p>
            </div>
          )}

          {/* Mini dimension chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Tech',     field: 'technical_accuracy' },
              { label: 'Clarity',  field: 'clarity' },
              { label: 'STAR',     field: 'star_alignment' },
              { label: 'Complete', field: 'completeness' },
            ].map(({ label, field }) => (
              <span
                key={field}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-mono bg-zinc-800/80 text-zinc-300 border border-zinc-700/60"
              >
                <span className="text-zinc-500">{label}:</span>
                <span className="font-semibold text-white">
                  {score[field] != null ? Number(score[field]).toFixed(1) : '—'}
                </span>
              </span>
            ))}
          </div>

          {/* Strengths */}
          {strengths.length > 0 && (
            <div>
              <p className="text-xs font-mono text-emerald-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 size={11} aria-hidden="true" /> Strengths
              </p>
              <ul className="space-y-1.5">
                {strengths.slice(0, 2).map((s, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-zinc-200 leading-relaxed">
                    <span className="text-emerald-500 mt-0.5 shrink-0" aria-hidden="true">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {improvements.length > 0 && (
            <div>
              <p className="text-xs font-mono text-amber-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <AlertTriangle size={11} aria-hidden="true" /> Areas to improve
              </p>
              <ul className="space-y-1.5">
                {improvements.slice(0, 2).map((imp, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-zinc-200 leading-relaxed">
                    <span className="text-amber-500 mt-0.5 shrink-0" aria-hidden="true">→</span>
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ideal answer */}
          {score.ideal_answer && (
            <IdealAnswerToggle idealAnswer={score.ideal_answer} />
          )}

          {/* Follow-up */}
          {score.follow_up_question && (
            <div className="rounded-lg bg-indigo-950/50 border border-indigo-800/40 px-3 py-2.5">
              <p className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <MessageSquare size={11} aria-hidden="true" /> Follow-up
              </p>
              <p className="text-sm text-zinc-200 leading-relaxed italic">
                "{score.follow_up_question}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Loading / Error states ───────────────────────────────────────────────────

function PageCenter({ children }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 px-4">
      {children}
    </div>
  )
}

// ─── QuestionTrendChart Component ───────────────────────────────────────────────────
function QuestionTrendChart({ results }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return

    import('chart.js').then(
      ({
        Chart,
        LineController,
        LineElement,
        PointElement,
        LinearScale,
        CategoryScale,
        Filler,
        Tooltip,
      }) => {
        Chart.register(
          LineController,
          LineElement,
          PointElement,
          LinearScale,
          CategoryScale,
          Filler,
          Tooltip
        )

        chartRef.current?.destroy()

        const ctx = canvasRef.current.getContext('2d')

        const gradient = ctx.createLinearGradient(0, 0, 0, 300)

        gradient.addColorStop(0, 'rgba(83,74,183,0.35)')
        gradient.addColorStop(1, 'rgba(83,74,183,0.02)')

        chartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: results.map((_, i) => `Q${i + 1}`),
            datasets: [
              {
                data: results.map(
                  r => r.score?.overall_score ?? 0
                ),
                borderColor: '#6D5DF6',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#6D5DF6',
                borderWidth: 3,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
              legend: {
                display: false,
              },
            },

            scales: {
              y: {
                min: 0,
                max: 10,

                grid: {
                  color: 'rgba(255,255,255,0.06)',
                },

                ticks: {
                  color: '#A1A1AA',
                },
              },

              x: {
                grid: {
                  display: false,
                },

                ticks: {
                  color: '#A1A1AA',
                },
              },
            },
          },
        })
      }
    )

    return () => chartRef.current?.destroy()
  }, [results])

  return (
    <div className="h-[280px]">
      <canvas ref={canvasRef} />
    </div>
  )
}


// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const { id }  = useParams()
  const router  = useRouter()

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let timer     = null
    let cancelled = false

    async function load() {
      try {
        const result = await getSessionResults(id)
        if (cancelled) return
        setData(result)
        setLoading(false)

        if (!hasAnyScore(result)) {
          timer = setTimeout(load, 5000)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load results.')
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [id])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageCenter>
        <Loader2 className="animate-spin text-indigo-400" size={36} />
      </PageCenter>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <PageCenter>
        <p className="text-red-400 text-center text-sm">{error}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={15} /> Back to dashboard
        </button>
      </PageCenter>
    )
  }

  // ── Still processing ─────────────────────────────────────────────────────────
  if (!hasAnyScore(data)) {
    return (
      <PageCenter>
        <Loader2 className="animate-spin text-indigo-400" size={28} />
        <p className="text-zinc-300 text-center text-sm">
          Results are still being processed. Please wait…
        </p>
        <p className="text-zinc-600 text-xs">Refreshing automatically every 5 seconds</p>
      </PageCenter>
    )
  }

  // ── Aggregate scores ─────────────────────────────────────────────────────────
  const overallScore  = avg(data.results, 'overall_score')
  const techAccuracy  = avg(data.results, 'technical_accuracy')
  const clarity       = avg(data.results, 'clarity')
  const starAlignment = avg(data.results, 'star_alignment')
  const completeness  = avg(data.results, 'completeness')

  const DIMS = [
    { label: 'Technical accuracy', value: techAccuracy,  color: '#534AB7', delay: 200 },
    { label: 'Clarity',            value: clarity,       color: '#1D9E75', delay: 300 },
    { label: 'STAR alignment',     value: starAlignment, color: '#BA7517', delay: 400 },
    { label: 'Completeness',       value: completeness,  color: '#378ADD', delay: 500 },
  ]

  // ── Full render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-10 space-y-8">

        {/* ── 1. Header ─────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-3">
            Interview results
          </h1>
          <div className="flex flex-wrap gap-2">
            {data.domain && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-600/25 text-indigo-300 border border-indigo-700/50 capitalize">
                {data.domain}
              </span>
            )}
            {data.difficulty && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-700/50 text-zinc-300 border border-zinc-600/50 capitalize">
                {data.difficulty}
              </span>
            )}
            {data.company_mode && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-600/20 text-amber-300 border border-amber-700/40 capitalize">
                {data.company_mode}
              </span>
            )}
          </div>
        </div>

        {/* ── 2. Score ring + radar ─────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Score ring card */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex items-center justify-center">
            <ScoreRing score={overallScore} />
          </div>

          {/* Radar card */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Performance Trend
                </h3>
                <p className="text-sm text-zinc-400">
                  Score progression throughout the interview
                </p>
              </div>

              <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                <span className="text-xs font-medium text-indigo-300">
                  Trend Analysis
                </span>
              </div>
            </div>

            <QuestionTrendChart results={data.results} />

            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="rounded-xl bg-zinc-800/50 p-3 border border-zinc-700/50">
                <p className="text-xs text-zinc-500">Best Score</p>
                <p className="text-xl font-semibold text-emerald-400">
                  {Math.max(
                    ...data.results.map(r => r.score?.overall_score || 0)
                  ).toFixed(1)}
                </p>
              </div>

              <div className="rounded-xl bg-zinc-800/50 p-3 border border-zinc-700/50">
                <p className="text-xs text-zinc-500">Average</p>
                <p className="text-xl font-semibold text-indigo-400">
                  {fmt(overallScore)}
                </p>
              </div>

              <div className="rounded-xl bg-zinc-800/50 p-3 border border-zinc-700/50">
                <p className="text-xs text-zinc-500">Questions</p>
                <p className="text-xl font-semibold text-blue-400">
                  {data.results.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Dimension cards 2×2 ────────────────────────────── */}
        <div>
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">
            Score breakdown
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {DIMS.map(d => (
              <DimensionCard
                key={d.label}
                label={d.label}
                value={d.value}
                color={d.color}
                delay={d.delay}
              />
            ))}
          </div>
        </div>

        {/* ── 5. Per-question breakdown ─────────────────────────── */}
        <div>
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">
            Question breakdown
          </h2>
          <div className="space-y-3">
            {data.results.map((result, i) => (
              <QuestionCard key={result.question_id ?? i} result={result} />
            ))}
          </div>
        </div>

        {/* ── 6. Practice again CTA ─────────────────────────────── */}
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
        >
          <RotateCcw size={15} aria-hidden="true" />
          Practice again
        </button>

      </div>
    </div>
  )
}