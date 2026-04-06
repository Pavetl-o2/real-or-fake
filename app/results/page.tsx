'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type ResultEntry = {
  correct: boolean
  credits_delta: number
  is_real: boolean
  display_name: string
}

export default function ResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState<Record<string, ResultEntry>>({})
  const [totalDelta, setTotalDelta] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('results')
    if (!raw) { router.push('/'); return }
    const data = JSON.parse(raw)
    setResults(data.results ?? {})
    setTotalDelta(data.total_delta ?? 0)
    setLoaded(true)
  }, [router])

  if (!loaded) return null

  const entries = Object.values(results)
  const correct = entries.filter((e) => e.correct).length
  const scorePercent = Math.round((correct / entries.length) * 100)

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div
        className="px-4 py-6 text-center"
        style={{ background: 'linear-gradient(180deg, #1a0010 0%, #0a0a0a 100%)' }}
      >
        <div className="text-5xl mb-3">
          {scorePercent === 100 ? '🏆' : scorePercent >= 50 ? '🕵️' : '😵'}
        </div>
        <h1 className="text-2xl font-black text-white">
          {scorePercent === 100 ? 'Perfect Read!' : scorePercent >= 75 ? 'Sharp Eye!' : scorePercent >= 50 ? 'Not Bad...' : 'Completely Fooled'}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {correct}/{entries.length} correct
        </p>
        <div
          className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full"
          style={{ background: '#1a1a1a', border: '1px solid #333' }}
        >
          <span className="text-yellow-400">💰</span>
          <span
            className="font-bold text-lg"
            style={{ color: totalDelta >= 0 ? '#22c55e' : '#ff2d78' }}
          >
            {totalDelta >= 0 ? '+' : ''}{totalDelta} credits
          </span>
        </div>
      </div>

      {/* Results list */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-y-auto">
        {Object.entries(results).map(([personaId, result]) => (
          <div
            key={personaId}
            className="rounded-2xl p-4"
            style={{
              background: '#1a1a1a',
              border: `1px solid ${result.correct ? '#22c55e40' : '#ff2d7840'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{result.display_name}</p>
                <p className="text-gray-400 text-sm mt-0.5">
                  Actually: <span className={result.is_real ? 'text-green-400' : 'text-red-400'}>
                    {result.is_real ? '✅ Real person' : '🚫 Fake / Scam'}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl">{result.correct ? '✓' : '✗'}</div>
                <div
                  className="text-sm font-bold mt-1"
                  style={{ color: result.credits_delta > 0 ? '#22c55e' : '#ff2d78' }}
                >
                  {result.credits_delta > 0 ? '+' : ''}{result.credits_delta}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-4 flex flex-col gap-3" style={{ borderTop: '1px solid #1a1a1a' }}>
        <button
          onClick={() => router.push('/shame')}
          className="w-full py-3 rounded-2xl font-semibold text-sm"
          style={{ background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a' }}
        >
          🏛️ Hall of Shame
        </button>
        <button
          onClick={() => {
            sessionStorage.clear()
            router.push('/')
          }}
          className="w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #ff2d78, #cc1f5e)', color: '#fff' }}
        >
          Play Again 🎭
        </button>
      </div>
    </div>
  )
}
