'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Persona, Player, Round } from '@/lib/types'

const AVATAR_COLORS: Record<string, string> = {
  'Luna ✨': 'linear-gradient(135deg, #f7971e, #ffd200)',
  'Mika 🌸': 'linear-gradient(135deg, #f953c6, #b91d73)',
  'Valentina 🔥': 'linear-gradient(135deg, #11998e, #38ef7d)',
  'Ashley 💋': 'linear-gradient(135deg, #8e2de2, #4a00e0)',
}

const AVATAR_EMOJIS: Record<string, string> = {
  'Luna ✨': '🇨🇴',
  'Mika 🌸': '🇯🇵',
  'Valentina 🔥': '🇧🇷',
  'Ashley 💋': '⭐',
}

export default function VerdictPage() {
  const router = useRouter()
  const [player, setPlayer] = useState<Player | null>(null)
  const [round, setRound] = useState<Round | null>(null)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [verdicts, setVerdicts] = useState<Record<string, 'real' | 'fake'>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const p = sessionStorage.getItem('player')
    const r = sessionStorage.getItem('round')
    if (!p || !r) { router.push('/'); return }

    const parsedPlayer: Player = JSON.parse(p)
    const parsedRound: Round = JSON.parse(r)
    setPlayer(parsedPlayer)
    setRound(parsedRound)

    supabase
      .from('personas')
      .select('*')
      .in('id', parsedRound.persona_ids)
      .then(({ data }) => {
        if (data) setPersonas(data)
        setLoading(false)
      })
  }, [router])

  function setVerdict(personaId: string, verdict: 'real' | 'fake') {
    setVerdicts((prev) => ({ ...prev, [personaId]: verdict }))
  }

  async function submitVerdicts() {
    if (!player || !round) return
    if (Object.keys(verdicts).length < personas.length) return

    setSubmitting(true)
    const res = await fetch('/api/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        round_id: round.id,
        player_id: player.id,
        verdicts,
      }),
    })

    const data = await res.json()
    if (res.ok) {
      sessionStorage.setItem('results', JSON.stringify(data))
      router.push('/results')
    } else {
      alert(data.error ?? 'Submission failed')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const allVerdicted = Object.keys(verdicts).length >= personas.length

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: '1px solid #222' }}
      >
        <button onClick={() => router.push('/lobby')} className="text-gray-400 text-xl p-1 -ml-1">
          ←
        </button>
        <div>
          <h1 className="text-white font-bold text-lg">Make Your Call 🔍</h1>
          <p className="text-gray-500 text-xs">Who was real? Who was fake?</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-4 overflow-y-auto">
        <p className="text-gray-400 text-sm">
          Tap each card to vote. Your credits depend on getting it right.
        </p>

        {personas.map((persona) => {
          const verdict = verdicts[persona.id]
          return (
            <div
              key={persona.id}
              className="rounded-2xl p-4"
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              {/* Persona info */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: AVATAR_COLORS[persona.display_name] ?? '#333' }}
                >
                  {AVATAR_EMOJIS[persona.display_name] ?? '👤'}
                </div>
                <div>
                  <p className="text-white font-semibold">{persona.display_name}</p>
                  <p className="text-gray-400 text-sm">{persona.age} · {persona.location}</p>
                </div>
              </div>

              {/* Vote buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setVerdict(persona.id, 'real')}
                  className="py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                  style={{
                    background: verdict === 'real' ? '#22c55e' : '#111',
                    color: verdict === 'real' ? '#fff' : '#666',
                    border: verdict === 'real' ? '2px solid #22c55e' : '2px solid #2a2a2a',
                  }}
                >
                  ✅ Real Person
                </button>
                <button
                  onClick={() => setVerdict(persona.id, 'fake')}
                  className="py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                  style={{
                    background: verdict === 'fake' ? '#ff2d78' : '#111',
                    color: verdict === 'fake' ? '#fff' : '#666',
                    border: verdict === 'fake' ? '2px solid #ff2d78' : '2px solid #2a2a2a',
                  }}
                >
                  🚫 Fake / Scam
                </button>
              </div>
            </div>
          )
        })}

        {/* Credit preview */}
        <div
          className="rounded-2xl px-4 py-3 text-xs text-gray-500"
          style={{ background: '#111', border: '1px solid #222' }}
        >
          <div className="flex justify-between">
            <span>Correct: Real person</span><span className="text-green-400">+150 credits</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Correct: Spot a fake</span><span className="text-green-400">+200 credits</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Wrong guess</span><span className="text-red-400">-100 credits</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4" style={{ borderTop: '1px solid #1a1a1a' }}>
        <button
          onClick={submitVerdicts}
          disabled={!allVerdicted || submitting}
          className="w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 disabled:opacity-40"
          style={{
            background: allVerdicted ? 'linear-gradient(135deg, #ff2d78, #cc1f5e)' : '#1a1a1a',
            color: '#fff',
            boxShadow: allVerdicted ? '0 0 30px #ff2d7840' : 'none',
          }}
        >
          {submitting ? 'Submitting...' : allVerdicted ? 'Lock In Verdicts 🔒' : `Choose for all (${Object.keys(verdicts).length}/${personas.length})`}
        </button>
      </div>
    </div>
  )
}
