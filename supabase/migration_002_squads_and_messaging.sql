-- ------------------------------------------------------------------
-- studygroup.ph — migration 002: real squads, real DMs, mentor accounts
-- Run this in the SQL Editor AFTER schema.sql. It only adds new things
-- (IF NOT EXISTS everywhere), so it's safe even if you run it twice.
-- ------------------------------------------------------------------

alter table profiles add column if not exists is_mentor boolean not null default false;

create table if not exists squads (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists squad_members (
  squad_id uuid not null references squads(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table squads enable row level security;
alter table squad_members enable row level security;
alter table messages enable row level security;

-- Squads: anyone signed in can see and create squads.
create policy "Squads are viewable by authenticated users"
  on squads for select using (auth.role() = 'authenticated');
create policy "Authenticated users can create squads"
  on squads for insert with check (auth.role() = 'authenticated');

-- Squad membership: anyone signed in can see who's in a squad; you can
-- only join/leave as yourself.
create policy "Squad membership viewable by authenticated users"
  on squad_members for select using (auth.role() = 'authenticated');
create policy "Users can join a squad as themselves"
  on squad_members for insert with check (auth.uid() = user_id);
create policy "Users can leave a squad as themselves"
  on squad_members for delete using (auth.uid() = user_id);

-- Messages: you can only read a conversation you're part of, and only
-- send as yourself.
create policy "Users can read their own conversations"
  on messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users can send messages as themselves"
  on messages for insert with check (auth.uid() = sender_id);

-- Seed a few default squads so the list isn't empty on first run.
insert into squads (name, description) values
  ('BSIT Thesis Support Group', 'Capstone help, ERDs, defense prep.'),
  ('STEM Research Buddies', 'Research topics, GIS, lab partners.'),
  ('Architecture Design Reviews', 'Plate crits, scale checks, references.')
on conflict (name) do nothing;

-- Realtime for the new tables (safe to ignore if it errors — just enable
-- these three via Dashboard -> Database -> Replication instead).
alter publication supabase_realtime add table squads, squad_members, messages;

-- ------------------------------------------------------------------
-- To designate a mentor account (needed for the "Message Mentor" button):
-- 1. Sign up a normal account through the app for whoever will be the mentor.
-- 2. Run this, swapping in their email:
--
--    update profiles set is_mentor = true where email = 'mentor@example.com';
-- ------------------------------------------------------------------
