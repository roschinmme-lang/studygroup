-- ------------------------------------------------------------------
-- studygroup.ph — Supabase schema
-- Run this once in your project's SQL Editor (Supabase Dashboard ->
-- SQL Editor -> New query -> paste -> Run).
-- ------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  tier text not null check (tier in ('JHS','SHS','UNI')),
  tier_label text not null,
  school text,
  initials text,
  color text,
  minor boolean not null default false,
  is_mentor boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  squad text default 'Your feed',
  quarantined boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists mod_log (
  id uuid primary key default gen_random_uuid(),
  reason_label text not null,
  target_snippet text,
  device text,
  lockout text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------

alter table profiles enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table post_likes enable row level security;
alter table mod_log enable row level security;

-- Profiles: any signed-in user can read profiles (needed to show author
-- names/avatars), but you can only create or edit your own row. This is
-- also what backs "one account per person" alongside Supabase Auth's
-- built-in unique-email constraint.
create policy "Profiles are viewable by authenticated users"
  on profiles for select using (auth.role() = 'authenticated');
create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Posts: readable by anyone signed in, only the author can create their
-- own post. Update is left open to any authenticated user so the
-- report/quarantine kill-switch can flip `quarantined` to true from the
-- client for this prototype. (In production you'd move that behind a
-- server-side function instead of a direct client update.)
create policy "Posts are viewable by authenticated users"
  on posts for select using (auth.role() = 'authenticated');
create policy "Users can create their own posts"
  on posts for insert with check (auth.uid() = author_id);
create policy "Authenticated users can quarantine posts"
  on posts for update using (auth.role() = 'authenticated');

-- Comments
create policy "Comments are viewable by authenticated users"
  on comments for select using (auth.role() = 'authenticated');
create policy "Users can add their own comments"
  on comments for insert with check (auth.uid() = author_id);

-- Likes
create policy "Likes are viewable by authenticated users"
  on post_likes for select using (auth.role() = 'authenticated');
create policy "Users can like as themselves"
  on post_likes for insert with check (auth.uid() = user_id);
create policy "Users can remove their own like"
  on post_likes for delete using (auth.uid() = user_id);

-- Moderation log: visible to everyone signed in; any authenticated user
-- can write an entry, since in this prototype reporting writes directly
-- to the log. (In production, route this through a server-side function
-- so users can't tamper with the log itself.)
create policy "Mod log viewable by authenticated users"
  on mod_log for select using (auth.role() = 'authenticated');
create policy "Authenticated users can write mod log entries"
  on mod_log for insert with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------------
-- Realtime (optional but recommended): lets the feed update live when
-- another browser/tab posts, comments, likes, or triggers a quarantine.
-- If this line errors because the publication already includes a table,
-- just enable Realtime per table instead via Dashboard -> Database ->
-- Replication.
-- ------------------------------------------------------------------
alter publication supabase_realtime add table posts, comments, post_likes, mod_log;

-- ------------------------------------------------------------------
-- Squads, membership, and direct messages
-- ------------------------------------------------------------------

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

create policy "Squads are viewable by authenticated users"
  on squads for select using (auth.role() = 'authenticated');
create policy "Authenticated users can create squads"
  on squads for insert with check (auth.role() = 'authenticated');

create policy "Squad membership viewable by authenticated users"
  on squad_members for select using (auth.role() = 'authenticated');
create policy "Users can join a squad as themselves"
  on squad_members for insert with check (auth.uid() = user_id);
create policy "Users can leave a squad as themselves"
  on squad_members for delete using (auth.uid() = user_id);

create policy "Users can read their own conversations"
  on messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users can send messages as themselves"
  on messages for insert with check (auth.uid() = sender_id);

insert into squads (name, description) values
  ('BSIT Thesis Support Group', 'Capstone help, ERDs, defense prep.'),
  ('STEM Research Buddies', 'Research topics, GIS, lab partners.'),
  ('Architecture Design Reviews', 'Plate crits, scale checks, references.')
on conflict (name) do nothing;

alter publication supabase_realtime add table squads, squad_members, messages;

-- ------------------------------------------------------------------
-- To designate a mentor account (needed for the "Message Mentor" button):
-- 1. Sign up a normal account through the app for whoever will be the mentor.
-- 2. Run this, swapping in their email:
--
--    update profiles set is_mentor = true where email = 'mentor@example.com';
-- ------------------------------------------------------------------
