// npm install react-chartjs-2 chart.js
// frontend/src/app/(dashboard)/analytics/page.js

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Bar, Radar } from 'react-chartjs-2'
import {
  Zap,
  BarChart2,
  LogOut,
  ArrowLeft,
  TrendingUp,
  Activity,
} from 'lucide-react'

import { getAnalytics } from '@/services/analytics'
import { getMe, logout } from '@/lib/auth'
import './analytics.css'

// ── Register Chart.js components ─────────────────────────────────────────────
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
)

// ── Fonts ─────────────────────────────────────────────────────────────────────
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

// ── Design tokens (hex/rgba mirrors of CSS vars — needed inline for Chart.js) ─
const T = {
  accent:     '#00d4aa',
  green:      '#00ff87',
  orange:     '#ff7b45',
  muted:      '#365f58',
  mutedLight: '#4a7a72',
  text:       '#d6eeea',
  grid:       'rgba(255,255,255,0.05)',
  fill:       'rgba(0,212,170,0.08)',
  radarFill:  'rgba(0,212,170,0.12)',
  radarBorder:'rgba(0,212,170,0.7)',
  barDomain:  'rgba(0,212,170,0.7)',
  barScore:   'rgba(0,255,135,0.5)',
  lineOverlay:'rgba(255,255,255,0.5)',
}

// ── Shared chart defaults ─────────────────────────────────────────────────────
const baseTooltip = {
  backgroundColor: 'rgba(6,19,26,0.95)',
  borderColor: 'rgba(0,212,170,0.25)',
  borderWidth: 1,
  titleColor: '#d6eeea',
  bodyColor: '#4a7a72',
  titleFont: { family: "'Syne', sans-serif", size: 12, weight: '700' },
  bodyFont:  { family: "'JetBrains Mono', monospace", size: 11 },
  padding: 10,
  cornerRadius: 8,
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '??'
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('')
}

// ── Reusable ChartCard component ─────────────────────────────────────────────
function ChartCard({ title, children, noMargin }) {
  return (
    <div className={`an-chart-card${noMargin ? ' an-no-mb' : ''}`}>
      <p className="an-chart-title">{title}</p>
      {children}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
export default function AnalyticsPage() {
  const router = useRouter()

  const [user,         setUser]         = useState(null)
  const [analytics,    setAnalytics]    = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // ── Fetch user + analytics on mount ──────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        const [me, data] = await Promise.all([getMe(), getAnalytics()])
        setUser(me)
        setAnalytics(data)
      } catch (err) {
        if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
          router.push('/login')
          return
        }
        setError(err.message ?? 'Failed to load analytics.')
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [router])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.push('/login')
    } catch {
      setIsLoggingOut(false)
    }
  }

  const displayName = user?.name ?? 'Guest'
  const initials    = user?.name ? getInitials(user.name) : '??'

  // ── Derived flags ─────────────────────────────────────────────────────────
  const hasTrend      = analytics?.score_trend?.length >= 2
  const hasDimensions = analytics?.dimensions &&
    Object.values(analytics.dimensions).some((v) => v !== null)
  const hasDomain     = analytics?.by_domain?.length > 0
  const hasDifficulty = analytics?.by_difficulty?.some((d) => d.session_count > 0)
  const hasNoData     = analytics?.total_sessions === 0

  // ── Root class string ─────────────────────────────────────────────────────
  const rootCls = `an-root ${syne.variable} ${dm.variable} ${mono.variable}`

  // ══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ══════════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className={rootCls}>
        <div className="an-noise"  aria-hidden="true" />
        <div className="an-scan"   aria-hidden="true" />
        <div className="an-orb an-orb-1" aria-hidden="true" />
        <div className="an-orb an-orb-2" aria-hidden="true" />
        <div className="an-layer">
          <div className="an-center-state" role="status" aria-live="polite" aria-label="Loading analytics">
            <div className="an-spinner an-spinner-lg" aria-hidden="true" />
            <p>Loading your analytics…</p>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ══════════════════════════════════════════════════════════════════════════
  if (error) {
    return (
      <div className={rootCls}>
        <div className="an-noise"  aria-hidden="true" />
        <div className="an-scan"   aria-hidden="true" />
        <div className="an-orb an-orb-1" aria-hidden="true" />
        <div className="an-orb an-orb-2" aria-hidden="true" />
        <div className="an-layer">
          <div className="an-center-state" role="alert">
            <div className="an-empty-icon" aria-hidden="true">
              <Activity size={22} strokeWidth={1.8} />
            </div>
            <p className="an-empty-title">Something went wrong</p>
            <p>{error}</p>
            <Link href="/dashboard" className="an-goto-btn">← Dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NO DATA STATE
  // ══════════════════════════════════════════════════════════════════════════
  if (hasNoData) {
    return (
      <div className={rootCls}>
        <div className="an-noise"  aria-hidden="true" />
        <div className="an-scan"   aria-hidden="true" />
        <div className="an-orb an-orb-1" aria-hidden="true" />
        <div className="an-orb an-orb-2" aria-hidden="true" />
        <div className="an-layer">

          {/* Navbar */}
          <NavBar
            displayName={displayName}
            initials={initials}
            isLoggingOut={isLoggingOut}
            onLogout={handleLogout}
          />

          <div className="an-center-state" role="status">
            <div className="an-empty-icon" aria-hidden="true">
              <BarChart2 size={22} strokeWidth={1.8} />
            </div>
            <p className="an-empty-title">No sessions yet</p>
            <p>Complete your first interview to see analytics.</p>
            <Link href="/dashboard" className="an-goto-btn">Go to Dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DATA LAYOUT
  // ══════════════════════════════════════════════════════════════════════════

  // ── Section 2: Score Trend ────────────────────────────────────────────────
  const trendLabels   = analytics.score_trend.map((p) => p.date)
  const trendValues   = analytics.score_trend.map((p) => p.overall_score)
  const trendData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Overall Score',
        data: trendValues,
        borderColor: T.accent,
        backgroundColor: T.fill,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: T.accent,
        pointBorderColor: T.accent,
        borderWidth: 2,
      },
    ],
  }
  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { ...baseTooltip },
    },
    scales: {
      x: {
        grid:  { color: T.grid },
        ticks: { color: T.mutedLight, font: { family: "'JetBrains Mono', monospace", size: 10 }, maxTicksLimit: 8 },
        border: { color: 'transparent' },
      },
      y: {
        min: 0,
        max: 10,
        ticks: {
          stepSize: 1,
          color: T.mutedLight,
          font: { family: "'JetBrains Mono', monospace", size: 10 },
        },
        grid:   { color: T.grid },
        border: { color: 'transparent' },
      },
    },
  }

  // ── Section 3 LEFT: Radar ─────────────────────────────────────────────────
  const dims = analytics.dimensions
  const radarData = {
    labels: ['Technical', 'Clarity', 'STAR', 'Completeness'],
    datasets: [
      {
        label: 'Your Score',
        data: [
          dims.technical_accuracy ?? 0,
          dims.clarity             ?? 0,
          dims.star_alignment      ?? 0,
          dims.completeness        ?? 0,
        ],
        borderColor:     T.radarBorder,
        backgroundColor: T.radarFill,
        pointBackgroundColor: T.accent,
        pointBorderColor: T.accent,
        borderWidth: 2,
        pointRadius: 4,
      },
    ],
  }
  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { ...baseTooltip },
    },
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: { color: 'transparent', stepSize: 2, backdropColor: 'transparent' },
        pointLabels: {
          color: T.mutedLight,
          font: { family: "'Syne', sans-serif", size: 11, weight: '600' },
        },
        grid:         { color: 'rgba(255,255,255,0.07)' },
        angleLines:   { color: 'rgba(255,255,255,0.07)' },
      },
    },
  }

  // ── Section 3 RIGHT: Domain Bar ───────────────────────────────────────────
  const domainLabels   = analytics.by_domain.map((d) => d.domain.replace(/_/g, ' '))
  const domainCounts   = analytics.by_domain.map((d) => d.session_count)
  const domainScores   = analytics.by_domain.map((d) => d.avg_score ?? null)
  const domainData = {
    labels: domainLabels,
    datasets: [
      {
        type: 'bar',
        label: 'Sessions',
        data: domainCounts,
        backgroundColor: T.barDomain,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Avg Score',
        data: domainScores,
        borderColor: T.barScore,
        backgroundColor: 'transparent',
        pointBackgroundColor: T.green,
        pointRadius: 4,
        borderWidth: 2,
        tension: 0.3,
        yAxisID: 'y1',
        spanGaps: true,
      },
    ],
  }
  const domainOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: T.mutedLight,
          font: { family: "'JetBrains Mono', monospace", size: 10 },
          boxWidth: 10,
          padding: 14,
        },
      },
      tooltip: { ...baseTooltip },
    },
    scales: {
      x: {
        grid:  { color: T.grid },
        ticks: { color: T.mutedLight, font: { family: "'JetBrains Mono', monospace", size: 10 } },
        border: { color: 'transparent' },
      },
      y: {
        grid:  { color: T.grid },
        ticks: { color: T.mutedLight, font: { family: "'JetBrains Mono', monospace", size: 10 } },
        border: { color: 'transparent' },
      },
      y1: {
        position: 'right',
        min: 0,
        max: 10,
        grid: { drawOnChartArea: false },
        ticks: {
          color: T.green,
          font: { family: "'JetBrains Mono', monospace", size: 10 },
          stepSize: 2,
        },
        border: { color: 'transparent' },
      },
    },
  }

  // ── Section 4: Difficulty Bar ─────────────────────────────────────────────
  const diffOrder  = ['easy', 'medium', 'hard']
  const diffColors = { easy: T.green, medium: T.accent, hard: T.orange }

  // Build parallel arrays aligned to diffOrder
  const diffCounts = diffOrder.map((d) => {
    const found = analytics.by_difficulty.find((x) => x.difficulty === d)
    return found?.session_count ?? 0
  })
  const diffScores = diffOrder.map((d) => {
    const found = analytics.by_difficulty.find((x) => x.difficulty === d)
    return found?.avg_score ?? null
  })
  const diffData = {
    labels: diffOrder,
    datasets: [
      {
        type: 'bar',
        label: 'Sessions',
        data: diffCounts,
        backgroundColor: diffOrder.map((d) => diffColors[d]),
        borderRadius: 6,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Avg Score',
        data: diffScores,
        borderColor: T.lineOverlay,
        backgroundColor: 'transparent',
        pointBackgroundColor: T.text,
        pointRadius: 5,
        borderWidth: 2,
        tension: 0.3,
        yAxisID: 'y1',
        spanGaps: true,
      },
    ],
  }
  const diffOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: T.mutedLight,
          font: { family: "'JetBrains Mono', monospace", size: 10 },
          boxWidth: 10,
          padding: 14,
        },
      },
      tooltip: { ...baseTooltip },
    },
    scales: {
      x: {
        grid:  { color: T.grid },
        ticks: { color: T.mutedLight, font: { family: "'JetBrains Mono', monospace", size: 12, weight: '600' } },
        border: { color: 'transparent' },
      },
      y: {
        grid:  { color: T.grid },
        ticks: { color: T.mutedLight, font: { family: "'JetBrains Mono', monospace", size: 10 }, precision: 0 },
        border: { color: 'transparent' },
      },
      y1: {
        position: 'right',
        min: 0,
        max: 10,
        grid: { drawOnChartArea: false },
        ticks: {
          color: T.text,
          font: { family: "'JetBrains Mono', monospace", size: 10 },
          stepSize: 2,
        },
        border: { color: 'transparent' },
      },
    },
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — full data layout
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className={rootCls}>

      {/* ── Ambient layer ────────────────────────────────────────────────── */}
      <div className="an-noise"  aria-hidden="true" />
      <div className="an-scan"   aria-hidden="true" />
      <div className="an-orb an-orb-1" aria-hidden="true" />
      <div className="an-orb an-orb-2" aria-hidden="true" />

      <div className="an-layer">

        {/* ── Navbar ─────────────────────────────────────────────────────── */}
        <NavBar
          initials={initials}
          isLoggingOut={isLoggingOut}
          onLogout={handleLogout}
        />

        {/* ── Main content ───────────────────────────────────────────────── */}
        <main className="an-content">

          {/* SECTION 0 — Page header */}
          <section className="an-fi-1" style={{ marginBottom: '36px' }}>
            <p className="an-eyebrow">Analytics</p>
            <h1 className="an-heading">Your <em>performance</em> insights</h1>
            <p className="an-sub">
              A bird's-eye view of every session — scores, trends, and where to focus next.
            </p>
          </section>

          {/* SECTION 1 — Stat cards */}
          <section className="an-stat-grid an-fi-2" aria-label="Summary statistics">

            <div className="an-stat-card">
              <span className="an-stat-label">Total Sessions</span>
              <p className="an-stat-value">{analytics.total_sessions}</p>
              <p className="an-stat-sub">
                {analytics.total_sessions === 1 ? '1 session completed' : `${analytics.total_sessions} sessions completed`}
              </p>
            </div>

            <div className="an-stat-card">
              <span className="an-stat-label">Scored Sessions</span>
              <p className="an-stat-value">{analytics.scored_sessions}</p>
              <p className="an-stat-sub">
                {analytics.scored_sessions === 0 ? 'No scores yet' : `${analytics.scored_sessions} with full scores`}
              </p>
            </div>

            <div className="an-stat-card">
              <span className="an-stat-label">Avg Score</span>
              <p className={`an-stat-value${analytics.avg_overall === null ? ' an-stat-value-muted' : ''}`}
                 style={{ color: analytics.avg_overall !== null ? T.accent : T.mutedLight }}>
                {analytics.avg_overall !== null ? analytics.avg_overall.toFixed(1) : '—'}
              </p>
              <p className="an-stat-sub">
                {analytics.avg_overall !== null ? 'Across all scored answers' : 'Complete an interview'}
              </p>
            </div>

            <div className="an-stat-card">
              <span className="an-stat-label">Best Score</span>
              <p className="an-stat-value"
                 style={{ color: analytics.best_score !== null ? T.green : T.mutedLight }}>
                {analytics.best_score !== null ? analytics.best_score.toFixed(1) : '—'}
              </p>
              <p className="an-stat-sub">
                {analytics.best_score !== null ? 'Personal best overall' : 'No scores yet'}
              </p>
            </div>
          </section>

          {/* SECTION 2 — Score Trend (full-width line chart) */}
          <section className="an-fi-3">
            <ChartCard title="Score Over Time">
              {hasTrend ? (
                <div style={{ height: '240px' }}>
                  <Line data={trendData} options={trendOptions} />
                </div>
              ) : (
                <div className="an-chart-placeholder" style={{ height: '240px' }}>
                  Not enough data yet — complete at least 2 scored sessions to see your trend.
                </div>
              )}
            </ChartCard>
          </section>

          {/* SECTION 3 — Radar + Domain (side by side) */}
          <section className="an-charts-grid an-fi-4">

            {/* LEFT — Skill Breakdown (Radar) */}
            <ChartCard title="Skill Breakdown" noMargin>
              {hasDimensions ? (
                <div style={{ height: '260px' }}>
                  <Radar data={radarData} options={radarOptions} />
                </div>
              ) : (
                <div className="an-chart-placeholder" style={{ height: '260px' }}>
                  Complete at least one scored session to see your skill breakdown.
                </div>
              )}
            </ChartCard>

            {/* RIGHT — Sessions by Domain (Horizontal Bar) */}
            <ChartCard title="Sessions by Domain" noMargin>
              {hasDomain ? (
                <div style={{ height: '260px' }}>
                  <Bar data={domainData} options={domainOptions} />
                </div>
              ) : (
                <div className="an-chart-placeholder" style={{ height: '260px' }}>
                  No domain data yet — start your first session.
                </div>
              )}
            </ChartCard>
          </section>

          {/* SECTION 4 — Difficulty Breakdown (full-width bar) */}
          <section className="an-fi-5">
            <ChartCard title="Performance by Difficulty">
              {hasDifficulty ? (
                <div style={{ height: '200px' }}>
                  <Bar data={diffData} options={diffOptions} />
                </div>
              ) : (
                <div className="an-chart-placeholder" style={{ height: '200px' }}>
                  No difficulty data yet — complete a few sessions first.
                </div>
              )}
            </ChartCard>
          </section>

        </main>
      </div>
    </div>
  )
}

// ── NavBar sub-component ──────────────────────────────────────────────────────
function NavBar({ displayName, initials, isLoggingOut, onLogout }) {
  return (
    <nav className="an-nav" role="navigation" aria-label="Analytics navigation">

      {/* Logo */}
      <Link href="/" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none'}}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'linear-gradient(135deg,#00d4aa,#00ff87)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#020b0e'
                }}
              >
                <Zap size={16} strokeWidth={2.5} />
              </div>
              <span style={{fontFamily:'var(--font-syne)',fontWeight:700,fontSize:14,
                letterSpacing:'.02em',color:'var(--text)'}}>
                Interview<span style={{color:'var(--accent)'}}>Coach</span>
              </span>
      </Link>

      <div className="an-nav-right">
        {/* ← Dashboard back link — replaces the "New Interview" CTA */}
        <Link href="/dashboard" className="an-back-btn" aria-label="Back to dashboard">
          <ArrowLeft size={13} strokeWidth={2.5} aria-hidden="true" />
          <span>Dashboard</span>
        </Link>

        <button
          className="an-logout-btn"
          onClick={onLogout}
          disabled={isLoggingOut}
          aria-label="Logout"
          title="Logout"
        >
          <LogOut size={16} strokeWidth={2.5} />
        </button>

        <div className="an-user-chip" aria-label={`Signed in as ${displayName}`}>
          <div className="an-avatar" aria-hidden="true">{initials}</div>
          <span className="an-user-name">{displayName}</span>
        </div>
      </div>
    </nav>
  )
}