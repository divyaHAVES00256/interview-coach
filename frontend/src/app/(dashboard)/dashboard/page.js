// src/app/(dashboard)/dashboard/page.js
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startInterview } from '@/services/interviews'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

const DOMAINS = ['backend', 'frontend', 'ml', 'system_design', 'dsa']
const DIFFICULTIES = ['easy', 'medium', 'hard']

export default function DashboardPage() {
  const router = useRouter()
  const [domain, setDomain] = useState('backend')
  const [difficulty, setDifficulty] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Start Interview</h1>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-400 font-medium">Domain</label>
          <select
            value={domain}
            onChange={e => setDomain(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 capitalize"
          >
            {DOMAINS.map(d => (
              <option key={d} value={d}>{d.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-400 font-medium">Difficulty</label>
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 capitalize"
          >
            {DIFFICULTIES.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button
          onClick={handleStart}
          disabled={loading}
          size="lg"
          className="w-full gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Starting…' : 'Start Interview'}
        </Button>
      </div>
    </div>
  )
}