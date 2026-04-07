export type Database = {
  public: {
    Tables: {
      personas: {
        Row: Persona
        Insert: Partial<Persona>
        Update: Partial<Persona>
      }
      players: {
        Row: Player
        Insert: Partial<Player>
        Update: Partial<Player>
      }
      rounds: {
        Row: Round
        Insert: Partial<Round>
        Update: Partial<Round>
      }
      messages: {
        Row: Message
        Insert: Partial<Message>
        Update: Partial<Message>
      }
      unlocks: {
        Row: Unlock
        Insert: Partial<Unlock>
        Update: Partial<Unlock>
      }
      shame_entries: {
        Row: ShameEntry
        Insert: Partial<ShameEntry>
        Update: Partial<ShameEntry>
      }
    }
  }
}

export type Persona = {
  id: string
  display_name: string
  is_real: boolean
  age: number | null
  location: string | null
  languages: string[]
  occupation: string | null
  personality_tags: string[] | null
  backstory: Record<string, unknown> | null
  contradictions: Record<string, unknown> | null
  image_url: string | null
  fake_archetype: string | null
  system_prompt: string | null
  difficulty_tier: string
  created_at: string
}

export type Player = {
  id: string
  username: string
  credits: number
  reputation: number
  scam_count: number
  current_title: string
  created_at: string
}

export type Round = {
  id: string
  player_id: string
  round_number: number
  persona_ids: string[]
  verdicts: Record<string, 'real' | 'fake'>
  results: Record<string, { correct: boolean; credits_delta: number }>
  status: 'active' | 'verdict' | 'complete'
  created_at: string
}

export type Message = {
  id: string
  round_id: string
  persona_id: string
  player_id: string
  sender: 'player' | 'persona'
  content: string
  message_number: number
  flagged: boolean
  created_at: string
}

export type Unlock = {
  id: string
  player_id: string
  persona_id: string
  round_id: string
  tier: string
  credits_spent: number | null
  was_real: boolean | null
  troll_image_url: string | null
  created_at: string
}

export type ShameEntry = {
  id: string
  player_id: string
  unlock_id: string
  caption: string | null
  created_at: string
}

export type ContentOffer = {
  price: number
  description: string
  tier: 'standard' | 'premium' | 'bundle'
}
