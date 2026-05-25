// src/app/(auth)/login/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Mail, Lock, Eye, EyeOff, Zap } from "lucide-react";

// ── CSS ──────────────────────────────────────────────────────
import "@/styles/auth-shared.css";
import "./login.css";

// ── Fonts ────────────────────────────────────────────────────
const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-syne",
});
const dm = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

// Deterministic waveform bar count
const WAVE_BARS = Array.from({ length: 20 }, (_, i) => i);

// Stat pills data
const STATS = [
  { label: "< 5s latency",           colorClass: "" },
  { label: "4 scoring dimensions",   colorClass: "log-stat-pill--green" },
  { label: "100% local processing",  colorClass: "log-stat-pill--orange" },
];

export default function LoginPage() {
  const router = useRouter();

  // ── State (unchanged) ──────────────────────────────────────
  const [formData, setFormData]   = useState({ email: "", password: "" });
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Handlers (unchanged) ──────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div
      className={`auth-root log-root ${syne.variable} ${dm.variable} ${mono.variable}`}
    >
      {/* ── Ambient layer ────────────────────────────────── */}
      <div className="auth-noise" aria-hidden="true" />
      <div className="auth-cursor-glow" aria-hidden="true" />
      <div className="auth-scan-line" aria-hidden="true" />
      <div className="auth-orb auth-orb-1" aria-hidden="true" />
      <div className="auth-orb auth-orb-2" aria-hidden="true" />

      {/* ════════════════════════════════════════════════════
          LEFT — Brand panel
      ════════════════════════════════════════════════════ */}
      <aside className="log-brand auth-desktop-only">
        {/* Logo */}
        <Link href="/" className="log-brand-top" style={{ textDecoration: "none" }}>
          <div className="auth-logo">
            <div className="auth-logo-mark">
              <Zap size={16} strokeWidth={2.5} />
            </div>
            <span 
              className="auth-logo-accent">InterviewCoach
            </span>
          </div>
        </Link>

        {/* Headline */}
        <div className="log-headline">
          <h1 className="log-headline-text">
            Every answer.<br />
            <span>Scored.</span> Instantly.
          </h1>
          <p className="log-headline-sub">
            Real-time AI feedback on clarity, depth, structure,
            and confidence — the moment you stop speaking.
          </p>

          {/* Stat pills */}
          <div className="log-stats" role="list">
            {STATS.map((s) => (
              <div key={s.label} className={`log-stat-pill ${s.colorClass ?? ""}`} role="listitem">
                <span className="log-stat-dot" aria-hidden="true" />
                <span className="log-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Animated waveform */}
        <div className="log-wave-wrap">
          <p className="log-wave-label">Live audio analysis</p>
          <div className="log-wave" aria-hidden="true">
            {WAVE_BARS.map((i) => (
              <div key={i} className="log-wave-bar" />
            ))}
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════
          RIGHT — Form panel
      ════════════════════════════════════════════════════ */}
      <main className="log-form-panel">
        <div className="log-card">

          {/* Mobile-only logo */}
          <Link href="/" className="auth-logo auth-mobile-only log-fi-1" style={{ marginBottom: "32px" }}>
            <div className="auth-logo-mark">
              <Zap size={16} strokeWidth={2.5} />
            </div>
            <span className="auth-logo-accent">InterviewCoach</span>
          </Link>

          {/* Glass card */}
          <div className="auth-card">

            {/* Card header */}
            <div className="auth-card-header log-fi-1">
              <p className="log-greeting">Welcome back</p>
              <h2 className="auth-card-title">Sign in to your account</h2>
              <p className="auth-card-desc">
                Pick up right where you left off.
              </p>
            </div>

            {/* Form */}
            <form className="auth-form log-fi-2" onSubmit={handleSubmit} noValidate>

              {/* Error banner */}
              {error && (
                <div className="auth-error log-fi-2" role="alert">
                  <span className="auth-error-dot" aria-hidden="true" />
                  {error}
                </div>
              )}

              {/* Email field */}
              <div className="auth-field log-fi-3">
                <div className="auth-label-row">
                  <label className="auth-label" htmlFor="email">
                    Email address
                  </label>
                </div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden="true">
                    <Mail size={16} strokeWidth={1.8} />
                  </span>
                  <input
                    id="email"
                    className="auth-input"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    aria-describedby={error ? "login-error" : undefined}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="auth-field log-fi-4">
                <div className="auth-label-row log-label-row-pw">
                  <label className="auth-label" htmlFor="password">
                    Password
                  </label>
                  <Link href="/forgot-password" className="log-forgot">
                    Forgot password?
                  </Link>
                </div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden="true">
                    <Lock size={16} strokeWidth={1.8} />
                  </span>
                  <input
                    id="password"
                    className="auth-input auth-input-has-toggle"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword
                      ? <EyeOff size={16} strokeWidth={1.8} />
                      : <Eye    size={16} strokeWidth={1.8} />
                    }
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="auth-field log-fi-5">
                <button
                  type="submit"
                  className="auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="auth-spinner" aria-hidden="true" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </div>

            </form>

            {/* Card footer */}
            <div className="auth-card-footer log-fi-5">
              <p>
                Don&apos;t have an account?{" "}
                <Link href="/register" className="auth-link">
                  Create one
                </Link>
              </p>
            </div>

          </div>
          {/* /auth-card */}

        </div>
        {/* /log-card */}
      </main>

    </div>
  );
}