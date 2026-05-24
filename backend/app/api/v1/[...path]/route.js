// src/app/api/v1/[...path]/route.js
// Generic BFF (Backend-For-Frontend) proxy to FastAPI.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const FASTAPI_BASE = 'http://localhost:8000'

async function proxy(request, context) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value  

  // Reconstruct the path: ['interviews', 'start'] → 'interviews/start'
  const pathSegments = context.params.path
  const path = pathSegments.join('/')

  // Preserve query string (e.g., ?limit=10)
  const { searchParams } = new URL(request.url)
  const queryString = searchParams.toString()
  const upstreamUrl = `${FASTAPI_BASE}/api/v1/${path}${queryString ? `?${queryString}` : ''}`

  const headers = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const init = {
    method: request.method,
    headers,
  }

  // Only attach body for methods that have one
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    init.body = await request.text()
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, init)
    const data = await upstreamResponse.json()
    return NextResponse.json(data, { status: upstreamResponse.status })
  } catch (error) {
    console.error(`BFF proxy error → ${upstreamUrl}:`, error)
    return NextResponse.json(
      { detail: 'Failed to reach backend server' },
      { status: 502 }
    )
  }
}

// Export all HTTP methods you want to proxy
export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const PUT = proxy
export const DELETE = proxy