-- Tutorial SDK: Database tables for tutorial progress tracking
-- Copy this file to your supabase/migrations/ directory and apply.

-- Tutorial progress: tracks per-user completion and step progress
create table if not exists tutorial_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tutorial_id text not null,
  current_step int not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, tutorial_id)
);

-- Tutorial user state: tracks first-login prompt and preferences
create table if not exists tutorial_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_login_prompt_shown boolean not null default false,
  first_login_prompt_response text check (first_login_prompt_response in ('accepted', 'declined')),
  created_at timestamptz not null default now()
);

-- Row Level Security: users can only access their own rows
alter table tutorial_progress enable row level security;
alter table tutorial_user_state enable row level security;

create policy "Users can read own tutorial progress"
  on tutorial_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own tutorial progress"
  on tutorial_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tutorial progress"
  on tutorial_progress for update
  using (auth.uid() = user_id);

create policy "Users can read own tutorial state"
  on tutorial_user_state for select
  using (auth.uid() = user_id);

create policy "Users can insert own tutorial state"
  on tutorial_user_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tutorial state"
  on tutorial_user_state for update
  using (auth.uid() = user_id);
