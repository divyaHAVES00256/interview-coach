// frontend/src/services/analytics.js
// Fetches aggregated analytics data for the current authenticated user
// All requests go through the Next.js BFF proxy (never port 8000 directly)

const BASE = '/api/v1/analytics'

export async function getAnalytics() {
  const res = await fetch(`${BASE}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })
 
  if (!res.ok) {
    let message = `Analytics fetch failed: ${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.detail) message = body.detail
    } catch {
      // ignore JSON parse errors — keep the status-based message
    }
    throw new Error(message)
  }
 
  return res.json()
}