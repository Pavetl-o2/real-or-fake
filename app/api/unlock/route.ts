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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '4:3',
        safetyFilterLevel: 'block_some',
        personGeneration: 'allow_adult',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Image generation error:', err)
    throw new Error('Image generation failed')
  }

  const data = await res.json()
  const prediction = data.predictions?.[0]
  if (!prediction?.bytesBase64Encoded) throw new Error('No image returned')

  const mime = prediction.mimeType ?? 'image/jpeg'
  return `data:${mime};base64,${prediction.bytesBase64Encoded}`
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
    console.error('Image gen failed:', e)
    return NextResponse.json({ error: 'Could not generate image' }, { status: 502 })
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
