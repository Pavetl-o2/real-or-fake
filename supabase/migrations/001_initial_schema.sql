-- Real or Fake? — Initial Schema

create extension if not exists "pgcrypto";

-- Personas (AI or real people)
create table personas (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  is_real boolean not null,
  age int,
  location text,
  languages text[] default '{"en"}',
  occupation text,
  personality_tags text[],
  backstory jsonb,
  contradictions jsonb,
  image_url text,
  fake_archetype text,
  system_prompt text,
  difficulty_tier text default 'easy',
  created_at timestamptz default now()
);

-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  credits int default 500,
  reputation int default 0,
  scam_count int default 0,
  current_title text default 'Fresh Meat',
  created_at timestamptz default now()
);

-- Game rounds
create table rounds (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id),
  round_number int default 1,
  persona_ids uuid[] not null,
  verdicts jsonb default '{}',
  results jsonb default '{}',
  status text default 'active',
  created_at timestamptz default now()
);

-- Chat messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id),
  persona_id uuid references personas(id),
  player_id uuid references players(id),
  sender text not null check (sender in ('player', 'persona')),
  content text not null,
  message_number int not null,
  flagged boolean default false,
  created_at timestamptz default now()
);

-- Content unlocks
create table unlocks (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id),
  persona_id uuid references personas(id),
  round_id uuid references rounds(id),
  tier text default 'standard',
  credits_spent int,
  was_real boolean,
  troll_image_url text,
  created_at timestamptz default now()
);

-- Hall of Shame entries
create table shame_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id),
  unlock_id uuid references unlocks(id),
  caption text,
  created_at timestamptz default now()
);

-- Indexes
create index messages_round_persona_idx on messages(round_id, persona_id);
create index messages_round_idx on messages(round_id);
create index rounds_player_idx on rounds(player_id);
