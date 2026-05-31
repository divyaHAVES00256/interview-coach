// src/app/(dashboard)/results/[id]/page.js
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSessionResults } from '@/services/answers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ArrowLeft,
  Loader2,
  MessageSquare,
} from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Returns true when at least one result entry has a non-null score. */
function hasAnyScore(data) {
  return Array.isArray(data?.results) && data.results.some(r => r.score !== null)
}

/**
 * Safely parse a JSON value that may already be an array
 * (the API declares string[] but some backends double-encode).
 */
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

/** Compute the average of a numeric field across all scored results. */
function avg(results, field) {
  const scored = results.filter(r => r.score && r.score[field] != null)
  if (!scored.length) return null
  return scored.reduce((sum, r) => sum + r.score[field], 0) / scored.length
}

// ─── sub-components ───────────────────────────────────────────────────────────

function DimensionCard({ label, value }) {
  const display = value != null ? Number(value).toFixed(1) : '—'
  const pct = value != null ? Math.round(value * 10) : 0

  return (
    <Card className="bg-zinc-900/60 border-zinc-800">
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2 font-mono">{label}</p>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-3xl font-bold text-white leading-none">{display}</span>
          <span className="text-zinc-500 text-sm mb-0.5">/10</span>
        </div>
        <Progress
          value={pct}
          className="h-1.5 bg-zinc-800 [&>div]:bg-indigo-500"
        />
      </CardContent>
    </Card>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const { id } = useParams()
  const router = useRouter()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [idealOpen, setIdealOpen] = useState(false)

  // ── fetch + optional auto-refresh ──────────────────────────────────────────
  useEffect(() => {
    let timer = null
    let cancelled = false

    async function load() {
      try {
        const result = await getSessionResults(id)
        if (cancelled) return
        setData(result)
        setLoading(false)

        // If no scores yet, schedule a re-fetch in 5 s
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

  // ── loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-400" size={36} />
      </div>
    )
  }

  // ── error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-400 text-center">{error}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={15} /> Back to Dashboard
        </button>
      </div>
    )
  }

  // ── processing — no scores yet ───────────────────────────────────────────────
  if (!hasAnyScore(data)) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3 px-4">
        <Loader2 className="animate-spin text-indigo-400" size={28} />
        <p className="text-zinc-300 text-center text-sm">
          Results are still being processed. Please wait…
        </p>
        <p className="text-zinc-600 text-xs">Refreshing automatically every 5 seconds</p>
      </div>
    )
  }

  // ── derive aggregated values from the first scored result ───────────────────
  // (Phase 5 shows only questions[0], so we work from the first scored entry)
  const firstScored = data.results.find(r => r.score !== null)
  const score = firstScored?.score ?? {}

  const overallScore    = score.overall_score    ?? avg(data.results, 'overall_score')
  const techAccuracy    = score.technical_accuracy ?? avg(data.results, 'technical_accuracy')
  const clarity         = score.clarity            ?? avg(data.results, 'clarity')
  const starAlignment   = score.star_alignment     ?? avg(data.results, 'star_alignment')
  const completeness    = score.completeness       ?? avg(data.results, 'completeness')

  const strengths    = parseJsonArray(score.strengths_json)
  const improvements = parseJsonArray(score.improvements_json)
  const idealAnswer  = score.ideal_answer       ?? ''
  const followUp     = score.follow_up_question ?? ''

  // ── full results render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-10 space-y-8">

        {/* ── 1. Header ─────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-3">
            Interview Results
          </h1>
          <div className="flex flex-wrap gap-2">
            {data.domain && (
              <Badge className="bg-indigo-600/25 text-indigo-300 border-indigo-700/50 capitalize">
                {data.domain}
              </Badge>
            )}
            {data.difficulty && (
              <Badge className="bg-zinc-700/50 text-zinc-300 border-zinc-600/50 capitalize">
                {data.difficulty}
              </Badge>
            )}
            {data.company_mode && (
              <Badge className="bg-amber-600/20 text-amber-300 border-amber-700/40 capitalize">
                {data.company_mode}
              </Badge>
            )}
          </div>
        </div>

        {/* ── 2. Overall score ──────────────────────────────────── */}
        <Card className="bg-gradient-to-br from-indigo-950/70 to-zinc-900/70 border-indigo-800/40">
          <CardContent className="pt-8 pb-7 flex flex-col items-center gap-1">
            <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-1">
              Overall Score
            </p>
            <div className="flex items-end gap-2">
              <span className="text-7xl font-extrabold leading-none text-white">
                {overallScore != null ? Number(overallScore).toFixed(1) : '—'}
              </span>
              <span className="text-2xl text-zinc-500 mb-2">/10</span>
            </div>
            <Progress
              value={overallScore != null ? Math.round(overallScore * 10) : 0}
              className="w-48 h-2 mt-3 bg-indigo-900/50 [&>div]:bg-indigo-400"
            />
          </CardContent>
        </Card>

        {/* ── 3. Dimension cards 2×2 grid ───────────────────────── */}
        <div>
          <h2 className="text-sm font-mono text-zinc-400 uppercase tracking-widest mb-3">
            Score Breakdown
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <DimensionCard label="Technical Accuracy" value={techAccuracy} />
            <DimensionCard label="Clarity"            value={clarity} />
            <DimensionCard label="STAR Alignment"     value={starAlignment} />
            <DimensionCard label="Completeness"       value={completeness} />
          </div>
        </div>

        {/* ── 4. Strengths ──────────────────────────────────────── */}
        {strengths.length > 0 && (
          <Card className="bg-emerald-950/40 border-emerald-800/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-mono text-emerald-400 uppercase tracking-widest">
                <CheckCircle2 size={14} />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-200 leading-relaxed">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* ── 5. Improvements ───────────────────────────────────── */}
        {improvements.length > 0 && (
          <Card className="bg-amber-950/30 border-amber-800/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-mono text-amber-400 uppercase tracking-widest">
                <AlertTriangle size={14} />
                Areas to Improve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {improvements.map((imp, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-200 leading-relaxed">
                    <span className="text-amber-500 mt-0.5 shrink-0">→</span>
                    {imp}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* ── 6. Ideal Answer (collapsible) ─────────────────────── */}
        {idealAnswer && (
          <Card className="bg-zinc-900/60 border-zinc-800">
            <button
              className="w-full text-left"
              onClick={() => setIdealOpen(o => !o)}
              aria-expanded={idealOpen}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-mono text-zinc-300 uppercase tracking-widest">
                  <span>Ideal Answer</span>
                  {idealOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </CardTitle>
              </CardHeader>
            </button>
            {idealOpen && (
              <CardContent>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {idealAnswer}
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* ── 7. Follow-up question ─────────────────────────────── */}
        {followUp && (
          <Card className="bg-zinc-900/60 border-indigo-800/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-mono text-indigo-400 uppercase tracking-widest">
                <MessageSquare size={14} />
                Follow-up Question
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-200 leading-relaxed italic">
                "{followUp}"
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── 8. Practice Again ─────────────────────────────────── */}
        <div className="pt-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg py-3 text-sm font-semibold transition-colors"
          >
            <RotateCcw size={15} />
            Practice Again
          </button>
        </div>

      </div>
    </div>
  )
}