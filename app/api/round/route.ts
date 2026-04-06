import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { player_id } = await req.json()
  if (!player_id) return NextResponse.json({ error: 'Missing player_id' }, { status: 400 })

  const supabase = createServerClient()

  // Get all persona IDs
  const { data: personas, error: pErr } = await supabase
    .from('personas')
    .select('id')

  if (pErr || !personas?.length) {
    return NextResponse.json({ error: 'No personas found' }, { status: 500 })
  }

  const persona_ids = personas.map((p) => p.id)

  const { data: round, error } = await supabase
    .from('rounds')
    .insert({ player_id, persona_ids })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ round })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const round_id = searchParams.get('round_id')
  if (!round_id) return NextResponse.json({ error: 'Missing round_id' }, { status: 400 })

  const supabase = createServerClient()
  const { data: round, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', round_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ round })
}
