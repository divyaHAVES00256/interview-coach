// src/app/(dashboard)/dashboard/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { startInterview } from '@/services/interviews'
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
} from 'lucide-react'

import './dashboard.css'

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

// ── Constants (unchanged) ────────────────────────────────────
const DOMAINS     = ['backend', 'frontend', 'ml', 'system_design', 'dsa']
const DIFFICULTIES = ['easy', 'medium', 'hard']

// ── Greeting helper ──────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// Placeholder user — replace with real auth data when available
const USER = { name: 'Divya Singh', initials: 'DS' }

function getInitials(name) {
  if (!name) return '??'
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase())
    .slice(0, 2)
    .join('')
}

// Waveform bars for empty state decoration
const EMPTY_BARS = [1, 2, 3, 4, 5, 6, 7]

export default function DashboardPage() {
  const router = useRouter()

  // ── State (unchanged) ──────────────────────────────────────
  const [domain,     setDomain]     = useState('backend')
  const [difficulty, setDifficulty] = useState('medium')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [user,       setUser]       = useState(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getMe()
        setUser(data)
      } catch (err) {
        console.error('Failed to load current user:', err)
        router.push('/login')
      }
    }

    loadUser()
  }, [router])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.push('/login')
    } catch (err) {
      console.error('Logout failed:', err)
      setIsLoggingOut(false)
    }
  }

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
      const session = await startInterview({ domain, difficulty })
      router.push(`/interview/${session.id}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const displayName = user?.name ?? 'Guest'
  const initials = user?.name ? getInitials(user.name) : '??'

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className={`dash-root ${syne.variable} ${dm.variable} ${mono.variable}`}>

      {/* ── Ambient layer ──────────────────────────────────── */}
      <div className="dash-noise"   aria-hidden="true" />
      <div className="dash-scan"    aria-hidden="true" />
      <div className="dash-orb dash-orb-1" aria-hidden="true" />
      <div className="dash-orb dash-orb-2" aria-hidden="true" />

      <div className="dash-layer">

        {/* ══════════════════════════════════════════════════
            NAVBAR
        ══════════════════════════════════════════════════ */}
        <nav className="dash-nav" role="navigation" aria-label="Main navigation">

          {/* Logo */}
          <Link href="/" className="dash-logo">
            <div className="dash-logo-mark" aria-hidden="true">
              <Zap size={16} strokeWidth={2.5} />
            </div>
            <span className="dash-logo-name">InterviewCoach</span>
          </Link>

          {/* Right cluster */}
          <div className="dash-nav-right">
            {/* "New Interview" scrolls to quick-start card */}
            <button
              className="dash-nav-cta"
              onClick={() =>
                document
                  .getElementById('quickstart')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              aria-label="Start a new interview"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New Interview</span>
            </button>

            {/* Logout button */}
            <button
              className="dash-logout-btn"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={16} strokeWidth={2.5} />
            </button>

            {/* User chip */}
            <div className="dash-user-chip" aria-label={`Signed in as ${displayName}`}>
              <div className="dash-avatar" aria-hidden="true">
                {initials}
              </div>
              <span className="dash-user-name">{displayName}</span>
            </div>
          </div>
        </nav>

        {/* ══════════════════════════════════════════════════
            PAGE CONTENT
        ══════════════════════════════════════════════════ */}
        <main className="dash-content">

          {/* ── Welcome heading ──────────────────────────── */}
          <section className="dash-fi-1" aria-label="Welcome">
            <p className="dash-welcome-eyebrow">Dashboard</p>
            <h1 className="dash-welcome-heading">
              {getGreeting()},{' '}
              <em>{displayName}</em>
            </h1>
            <p className="dash-welcome-sub">
              Ready to sharpen your edge? Pick a domain and start practicing.
            </p>
          </section>

          {/* ── Quick-start card ─────────────────────────── */}
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

            {/* Domain + Difficulty selectors */}
            <div className="dash-selectors">

              {/* Domain */}
              <div className="dash-field">
                <label className="dash-label" htmlFor="domain-select">
                  Domain
                </label>
                <select
                  id="domain-select"
                  className="dash-select"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  disabled={loading}
                >
                  {DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {d.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty — pill toggle */}
              <div className="dash-field">
                <span className="dash-label" id="difficulty-label">
                  Difficulty
                </span>
                <div
                  className="dash-difficulty-pills"
                  role="group"
                  aria-labelledby="difficulty-label"
                >
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`dash-pill dash-pill-${d} ${
                        difficulty === d ? 'dash-pill-active' : ''
                      }`}
                      onClick={() => setDifficulty(d)}
                      disabled={loading}
                      aria-pressed={difficulty === d}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="dash-error" role="alert">
                <span className="dash-error-dot" aria-hidden="true" />
                {error}
              </div>
            )}

            {/* Start button */}
            <button
              className="dash-start-btn"
              onClick={handleStart}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
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

          {/* ── Stats row ─────────────────────────────────── */}
          <section className="dash-stats-row dash-fi-3" aria-label="Your statistics">

            <div className="dash-stat-card">
              <div className="dash-stat-icon" aria-hidden="true">
                <Activity size={18} strokeWidth={1.8} />
              </div>
              <p className="dash-stat-value">0</p>
              <p className="dash-stat-label">Total sessions</p>
              <p className="dash-stat-sub">Start your first interview</p>
            </div>

            <div className="dash-stat-card">
              <div className="dash-stat-icon" aria-hidden="true">
                <Star size={18} strokeWidth={1.8} />
              </div>
              <p className="dash-stat-value">—</p>
              <p className="dash-stat-label">Avg score</p>
              <p className="dash-stat-sub">Across all dimensions</p>
            </div>

            <div className="dash-stat-card">
              <div className="dash-stat-icon" aria-hidden="true">
                <Flame size={18} strokeWidth={1.8} />
              </div>
              <p className="dash-stat-value">0</p>
              <p className="dash-stat-label">Day streak</p>
              <p className="dash-stat-sub">Practice daily to build momentum</p>
            </div>

          </section>

          {/* ── Recent sessions ───────────────────────────── */}
          <section className="dash-sessions dash-fi-4" aria-label="Recent sessions">

            <div className="dash-sessions-header">
              <h2 className="dash-sessions-title">Recent sessions</h2>
              <span className="dash-sessions-badge">0 sessions</span>
            </div>

            {/* Empty state */}
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

          </section>

        </main>
      </div>
    </div>
  )
}