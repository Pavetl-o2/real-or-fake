'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Persona, Player, Round, Message, ContentOffer } from '@/lib/types'

const MAX_MESSAGES = 30

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

const TIER_LABELS: Record<string, string> = {
  standard: '📸 Photo',
  premium: '⭐ Exclusive',
  bundle: '📦 Bundle',
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 px-4 py-1">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
        style={{ background: '#2a2a2a' }}
      >
        💬
      </div>
      <div
        className="flex gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: '#2a2a2a' }}
      >
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}

function ContentCard({
  offer,
  onPurchase,
  unlockedImage,
  buying,
  playerCredits,
}: {
  offer: ContentOffer
  onPurchase: () => void
  unlockedImage?: string
  buying: boolean
  playerCredits: number
}) {
  const canAfford = playerCredits >= offer.price

  if (unlockedImage) {
    return (
      <div className="mx-4 my-2 rounded-2xl overflow-hidden" style={{ border: '1px solid #ff2d7840' }}>
        <img src={unlockedImage} alt="Unlocked content" className="w-full object-cover rounded-2xl" />
        <div className="px-3 py-2 flex items-center gap-1.5" style={{ background: '#1a1a1a' }}>
          <span className="text-green-400 text-xs">✓ Unlocked</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="mx-4 my-2 rounded-2xl overflow-hidden"
      style={{ background: '#1a1a1a', border: '1px solid #333' }}
    >
      {/* Blurred preview placeholder */}
      <div
        className="w-full flex flex-col items-center justify-center gap-2 py-8"
        style={{ background: 'linear-gradient(135deg, #1f1f1f, #2a1a2a)' }}
      >
        <span className="text-4xl">🔒</span>
        <p className="text-gray-400 text-xs text-center px-6 leading-relaxed">{offer.description}</p>
      </div>

      {/* Purchase row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-white text-sm font-semibold">{TIER_LABELS[offer.tier] ?? '📸 Photo'}</p>
          {!canAfford && (
            <p className="text-red-400 text-xs mt-0.5">Not enough credits</p>
          )}
        </div>
        <button
          onClick={onPurchase}
          disabled={buying || !canAfford}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
          style={{ background: canAfford ? '#ff2d78' : '#333', color: '#fff' }}
        >
          {buying ? '⏳' : `💰 ${offer.price}`}
        </button>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  onLongPress,
}: {
  message: Message
  onLongPress: (id: string) => void
}) {
  const isPlayer = message.sender === 'player'
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handlePressStart() {
    if (isPlayer) return
    pressTimer.current = setTimeout(() => onLongPress(message.id), 600)
  }
  function handlePressEnd() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  return (
    <div className={`flex items-end gap-2 px-4 py-1 ${isPlayer ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isPlayer && (
        <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: '#2a2a2a' }} />
      )}
      <div
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed relative select-none"
        style={{
          background: isPlayer ? '#ff2d78' : '#2a2a2a',
          color: '#fff',
          borderBottomRightRadius: isPlayer ? '4px' : undefined,
          borderBottomLeftRadius: !isPlayer ? '4px' : undefined,
          border: message.flagged ? '1.5px solid #facc15' : undefined,
        }}
      >
        {message.content}
        {message.flagged && (
          <span className="absolute -top-2 -right-1 text-xs">📌</span>
        )}
      </div>
    </div>
  )
}

type ChatEntry =
  | { type: 'message'; message: Message }
  | { type: 'offer'; offerId: string; offer: ContentOffer; personaContext: PersonaContext }

type PersonaContext = {
  name: string
  age: number | null
  location: string | null
  is_real: boolean
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const personaId = params.personaId as string

  const [persona, setPersona] = useState<Persona | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [round, setRound] = useState<Round | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [typing, setTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [flagModalId, setFlagModalId] = useState<string | null>(null)

  // Content offer state
  const [unlockedImages, setUnlockedImages] = useState<Record<string, string>>({})
  const [buyingOffer, setBuyingOffer] = useState<Record<string, boolean>>({})

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const p = sessionStorage.getItem('player')
    const r = sessionStorage.getItem('round')
    if (!p || !r) { router.push('/'); return }

    const parsedPlayer: Player = JSON.parse(p)
    const parsedRound: Round = JSON.parse(r)
    setPlayer(parsedPlayer)
    setRound(parsedRound)

    async function loadData() {
      const { data: personaData } = await supabase
        .from('personas')
        .select('*')
        .eq('id', personaId)
        .single()

      if (personaData) setPersona(personaData)

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('round_id', parsedRound.id)
        .eq('persona_id', personaId)
        .order('message_number', { ascending: true })

      if (msgs) {
        setMessages(msgs)
        setEntries(msgs.map((m) => ({ type: 'message', message: m })))
      }
      setLoading(false)
    }

    loadData()
  }, [personaId, router])

  useEffect(() => {
    scrollToBottom()
  }, [entries, typing, scrollToBottom])

  const totalMessageCount = messages.length
  const remaining = MAX_MESSAGES - totalMessageCount
  const batteryPct = (remaining / MAX_MESSAGES) * 100

  async function sendMessage() {
    if (!input.trim() || sending || !player || !round || remaining <= 0) return

    const content = input.trim()
    setInput('')
    setSending(true)

    // Optimistic local add
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      round_id: round.id,
      persona_id: personaId,
      player_id: player.id,
      sender: 'player',
      content,
      message_number: totalMessageCount + 1,
      flagged: false,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setEntries((prev) => [...prev, { type: 'message', message: optimisticMsg }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_id: personaId,
          player_id: player.id,
          round_id: round.id,
          message: content,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'API error')

      setTyping(true)
      setSending(false)
      await new Promise((resolve) => setTimeout(resolve, data.delay_ms))
      setTyping(false)

      const personaMsg: Message = {
        id: `persona-${Date.now()}`,
        round_id: round.id,
        persona_id: personaId,
        player_id: player.id,
        sender: 'persona',
        content: data.response,
        message_number: data.message_number,
        flagged: false,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, personaMsg])

      // Build new entries: persona message + optional offer card
      const newEntries: ChatEntry[] = [{ type: 'message', message: personaMsg }]
      if (data.content_offer) {
        const offerId = `offer-${Date.now()}`
        newEntries.push({
          type: 'offer',
          offerId,
          offer: data.content_offer,
          personaContext: data.persona_context,
        })
      }
      setEntries((prev) => [...prev, ...newEntries])
    } catch (e) {
      console.error(e)
      setTyping(false)
      setSending(false)
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      setEntries((prev) => prev.filter(
        (e) => !(e.type === 'message' && e.message.id === optimisticMsg.id)
      ))
    }
  }

  async function purchaseOffer(
    offerId: string,
    offer: ContentOffer,
    personaContext: PersonaContext
  ) {
    if (!player || !round) return
    setBuyingOffer((prev) => ({ ...prev, [offerId]: true }))

    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player.id,
          persona_id: personaId,
          round_id: round.id,
          price: offer.price,
          description: offer.description,
          tier: offer.tier,
          persona_context: personaContext,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Purchase failed')

      // Update unlocked image
      setUnlockedImages((prev) => ({ ...prev, [offerId]: data.image_data }))

      // Update player credits in state + sessionStorage
      const updatedPlayer = { ...player, credits: data.credits_remaining }
      setPlayer(updatedPlayer)
      sessionStorage.setItem('player', JSON.stringify(updatedPlayer))
    } catch (e) {
      console.error(e)
    } finally {
      setBuyingOffer((prev) => ({ ...prev, [offerId]: false }))
    }
  }

  async function flagMessage(messageId: string) {
    setFlagModalId(null)
    const current = messages.find((m) => m.id === messageId)
    if (!current || current.id.startsWith('temp-') || current.id.startsWith('persona-')) return

    const newFlagged = !current.flagged
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, flagged: newFlagged } : m))
    )
    setEntries((prev) =>
      prev.map((e) =>
        e.type === 'message' && e.message.id === messageId
          ? { ...e, message: { ...e.message, flagged: newFlagged } }
          : e
      )
    )
    await fetch('/api/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId, flagged: newFlagged }),
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-gray-500">Loading chat...</div>
      </div>
    )
  }

  if (!persona) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-red-400">Persona not found</div>
      </div>
    )
  }

  const avatarColor = AVATAR_COLORS[persona.display_name] ?? '#333'
  const avatarEmoji = AVATAR_EMOJIS[persona.display_name] ?? '👤'
  const batteryColor = batteryPct > 50 ? '#22c55e' : batteryPct > 20 ? '#f59e0b' : '#ff2d78'

  return (
    <div className="flex flex-col h-dvh" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: '#111', borderBottom: '1px solid #222' }}
      >
        <button
          onClick={() => router.push('/lobby')}
          className="text-gray-400 text-xl leading-none p-1 -ml-1"
        >
          ←
        </button>

        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: avatarColor }}
        >
          {avatarEmoji}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{persona.display_name}</p>
          <p className="text-gray-500 text-xs">{persona.age} · {persona.location}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Credits */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: '#1a1a1a', border: '1px solid #333' }}
          >
            <span className="text-yellow-400 text-xs">💰</span>
            <span className="text-white font-bold text-xs">{player?.credits ?? 0}</span>
          </div>

          {/* Battery message counter */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs" style={{ color: batteryColor }}>
              {remaining} left
            </span>
            <div
              className="w-10 h-1.5 rounded-full overflow-hidden"
              style={{ background: '#333' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${batteryPct}%`, background: batteryColor }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2">
        {entries.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-8">
              <p className="text-gray-600 text-sm">
                Say something to {persona.display_name.split(' ')[0]}...
              </p>
            </div>
          </div>
        )}

        {entries.map((entry) => {
          if (entry.type === 'message') {
            return (
              <MessageBubble
                key={entry.message.id}
                message={entry.message}
                onLongPress={(id) => setFlagModalId(id)}
              />
            )
          }
          return (
            <ContentCard
              key={entry.offerId}
              offer={entry.offer}
              onPurchase={() => purchaseOffer(entry.offerId, entry.offer, entry.personaContext)}
              unlockedImage={unlockedImages[entry.offerId]}
              buying={buyingOffer[entry.offerId] ?? false}
              playerCredits={player?.credits ?? 0}
            />
          )
        })}

        {typing && <TypingIndicator />}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Remaining = 0 overlay */}
      {remaining <= 0 && (
        <div
          className="mx-4 mb-2 px-4 py-3 rounded-2xl text-center text-sm"
          style={{ background: '#1a1a1a', border: '1px solid #ff2d7840' }}
        >
          <span style={{ color: '#ff2d78' }}>Chat limit reached.</span>
          <span className="text-gray-400"> Go back to lobby to submit verdicts.</span>
        </div>
      )}

      {/* Input */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ background: '#111', borderTop: '1px solid #1f1f1f' }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending || typing || remaining <= 0}
          placeholder={remaining <= 0 ? 'No messages left' : `Message ${persona.display_name.split(' ')[0]}...`}
          className="flex-1 px-4 py-2.5 rounded-full text-sm text-white outline-none disabled:opacity-40"
          style={{
            background: '#1f1f1f',
            border: '1px solid #2a2a2a',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending || typing || remaining <= 0}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all active:scale-90 disabled:opacity-30"
          style={{ background: '#ff2d78' }}
        >
          ↑
        </button>
      </div>

      {/* Flag modal */}
      {flagModalId && (
        <div
          className="fixed inset-0 flex items-end justify-center z-50"
          style={{ background: '#00000080' }}
          onClick={() => setFlagModalId(null)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl p-6 flex flex-col gap-3"
            style={{ background: '#1a1a1a' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white font-semibold text-center">Message Options</p>
            <button
              onClick={() => flagMessage(flagModalId)}
              className="w-full py-3 rounded-2xl font-medium text-sm"
              style={{ background: '#2a2a2a', color: '#facc15' }}
            >
              📌 {messages.find((m) => m.id === flagModalId)?.flagged ? 'Unflag message' : 'Flag as suspicious'}
            </button>
            <button
              onClick={() => setFlagModalId(null)}
              className="w-full py-3 rounded-2xl font-medium text-sm"
              style={{ background: '#111', color: '#888' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
