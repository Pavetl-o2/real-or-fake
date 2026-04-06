import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { message_id, flagged } = await req.json()
  if (!message_id) return NextResponse.json({ error: 'Missing message_id' }, { status: 400 })

  const supabase = createServerClient()
  const { error } = await supabase
    .from('messages')
    .update({ flagged: flagged ?? true })
    .eq('id', message_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
