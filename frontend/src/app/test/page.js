// "use client" means this component runs in the browser, not on the server.
// We need this because we use useState and useEffect — React hooks
// that only work client-side.
"use client";

import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000";

// Fetches one URL and returns parsed JSON.
// Returns an error object on failure so one bad test doesn't crash the page.
async function fetchEndpoint(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

function ResultCard({ label, data }) {
  const failed = data?.error !== undefined;
  return (
    <div style={{
      padding: "14px 18px",
      marginBottom: "10px",
      borderRadius: "8px",
      border: `1px solid ${failed ? "#f87171" : "#4ade80"}`,
      background: failed ? "#fef2f2" : "#f0fdf4",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: failed ? "#dc2626" : "#16a34a" }}>
        {failed ? "❌" : "✅"} {label}
      </div>
      <pre style={{ margin: 0, fontSize: 13, color: "#374151" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function TestPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runTests() {
    setLoading(true);
    // Promise.all runs all three fetches in parallel — faster than sequential
    const [health, ping, cors] = await Promise.all([
      fetchEndpoint(`${API_BASE}/health`),
      fetchEndpoint(`${API_BASE}/api/v1/test/ping`),
      fetchEndpoint(`${API_BASE}/api/v1/test/cors-check`),
    ]);
    setResults({ health, ping, cors });
    setLoading(false);
  }

  // Run automatically on first page load
  useEffect(() => { runTests(); }, []);

  return (
    <div style={{ maxWidth: 580, margin: "60px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>Phase 1 — Smoke Test</h1>
      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>
        All three cards must be green before moving to Phase 2.
      </p>

      <button
        onClick={runTests}
        disabled={loading}
        style={{
          padding: "9px 20px", background: "#3b82f6", color: "#fff",
          border: "none", borderRadius: 8, cursor: "pointer",
          fontSize: 14, marginBottom: 24, opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Testing..." : "Re-run tests"}
      </button>

      {loading && <p style={{ color: "#9ca3af" }}>Calling backend...</p>}

      {results && !loading && (
        <>
          <ResultCard label="GET /health"                    data={results.health} />
          <ResultCard label="GET /api/v1/test/ping"          data={results.ping}   />
          <ResultCard label="GET /api/v1/test/cors-check"    data={results.cors}   />
        </>
      )}
    </div>
  );
}