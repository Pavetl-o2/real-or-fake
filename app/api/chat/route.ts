import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { persona_id, player_id, round_id, message } = await req.json()

  if (!persona_id || !player_id || !round_id || !message?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Load persona
  const { data: persona, error: personaError } = await supabase
    .from('personas')
    .select('*')
    .eq('id', persona_id)
    .single()

  if (personaError || !persona) {
    return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
  }

  // Load last 20 messages for context
  const { data: history } = await supabase
    .from('messages')
    .select('sender, content, message_number')
    .eq('round_id', round_id)
    .eq('persona_id', persona_id)
    .order('message_number', { ascending: true })
    .limit(20)

  // Count existing messages to determine message_number
  const { count: msgCount } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('round_id', round_id)
    .eq('persona_id', persona_id)

  const nextPlayerMsgNum = (msgCount ?? 0) + 1

  // Save player message first
  await supabase.from('messages').insert({
    round_id,
    persona_id,
    player_id,
    sender: 'player',
    content: message.trim(),
    message_number: nextPlayerMsgNum,
  })

  // Build OpenRouter messages array
  const chatHistory = (history ?? []).map((m) => ({
    role: m.sender === 'player' ? 'user' : 'assistant',
    content: m.content,
  }))

  const openRouterMessages = [
    ...chatHistory,
    { role: 'user', content: message.trim() },
  ]

  // Call OpenRouter
  const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://real-or-fake.vercel.app',
      'X-Title': 'Real or Fake?',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: persona.system_prompt ?? '' },
        ...openRouterMessages,
      ],
      max_tokens: 200,
      temperature: 0.9,
    }),
  })

  if (!openRouterRes.ok) {
    const errText = await openRouterRes.text()
    console.error('OpenRouter error:', errText)
    return NextResponse.json({ error: 'AI service error' }, { status: 502 })
  }

  const aiData = await openRouterRes.json()
  const responseText: string =
    aiData.choices?.[0]?.message?.content?.trim() ?? '...'

  const personaMsgNum = nextPlayerMsgNum + 1

  // Save persona response
  await supabase.from('messages').insert({
    round_id,
    persona_id,
    player_id,
    sender: 'persona',
    content: responseText,
    message_number: personaMsgNum,
  })

  // Simulate realistic delay based on is_real
  const delay_ms = persona.is_real
    ? Math.floor(Math.random() * 12000) + 3000   // 3–15s for real
    : Math.floor(Math.random() * 2500) + 1500     // 1.5–4s for fake/bot

  return NextResponse.json({
    response: responseText,
    message_number: personaMsgNum,
    delay_ms,
  })
}
