// src/app/(dashboard)/dashboard/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { startInterview, listInterviews } from '@/services/interviews'
import { getMe, logout } from '@/lib/auth'
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google'
import {
  Zap,
  LayoutGrid,
  Plus,
  Activity,
  Star,
  Flame,
  LogOut,
  BarChart2,
} from 'lucide-react'

import './dashboard.css'

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

// ── Constants ─────────────────────────────────────────────────────────────────
const DOMAINS = [
  'dsa',
  'system_design',
  'backend',
  'frontend',
  'database',
  'operating_systems',
  'networking',
  'machine_learning',
  'cloud_computing',
  'behavioral'
]
const DIFFICULTIES = ['easy', 'medium', 'hard']
const COMPANIES = [
  'google', 'amazon', 'microsoft', 'meta', 'apple',
  'netflix', 'uber', 'flipkart', 'swiggy', 'adobe',
]
const EMPTY_BARS   = [1, 2, 3, 4, 5, 6, 7]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(name) {
  if (!name) return '??'
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('')
}

// Compute how many consecutive days (ending today) the user had at least one session.
function computeStreak(sessions) {
  if (!sessions.length) return 0
  const dates = new Set(
    sessions
      .filter((s) => s.started_at)
      .map((s) => new Date(s.started_at).toDateString())
  )
  let streak = 0
  const cursor = new Date()
  while (dates.has(cursor.toDateString())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// Average overall_score across sessions that have one.
function computeAvgScore(sessions) {
  const scored = sessions.filter((s) => s.overall_score !== null)
  if (!scored.length) return null
  const avg = scored.reduce((sum, s) => sum + s.overall_score, 0) / scored.length
  return avg.toFixed(1)
}

// Format a started_at ISO string into a readable relative label.
function formatDate(isoStr) {
  if (!isoStr) return '—'
  const date   = new Date(isoStr)
  const now    = new Date()
  const diffMs = now - date
  const diffH  = diffMs / (1000 * 60 * 60)

  if (diffH < 1)   return 'Just now'
  if (diffH < 24)  return `${Math.floor(diffH)}h ago`
  if (diffH < 48)  return 'Yesterday'
  if (diffH < 168) return `${Math.floor(diffH / 24)}d ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Score colour based on value (0-10 scale).
function scoreColor(score) {
  if (score === null) return 'var(--muted)'
  if (score >= 7.5)   return 'var(--green)'
  if (score >= 5)     return 'var(--accent)'
  return 'var(--orange)'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()

  // ── Auth / user ───────────────────────────────────────────────────────────
  const [user,         setUser]         = useState(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // ── New interview form ────────────────────────────────────────────────────
  const [domain,     setDomain]     = useState('backend')
  const [difficulty, setDifficulty] = useState('medium')
  const [companyMode, setCompanyMode] = useState('')
  const [starting,   setStarting]   = useState(false)
  const [startError, setStartError] = useState(null)

  // ── Sessions list + loading ───────────────────────────────────────────────
  const [sessions,         setSessions]         = useState([])
  const [sessionsLoading,  setSessionsLoading]  = useState(true)

  // ── Load user on mount ────────────────────────────────────────────────────
  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getMe()
        setUser(data)
      } catch {
        router.push('/login')
      }
    }
    loadUser()
  }, [router])

  // ── Load sessions on mount ────────────────────────────────────────────────
  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await listInterviews()
        setSessions(data)
      } catch (err) {
        console.error('Failed to load sessions:', err)
        // Non-fatal: dashboard still works, just shows empty state
      } finally {
        setSessionsLoading(false)
      }
    }
    loadSessions()
  }, [])

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalSessions = sessions.length
  const avgScore      = computeAvgScore(sessions)
  const streak        = computeStreak(sessions)
  // Show only the 5 most recent sessions in the list
  const recentSessions = sessions.slice(0, 5)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.push('/login')
    } catch {
      setIsLoggingOut(false)
    }
  }

  const handleStart = async () => {
    setStarting(true)
    setStartError(null)
    try {
      const session = await startInterview({
        domain,
        difficulty,
        company_mode: companyMode || null,   // ADD — empty string becomes null
      })
      router.push(`/interview/${session.id}`)
    } catch (err) {
      setStartError(err.message)
      setStarting(false)
    }
  }

  const displayName = user?.name ?? 'Guest'
  const initials    = user?.name ? getInitials(user.name) : '??'

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className={`dash-root ${syne.variable} ${dm.variable} ${mono.variable}`}>

      {/* ── Ambient layer ──────────────────────────────────────────────────── */}
      <div className="dash-noise"   aria-hidden="true" />
      <div className="dash-scan"    aria-hidden="true" />
      <div className="dash-orb dash-orb-1" aria-hidden="true" />
      <div className="dash-orb dash-orb-2" aria-hidden="true" />

      <div className="dash-layer">

        {/* ══════════════════════════════════════════════════════════════════
            NAVBAR
        ══════════════════════════════════════════════════════════════════ */}
        <nav className="dash-nav" role="navigation" aria-label="Main navigation">
          
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

          <div className="dash-nav-right">
            <button
              className="dash-nav-cta"
              onClick={() =>
                document.getElementById('quickstart')?.scrollIntoView({ behavior: 'smooth' })
              }
              aria-label="Start a new interview"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New Interview</span>
            </button>

            <button
              className="dash-logout-btn"
              onClick={() => router.push('/analytics')}
              aria-label="View analytics"
              title="Analytics"
              style={{ color: 'var(--accent)' }}
            >
              <BarChart2 size={16} strokeWidth={2} />
            </button>

            <button
              className="dash-logout-btn"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={16} strokeWidth={2.5} />
            </button>

            <div className="dash-user-chip" aria-label={`Signed in as ${displayName}`}>
              <div className="dash-avatar" aria-hidden="true">{initials}</div>
            </div>
          </div>
        </nav>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE CONTENT
        ══════════════════════════════════════════════════════════════════ */}
        <main className="dash-content">

          {/* ── Welcome ──────────────────────────────────────────────────── */}
          <section className="dash-fi-1" aria-label="Welcome">
            <p className="dash-welcome-eyebrow">Dashboard</p>
            <h1 className="dash-welcome-heading">
              {getGreeting()}, <em>{displayName}</em>
            </h1>
            <p className="dash-welcome-sub">
              Ready to sharpen your edge? Pick a domain and start practicing.
            </p>
          </section>

          {/* ── Quick-start card ─────────────────────────────────────────── */}
          <section
            id="quickstart"
            className="dash-quickstart dash-fi-2"
            aria-label="Start a new interview session"
          >
            <div className="dash-quickstart-header">
              <div className="dash-quickstart-icon" aria-hidden="true">
                <LayoutGrid size={20} strokeWidth={1.8} />
              </div>
              <div>
                <p className="dash-quickstart-title">Configure your session</p>
                <p className="dash-quickstart-desc">
                  Choose a domain and set the difficulty — we'll do the rest.
                </p>
              </div>
            </div>

            <div className="dash-selectors">
              {/* Domain */}
              <div className="dash-field">
                <label className="dash-label" htmlFor="domain-select">Domain</label>
                <select
                  id="domain-select"
                  className="dash-select"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  disabled={starting}
                >
                  {DOMAINS.map((d) => (
                    <option key={d} value={d}>{d.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div className="dash-field">
                <span className="dash-label" id="difficulty-label">Difficulty</span>
                <div className="dash-difficulty-pills" role="group" aria-labelledby="difficulty-label">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`dash-pill dash-pill-${d} ${difficulty === d ? 'dash-pill-active' : ''}`}
                      onClick={() => setDifficulty(d)}
                      disabled={starting}
                      aria-pressed={difficulty === d}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Company Mode */}
              <div className="dash-field">
                <label className="dash-label" htmlFor="company-select">
                  Company <span style={{ color: 'var(--muted)', fontStyle: 'normal' }}>(optional)</span>
                </label>
                <select
                  id="company-select"
                  className="dash-select"
                  value={companyMode}
                  onChange={(e) => setCompanyMode(e.target.value)}
                  disabled={starting}
                >
                  <option value="">Any company</option>
                  {COMPANIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {startError && (
              <div className="dash-error" role="alert">
                <span className="dash-error-dot" aria-hidden="true" />
                {startError}
              </div>
            )}

            <button
              className="dash-start-btn"
              onClick={handleStart}
              disabled={starting}
              aria-busy={starting}
            >
              {starting ? (
                <>
                  <span className="dash-spinner" aria-hidden="true" />
                  <span>Starting…</span>
                </>
              ) : (
                <>
                  <Zap size={16} strokeWidth={2.5} aria-hidden="true" />
                  <span>Start Interview</span>
                </>
              )}
            </button>
          </section>

          {/* ── Stats row ────────────────────────────────────────────────── */}
          <section className="dash-stats-row dash-fi-3" aria-label="Your statistics">

            <div className="dash-stat-card">
              <div className="dash-stat-icon" aria-hidden="true">
                <Activity size={18} strokeWidth={1.8} />
              </div>
              {sessionsLoading ? (
                <div className="dash-stat-skeleton" aria-hidden="true" />
              ) : (
                <p className="dash-stat-value">{totalSessions}</p>
              )}
              <p className="dash-stat-label">Total sessions</p>
              <p className="dash-stat-sub">
                {totalSessions === 0 ? 'Start your first interview' : `${totalSessions} session${totalSessions !== 1 ? 's' : ''} completed`}
              </p>
            </div>

            <div className="dash-stat-card">
              <div className="dash-stat-icon" aria-hidden="true">
                <Star size={18} strokeWidth={1.8} />
              </div>
              {sessionsLoading ? (
                <div className="dash-stat-skeleton" aria-hidden="true" />
              ) : (
                <p className="dash-stat-value" style={{ color: avgScore ? scoreColor(parseFloat(avgScore)) : 'var(--muted-light)' }}>
                  {avgScore ? `${avgScore}` : '—'}
                </p>
              )}
              <p className="dash-stat-label">Avg score</p>
              <p className="dash-stat-sub">
                {avgScore ? 'Across all dimensions' : 'Complete an interview to see'}
              </p>
            </div>

            <div className="dash-stat-card">
              <div className="dash-stat-icon" aria-hidden="true">
                <Flame size={18} strokeWidth={1.8} />
              </div>
              {sessionsLoading ? (
                <div className="dash-stat-skeleton" aria-hidden="true" />
              ) : (
                <p className="dash-stat-value" style={{ color: streak > 0 ? 'var(--orange)' : 'var(--text)' }}>
                  {streak}
                </p>
              )}
              <p className="dash-stat-label">Day streak</p>
              <p className="dash-stat-sub">
                {streak > 1 ? `${streak} days in a row — keep going!` : 'Practice daily to build momentum'}
              </p>
            </div>

          </section>

          {/* ── Recent sessions ──────────────────────────────────────────── */}
          <section className="dash-sessions dash-fi-4" aria-label="Recent sessions">

            <div className="dash-sessions-header">
              <h2 className="dash-sessions-title">Recent sessions</h2>
              <span className="dash-sessions-badge">
                {sessionsLoading ? '—' : `${totalSessions} session${totalSessions !== 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Loading skeleton rows */}
            {sessionsLoading && (
              <div aria-busy="true" aria-label="Loading sessions">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="dash-session-row">
                    <div className="dash-session-left">
                      <div className="dash-skel dash-skel-domain" />
                      <div className="dash-skel dash-skel-badge" />
                      <div className="dash-skel dash-skel-date" />
                    </div>
                    <div className="dash-skel dash-skel-score" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!sessionsLoading && recentSessions.length === 0 && (
              <div className="dash-empty" role="status" aria-live="polite">
                <div className="dash-empty-visual" aria-hidden="true">
                  {EMPTY_BARS.map((i) => (
                    <div key={i} className="dash-empty-bar" />
                  ))}
                </div>
                <p className="dash-empty-title">No sessions yet</p>
                <p className="dash-empty-desc">
                  Complete your first interview above and your results will appear here.
                </p>
              </div>
            )}

            {/* Session rows */}
            {!sessionsLoading && recentSessions.map((session) => {
              const completed = session.status === 'completed'
              const sessionRow = (
                <>
                  {/* Left: domain + difficulty + date */}
                  <div className="dash-session-left">
                    {/* Status dot */}
                    <span
                      className={`dash-session-status dash-session-status-${session.status}`}
                      title={session.status}
                      aria-label={`Status: ${session.status}`}
                    />

                    {/* Domain */}
                    <span className="dash-session-domain">
                      {session.domain.replace('_', ' ')}
                    </span>

                    {/* Difficulty badge */}
                    <span className={`dash-session-diff dash-session-diff-${session.difficulty}`}>
                      {session.difficulty}
                    </span>

                    {/* Date */}
                    <span className="dash-session-date">
                      {formatDate(session.started_at)}
                    </span>
                  </div>

                  {/* Right: score */}
                  <div className="dash-session-right">
                    {session.overall_score !== null ? (
                      <span
                        className="dash-session-score"
                        style={{ color: scoreColor(session.overall_score) }}
                        aria-label={`Score: ${session.overall_score} out of 10`}
                      >
                        {session.overall_score}
                        <span className="dash-session-score-denom">/10</span>
                      </span>
                    ) : (
                      <span className="dash-session-score-null">
                        {session.status === 'completed' ? 'no score' : 'in progress'}
                      </span>
                    )}
                  </div>
                </>
              )

              return completed ? (
                <Link
                  key={session.id}
                  href={`/results/${session.id}`}
                  className="dash-session-row dash-session-row-clickable"
                  aria-label={`View results for session ${session.id}`}
                >
                  {sessionRow}
                </Link>
              ) : (
                <div key={session.id} className="dash-session-row">
                  {sessionRow}
                </div>
              )
            })}

          </section>

        </main>
      </div>
    </div>
  )
}