'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function startGame() {
    setLoading(true)
    setError('')
    try {
      const pRes = await fetch('/api/player', { method: 'POST' })
      const { player, error: pErr } = await pRes.json()
      if (pErr || !player) throw new Error(pErr ?? 'Failed to create player')

      const rRes = await fetch('/api/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: player.id }),
      })
      const { round, error: rErr } = await rRes.json()
      if (rErr || !round) throw new Error(rErr ?? 'Failed to create round')

      sessionStorage.setItem('player', JSON.stringify(player))
      sessionStorage.setItem('round', JSON.stringify(round))

      router.push('/lobby')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-between min-h-dvh px-6 py-12"
      style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #1a0010 100%)' }}
    >
      <div />

      <div className="flex flex-col items-center gap-6 text-center">
        <div className="text-6xl mb-2">🕵️</div>
        <h1
          className="text-5xl font-black tracking-tight"
          style={{ color: '#ff2d78', textShadow: '0 0 40px #ff2d7860' }}
        >
          Real or Fake?
        </h1>
        <p className="text-lg text-gray-300 max-w-xs leading-relaxed">
          Chat with OnlyFans-style personas.<br />
          <span style={{ color: '#ff2d78' }}>Some are real. Some are scams.</span><br />
          Can you tell the difference?
        </p>

        <div
          className="rounded-2xl px-5 py-4 text-sm text-center w-full max-w-xs"
          style={{ background: '#1a1a1a', border: '1px solid #333' }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-2xl font-bold" style={{ color: '#ff2d78' }}>💰 500</div>
              <div className="text-gray-400 text-xs mt-1">starting credits</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">4</div>
              <div className="text-gray-400 text-xs mt-1">personas to read</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">+200</div>
              <div className="text-gray-400 text-xs mt-1">spot a fake</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">-100</div>
              <div className="text-gray-400 text-xs mt-1">get fooled</div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
        <button
          onClick={startGame}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: loading ? '#555' : 'linear-gradient(135deg, #ff2d78, #cc1f5e)',
            boxShadow: loading ? 'none' : '0 0 30px #ff2d7840',
          }}
        >
          {loading ? 'Setting up...' : 'Start Game 🎭'}
        </button>
        <p className="text-gray-600 text-xs text-center">No account needed</p>
      </div>
    </div>
  )
}
