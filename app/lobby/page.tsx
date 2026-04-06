'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Persona, Player, Round } from '@/lib/types'

const AVATAR_EMOJIS: Record<string, string> = {
  'Luna ✨': '🇨🇴',
  'Mika 🌸': '🇯🇵',
  'Valentina 🔥': '🇧🇷',
  'Ashley 💋': '⭐',
}

const AVATAR_COLORS: Record<string, string> = {
  'Luna ✨': 'linear-gradient(135deg, #f7971e, #ffd200)',
  'Mika 🌸': 'linear-gradient(135deg, #f953c6, #b91d73)',
  'Valentina 🔥': 'linear-gradient(135deg, #11998e, #38ef7d)',
  'Ashley 💋': 'linear-gradient(135deg, #8e2de2, #4a00e0)',
}

export default function LobbyPage() {
  const router = useRouter()
  const [player, setPlayer] = useState<Player | null>(null)
  const [round, setRound] = useState<Round | null>(null)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [chatCounts, setChatCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const p = sessionStorage.getItem('player')
    const r = sessionStorage.getItem('round')
    if (!p || !r) { router.push('/'); return }

    const parsedPlayer: Player = JSON.parse(p)
    const parsedRound: Round = JSON.parse(r)
    setPlayer(parsedPlayer)
    setRound(parsedRound)

    async function loadData() {
      const { data } = await supabase
        .from('personas')
        .select('*')
        .in('id', parsedRound.persona_ids)

      if (data) setPersonas(data)

      // Count messages per persona for this round
      const counts: Record<string, number> = {}
      for (const id of parsedRound.persona_ids) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('round_id', parsedRound.id)
          .eq('persona_id', id)
        counts[id] = count ?? 0
      }
      setChatCounts(counts)
      setLoading(false)
    }

    loadData()
  }, [router])

  function goToChat(personaId: string) {
    router.push(`/chat/${personaId}`)
  }

  function goToVerdict() {
    router.push('/verdict')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const allChatted = personas.every((p) => (chatCounts[p.id] ?? 0) > 0)

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: '1px solid #222' }}
      >
        <div>
          <h1 className="font-bold text-white text-lg">Real or Fake? 🕵️</h1>
          <p className="text-gray-500 text-xs">@{player?.username}</p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: '#1a1a1a', border: '1px solid #333' }}
        >
          <span className="text-yellow-400 text-sm">💰</span>
          <span className="text-white font-bold text-sm">{player?.credits}</span>
        </div>
      </div>

      {/* Instruction */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-gray-400 text-sm">
          Chat with each person. Use your 30 messages wisely — then make your call.
        </p>
      </div>

      {/* Persona cards */}
      <div className="flex-1 px-4 py-2 flex flex-col gap-3 overflow-y-auto">
        {personas.map((persona) => {
          const msgCount = chatCounts[persona.id] ?? 0
          const chatted = msgCount > 0
          const remaining = Math.max(0, 30 - msgCount)

          return (
            <button
              key={persona.id}
              onClick={() => goToChat(persona.id)}
              className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98]"
              style={{
                background: '#1a1a1a',
                border: chatted ? '1px solid #ff2d7840' : '1px solid #2a2a2a',
              }}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: AVATAR_COLORS[persona.display_name] ?? '#333' }}
                >
                  {AVATAR_EMOJIS[persona.display_name] ?? '👤'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-base">{persona.display_name}</span>
                    {chatted && <span className="text-xs text-green-400">✓ chatted</span>}
                  </div>
                  <p className="text-gray-400 text-sm">
                    {persona.age} · {persona.location}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5 truncate">{persona.occupation}</p>
                </div>

                {/* Message counter */}
                <div className="flex flex-col items-end flex-shrink-0">
                  <div
                    className="text-xs font-medium px-2 py-1 rounded-full"
                    style={{
                      background: remaining < 10 ? '#ff2d7820' : '#ffffff10',
                      color: remaining < 10 ? '#ff2d78' : '#888',
                    }}
                  >
                    {remaining} left
                  </div>
                  <span className="text-gray-600 text-xs mt-1">→</span>
                </div>
              </div>

              {/* Personality tags */}
              {persona.personality_tags && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {persona.personality_tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: '#ffffff08', color: '#888', border: '1px solid #333' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Submit verdict CTA */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid #1a1a1a' }}>
        <button
          onClick={goToVerdict}
          className="w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95"
          style={{
            background: allChatted
              ? 'linear-gradient(135deg, #ff2d78, #cc1f5e)'
              : '#1a1a1a',
            color: allChatted ? '#fff' : '#555',
            boxShadow: allChatted ? '0 0 30px #ff2d7840' : 'none',
            border: allChatted ? 'none' : '1px solid #2a2a2a',
          }}
        >
          {allChatted ? 'Submit Verdicts 🔍' : `Chat with everyone first (${personas.filter(p => (chatCounts[p.id] ?? 0) > 0).length}/${personas.length})`}
        </button>
      </div>
    </div>
  )
}
