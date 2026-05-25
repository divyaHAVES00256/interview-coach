"use client";

// CSS: auth-shared.css has shared tokens/orbs/card/input/button styles.
// register.css has the split-panel layout + strength meter + waveform.
import "@/styles/auth-shared.css";
import "./register.css";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import { register } from "@/lib/auth";

// Lucide icons — already in your project (used in Phase 4 AudioRecorder)
import {
  Eye, EyeOff, User, Mail, Lock,
  ArrowRight, Zap, BarChart3, Shield,
  CheckCircle2,
} from "lucide-react";

// ── Fonts (same as landing page — CSS vars applied to root div) ──────────
const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-syne",
});
const dm = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

// ── Left panel data ──────────────────────────────────────────────────────
const FEATURES = [
  {
    Icon: Zap,
    title: "Real-time Transcription",
    desc: "faster-whisper converts your speech locally with < 5s latency.",
  },
  {
    Icon: BarChart3,
    title: "4-Dimension AI Scoring",
    desc: "Scored on accuracy, clarity, completeness & STAR alignment.",
  },
  {
    Icon: Shield,
    title: "100% Private & Local",
    desc: "Every model runs on your machine. Zero cloud, zero cost.",
  },
];

// Deterministic waveform heights — avoids hydration mismatch from Math.random
const WAVE_HEIGHTS = [
  8, 16, 28, 44, 56, 48, 34, 18, 10, 6,
  20, 38, 54, 60, 46, 26, 12, 8, 22, 42,
  56, 50, 32, 16, 8,
];

// ── Password strength calculator ─────────────────────────────────────────
function getStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  if (pw.length < 6) return { score: 1, label: "Too short", color: "#ef4444" };
  const checks = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) =>
    r.test(pw)
  ).length;
  if (pw.length < 8 || checks < 2)
    return { score: 2, label: "Weak", color: "#ff7b45" };
  if (checks === 2 || checks === 3)
    return { score: 3, label: "Good", color: "#00d4aa" };
  return { score: 4, label: "Strong", color: "#00ff87" };
}

// ── Component ─────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();

  // ── Form state (identical to original) ──────────────────────────────
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "", // client-side only — never sent to server
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── New UI state ─────────────────────────────────────────────────────
  const [showPw, setShowPw] = useState(false);
  const [showConfPw, setShowConfPw] = useState(false);

  // ── Cursor glow (same technique as landing page) ─────────────────────
  useEffect(() => {
    const onMove = (e) => {
      document.documentElement.style.setProperty("--cx", `${e.clientX}px`);
      document.documentElement.style.setProperty("--cy", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // ── Handlers (identical logic to original) ───────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validation (unchanged from original)
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      // Only sends name, email, password — confirmPassword stays client-only
      await register(formData.name, formData.email, formData.password);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Derived UI state ─────────────────────────────────────────────────
  const strength = getStrength(formData.password);
  const pwsMatch =
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className={`${syne.variable} ${dm.variable} ${mono.variable} auth-root`}>

      {/* ── Ambient layer ──────────────────────────────────────────────── */}
      <div className="auth-noise" />
      <div className="auth-cursor-glow" />
      <div className="auth-scan-line" />
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      {/* ══ SPLIT LAYOUT ═══════════════════════════════════════════════ */}
      <div className="reg-layout">

        {/* ══ LEFT BRAND PANEL ════════════════════════════════════════ */}
        <div className="reg-left auth-desktop-only">

          {/* Logo */}
          <div className="auth-fi-1">
            <Link href="/" className="auth-logo">
              <div className="auth-logo-mark">
                <Zap size={16} strokeWidth={2.5} />
              </div>
              <span>
                Interview<span className="auth-logo-accent">Coach</span>
              </span>
            </Link>
          </div>

          {/* Hero text */}
          <div className="reg-hero">
            <p className="auth-eyebrow auth-fi-2">AI-Powered Practice</p>
            <h1 className="reg-headline auth-fi-2">
              Train harder.
              <br />
              <span className="auth-shimmer">Interview smarter.</span>
            </h1>
            <p className="reg-subtext auth-fi-3">
              The only mock interview platform that runs entirely on your
              machine. No subscriptions. No cloud. No limits.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="reg-features auth-fi-4">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="reg-feature">
                <div className="reg-feature-icon">
                  <Icon size={16} />
                </div>
                <div>
                  <p className="reg-feature-title">{title}</p>
                  <p className="reg-feature-desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Animated waveform */}
          <div className="reg-wave-section auth-fi-5">
            <div className="reg-wave-container">
              {WAVE_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  className="reg-wave-bar"
                  style={{
                    "--wh": `${h}px`,
                    "--wd": `${0.72 + (i % 7) * 0.09}s`,
                    animationDelay: `${i * 0.048}s`,
                  }}
                />
              ))}
            </div>
            <p className="reg-wave-label">
              Live transcription · faster-whisper · no cloud
            </p>
          </div>
        </div>

        {/* ══ RIGHT FORM PANEL ════════════════════════════════════════ */}
        <div className="reg-right">

          {/* Mobile-only logo */}
          <Link href="/" className="auth-logo reg-mobile-logo auth-fi-1">
            <div className="auth-logo-mark">AI</div>
            <span>
              Interview<span className="auth-logo-accent">Coach</span>
            </span>
          </Link>

          {/* ── Glass card ─────────────────────────────────────────── */}
          <div className="auth-card auth-fi-2">

            {/* Header */}
            <div className="auth-card-header">
              <h2 className="auth-card-title">Create your account</h2>
              <p className="auth-card-desc">
                Start your AI-powered interview prep today — free, forever.
              </p>
            </div>

            {/* ── Form ─────────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="auth-form">

              {/* Error banner */}
              {error && (
                <div className="auth-error" role="alert">
                  <span className="auth-error-dot" />
                  {error}
                </div>
              )}

              {/* Full name */}
              <div className="auth-field">
                <label htmlFor="name" className="auth-label">
                  Full Name
                </label>
                <div className="auth-input-wrap">
                  <User size={15} className="auth-input-icon" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={loading}
                    className="auth-input"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="auth-field">
                <label htmlFor="email" className="auth-label">
                  Email Address
                </label>
                <div className="auth-input-wrap">
                  <Mail size={15} className="auth-input-icon" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    className="auth-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="auth-field">
                <label htmlFor="password" className="auth-label">
                  Password
                </label>
                <div className="auth-input-wrap">
                  <Lock size={15} className="auth-input-icon" />
                  <input
                    id="password"
                    name="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    className="auth-input auth-input-has-toggle"
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Strength meter — only shows while typing */}
                {formData.password && (
                  <div className="reg-strength">
                    <div className="reg-strength-bars">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className="reg-strength-bar"
                          style={{
                            background:
                              n <= strength.score
                                ? strength.color
                                : "rgba(255,255,255,0.06)",
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="reg-strength-label"
                      style={{ color: strength.color }}
                    >
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="confirmPassword" className="auth-label">
                    Confirm Password
                  </label>
                  {/* Green tick when passwords match */}
                  {pwsMatch && (
                    <span className="reg-match-ok">
                      <CheckCircle2 size={12} />
                      Passwords match
                    </span>
                  )}
                </div>
                <div className="auth-input-wrap">
                  <Lock size={15} className="auth-input-icon" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfPw ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    placeholder="Repeat your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                    className={`auth-input auth-input-has-toggle ${
                      formData.confirmPassword && !pwsMatch
                        ? "auth-input-err"
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowConfPw((v) => !v)}
                    aria-label={
                      showConfPw
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="auth-btn-primary"
              >
                {loading ? (
                  <span className="auth-spinner" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Terms */}
            <p className="reg-terms" style={{ marginTop: 14 }}>
              By creating an account you agree to our{" "}
              <a href="#">Terms of Service</a> and{" "}
              <a href="#">Privacy Policy</a>.
            </p>

            {/* Footer — sign in link */}
            <div className="auth-card-footer">
              Already have an account?{" "}
              <Link href="/login" className="auth-link">
                Sign in →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}