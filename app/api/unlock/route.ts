import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

type PersonaContext = {
  name: string
  age: number | null
  location: string | null
  is_real: boolean
}

function buildImagePrompt(persona: PersonaContext, description: string): string {
  const cleanName = persona.name.replace(/[^\w\s]/g, '').trim()
  const loc = persona.location ?? 'a beautiful location'
  return (
    `Lifestyle social media photo. ${description}. ` +
    `Young woman, ${persona.age ?? 22} years old, based in ${loc}. ` +
    `${cleanName} style influencer content. ` +
    `Candid, authentic, natural lighting, high quality photography, vibrant colors. ` +
    `No text, no watermarks, photorealistic, social media aesthetic.`
  )
}

async function generateImage(prompt: string): Promise<string> {
  const apiKey = process.env.NANO_BANANA_API_KEY
  if (!apiKey) throw new Error('Image generation not configured')

  const models = [
    'gemini-2.0-flash-preview-image-generation',
    'gemini-2.0-flash-exp',
  ]

  let lastError = 'No image returned'

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[${model}] Image generation error:`, err)
      lastError = `${model}: ${err}`
      continue
    }

    const data = await res.json()
    const parts = data.candidates?.[0]?.content?.parts ?? []
    const imgPart = parts.find((p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData)

    if (!imgPart?.inlineData) {
      lastError = `${model}: no image in response — ${JSON.stringify(data).slice(0, 200)}`
      continue
    }

    const { mimeType, data: b64 } = imgPart.inlineData
    return `data:${mimeType};base64,${b64}`
  }

  throw new Error(lastError)
}

export async function POST(req: NextRequest) {
  const { player_id, persona_id, round_id, price, description, tier, persona_context } =
    await req.json()

  if (!player_id || !persona_id || !round_id || !price || !description || !tier) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Check player has enough credits
  const { data: player, error: playerErr } = await supabase
    .from('players')
    .select('credits')
    .eq('id', player_id)
    .single()

  if (playerErr || !player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }

  if (player.credits < price) {
    return NextResponse.json({ error: 'Not enough credits' }, { status: 402 })
  }

  // Generate image before charging (don't charge if it fails)
  let image_data: string
  try {
    const prompt = buildImagePrompt(persona_context as PersonaContext, description)
    image_data = await generateImage(prompt)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Image gen failed:', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Deduct credits
  const newCredits = player.credits - price
  await supabase
    .from('players')
    .update({ credits: newCredits })
    .eq('id', player_id)

  // Record unlock (store a marker, not the full image, to keep DB light)
  await supabase.from('unlocks').insert({
    player_id,
    persona_id,
    round_id,
    tier,
    credits_spent: price,
    was_real: (persona_context as PersonaContext).is_real ?? null,
    troll_image_url: 'generated',
  })

  return NextResponse.json({ image_data, credits_remaining: newCredits })
}
