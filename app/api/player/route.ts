import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const ADJECTIVES = ['Sly', 'Wary', 'Sharp', 'Bold', 'Clever', 'Sneaky', 'Wise', 'Slick']
const NOUNS = ['Detective', 'Hunter', 'Scout', 'Hawk', 'Wolf', 'Fox', 'Shark', 'Eagle']

function randomUsername() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 9000) + 1000
  return `${adj}${noun}${num}`
}

export async function POST(_req: NextRequest) {
  const supabase = createServerClient()

  const { data: player, error } = await supabase
    .from('players')
    .insert({ username: randomUsername() })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ player })
}
