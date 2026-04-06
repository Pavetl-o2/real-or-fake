import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const CREDITS_CORRECT_REAL = 150
const CREDITS_CORRECT_FAKE = 200
const CREDITS_WRONG = -100

export async function POST(req: NextRequest) {
  const { round_id, player_id, verdicts } = await req.json()
  // verdicts: { [persona_id]: 'real' | 'fake' }

  if (!round_id || !player_id || !verdicts) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Load personas for this round
  const { data: round } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', round_id)
    .single()

  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  const { data: personas } = await supabase
    .from('personas')
    .select('id, is_real, display_name')
    .in('id', round.persona_ids)

  if (!personas) return NextResponse.json({ error: 'Personas not found' }, { status: 500 })

  let totalDelta = 0
  const results: Record<string, { correct: boolean; credits_delta: number; is_real: boolean; display_name: string }> = {}

  for (const persona of personas) {
    const verdict = verdicts[persona.id]
    if (!verdict) continue

    const correct =
      (verdict === 'real' && persona.is_real) ||
      (verdict === 'fake' && !persona.is_real)

    let delta = 0
    if (correct) {
      delta = persona.is_real ? CREDITS_CORRECT_REAL : CREDITS_CORRECT_FAKE
    } else {
      delta = CREDITS_WRONG
    }

    totalDelta += delta
    results[persona.id] = {
      correct,
      credits_delta: delta,
      is_real: persona.is_real,
      display_name: persona.display_name,
    }
  }

  // Update round
  await supabase
    .from('rounds')
    .update({ verdicts, results, status: 'complete' })
    .eq('id', round_id)

  // Update player credits
  const { data: player } = await supabase
    .from('players')
    .select('credits, scam_count')
    .eq('id', player_id)
    .single()

  if (player) {
    const newCredits = Math.max(0, player.credits + totalDelta)
    const scamsGottten = Object.values(results).filter((r) => !r.correct && !r.is_real).length
    await supabase
      .from('players')
      .update({
        credits: newCredits,
        scam_count: player.scam_count + scamsGottten,
      })
      .eq('id', player_id)
  }

  return NextResponse.json({ results, total_delta: totalDelta })
}
