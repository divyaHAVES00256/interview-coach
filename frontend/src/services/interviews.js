// src/services/interviews.js
// Clean service layer for all interview-related API calls

const BASE = '/api/v1/interviews'

/**
 * Start a new interview session.
 * @param {{ domain: string, company_mode?: string, difficulty: string }} params
 * @returns {Promise<{ id: number, status: string, domain: string, ... }>}
 */
export async function startInterview({ domain, companyMode = null, difficulty = 'medium' }) {
  const res = await fetch(`${BASE}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain,
      company_mode: companyMode,
      difficulty,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to start interview session')
  }

  return res.json()
}

/**
 * Fetch single session details by ID.
 * @param {number} sessionId
 */
export async function getInterview(sessionId) {
  const res = await fetch(`${BASE}/${sessionId}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Session not found')
  }

  return res.json()
}

/**
 * End an in-progress session.
 * @param {number} sessionId
 */
export async function endInterview(sessionId) {
  const res = await fetch(`${BASE}/${sessionId}/end`, {
    method: 'PATCH',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to end session')
  }

  return res.json()
}

/**
 * List all sessions for current user
 */
export async function listInterviews() {
  const res = await fetch(`${BASE}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

/**
 * Fetch the JWT token from the BFF (for WebSocket authentication).
 * @returns {Promise<string>} The raw JWT string
 */
export async function getWsToken() {
  const res = await fetch('/api/auth/token')
  if (!res.ok) throw new Error('Not authenticated')
  const { token } = await res.json()
  return token
}