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
  onboarded boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  squad text default 'Your feed',
  quarantined boolean not null default false,
  image_url text,
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

-- ------------------------------------------------------------------
-- Post images (Supabase Storage)
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "Public read access to post images"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "Authenticated users can upload post images"
  on storage.objects for insert
  with check (bucket_id = 'post-images' and auth.role() = 'authenticated');

create policy "Users can delete their own post images"
  on storage.objects for delete
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- ------------------------------------------------------------------
-- Notifications (created by triggers, not by the client)
-- ------------------------------------------------------------------

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  actor_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'message')),
  post_id uuid references posts(id) on delete cascade,
  message_id uuid references messages(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "Users can read their own notifications"
  on notifications for select using (auth.uid() = recipient_id);
create policy "Users can mark their own notifications read"
  on notifications for update using (auth.uid() = recipient_id);

create or replace function notify_on_like() returns trigger as $$
declare
  post_author uuid;
begin
  select author_id into post_author from posts where id = new.post_id;
  if post_author is not null and post_author <> new.user_id then
    insert into notifications (recipient_id, actor_id, type, post_id)
    values (post_author, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_on_like on post_likes;
create trigger trg_notify_on_like
  after insert on post_likes
  for each row execute function notify_on_like();

create or replace function notify_on_comment() returns trigger as $$
declare
  post_author uuid;
begin
  select author_id into post_author from posts where id = new.post_id;
  if post_author is not null and post_author <> new.author_id then
    insert into notifications (recipient_id, actor_id, type, post_id)
    values (post_author, new.author_id, 'comment', new.post_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_on_comment on comments;
create trigger trg_notify_on_comment
  after insert on comments
  for each row execute function notify_on_comment();

create or replace function notify_on_message() returns trigger as $$
begin
  if new.recipient_id <> new.sender_id then
    insert into notifications (recipient_id, actor_id, type, message_id)
    values (new.recipient_id, new.sender_id, 'message', new.id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_on_message on messages;
create trigger trg_notify_on_message
  after insert on messages
  for each row execute function notify_on_message();

alter publication supabase_realtime add table notifications;

-- ------------------------------------------------------------------
-- Auto-create a profile row on signup (works whether or not email
-- confirmation is required, since there's no session yet at signup
-- time when confirmation is on). See migration_005 for the full
-- explanation.
-- ------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger as $$
declare
  has_tier boolean;
  derived_name text;
begin
  if new.email !~* '^[^@\s]+@gmail\.com$' then
    raise exception 'Only gmail.com addresses can sign up for Studygroup.';
  end if;

  has_tier := (new.raw_user_meta_data ? 'tier');
  derived_name := coalesce(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, name, email, tier, tier_label, school, initials, color, minor, is_mentor, onboarded)
  values (
    new.id,
    derived_name,
    new.email,
    coalesce(new.raw_user_meta_data->>'tier', 'UNI'),
    coalesce(new.raw_user_meta_data->>'tier_label', 'University'),
    coalesce(new.raw_user_meta_data->>'school', 'Not specified'),
    coalesce(new.raw_user_meta_data->>'initials', upper(left(derived_name, 2))),
    coalesce(new.raw_user_meta_data->>'color', '#FFD000'),
    coalesce((new.raw_user_meta_data->>'minor')::boolean, false),
    false,
    has_tier
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------
-- Real Vibes Feed: uploaded videos, real Q&A comments
-- ------------------------------------------------------------------

create table if not exists vibes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  video_url text not null,
  title text not null,
  subject text,
  quarantined boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists vibe_comments (
  id uuid primary key default gen_random_uuid(),
  vibe_id uuid not null references vibes(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table vibes enable row level security;
alter table vibe_comments enable row level security;

create policy "Vibes are viewable by authenticated users"
  on vibes for select using (auth.role() = 'authenticated');
create policy "Users can post their own vibes"
  on vibes for insert with check (auth.uid() = author_id);
create policy "Authenticated users can quarantine vibes"
  on vibes for update using (auth.role() = 'authenticated');

create policy "Vibe comments viewable by authenticated users"
  on vibe_comments for select using (auth.role() = 'authenticated');
create policy "Users can add their own vibe comments"
  on vibe_comments for insert with check (auth.uid() = author_id);

insert into storage.buckets (id, name, public)
values ('vibe-videos', 'vibe-videos', true)
on conflict (id) do nothing;

create policy "Public read access to vibe videos"
  on storage.objects for select
  using (bucket_id = 'vibe-videos');

create policy "Authenticated users can upload vibe videos"
  on storage.objects for insert
  with check (bucket_id = 'vibe-videos' and auth.role() = 'authenticated');

create policy "Users can delete their own vibe videos"
  on storage.objects for delete
  using (bucket_id = 'vibe-videos' and auth.uid()::text = (storage.foldername(name))[1]);

alter publication supabase_realtime add table vibes, vibe_comments;
-- ------------------------------------------------------------------
-- studygroup.ph — migration 009: security hardening
--
-- Fixes four real issues found in review:
--
-- 1. The "quarantine" UPDATE policies on posts/vibes checked WHO was
--    making the request, not WHAT they were changing — any signed-in
--    user could rewrite someone else's post content, image, or squad,
--    not just flip the quarantine flag. Fixed by replacing direct
--    client UPDATE access with a single narrow RPC function that only
--    ever sets quarantined = true, paired with the mod_log write.
--
-- 2. mod_log had an open INSERT policy for any authenticated user,
--    letting anyone write arbitrary fake entries (impersonated device
--    info, fabricated reasons) unrelated to any real moderation event.
--    Fixed the same way — only the RPC below can write to mod_log now.
--
-- 3. profiles.email was readable by any signed-in user via the API,
--    even though the UI never displayed it. Fixed by revoking column
--    access; your own email now comes from the Auth session instead.
--
-- 4. Storage buckets had no server-side file-size/type limits — the
--    8MB/50MB checks only existed in the browser and could be bypassed
--    by calling the Storage API directly. Fixed by setting limits on
--    the buckets themselves.
-- ------------------------------------------------------------------

-- 1 & 2: atomic report-and-quarantine RPC, replacing direct client
-- UPDATE/INSERT access.

drop policy if exists "Authenticated users can quarantine posts" on posts;
drop policy if exists "Authenticated users can quarantine vibes" on vibes;
drop policy if exists "Authenticated users can write mod log entries" on mod_log;



-- 3: restrict email column access. Everyone signed in can still see
-- everyone else's name/tier/school/etc for the app to work, but not
-- their email address.

revoke select on profiles from authenticated;
grant select (id, name, tier, tier_label, school, initials, color, minor, is_mentor, onboarded, created_at)
  on profiles to authenticated;

-- 4: enforce file-size and mime-type limits server-side, matching the
-- client-side checks (8MB images, 50MB videos).

update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
where id = 'post-images';

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']
where id = 'vibe-videos';

-- ------------------------------------------------------------------
-- Recommended dashboard settings (can't be done from SQL):
--
-- Authentication -> Rate Limits: review/lower the defaults for sign-ups
-- and sign-ins if you're worried about abuse from a public link.
--
-- Authentication -> Policies (or Auth settings, depending on dashboard
-- version): consider enabling a minimum password strength check beyond
-- the app's own 8-character minimum.
--
-- Known limitation this migration does NOT fix: there's no rate
-- limiting on posting, commenting, liking, or messaging — a signed-in
-- user could still spam actions quickly. That needs an Edge Function
-- or similar server-side throttle, which is a bigger addition than a
-- SQL migration; flag if you want that built next.
-- ------------------------------------------------------------------
-- ------------------------------------------------------------------
-- studygroup.ph — migration 010: rate limiting
--
-- Database-level throttling on the actions that were previously
-- unlimited (posting, commenting, liking, messaging, posting Reels,
-- creating/joining squads, reporting). Enforced with BEFORE INSERT
-- triggers, so it applies no matter what calls the API — the app, a
-- script, or someone hitting Supabase directly. No Edge Function or
-- extra infrastructure needed, just SQL like everything else here.
--
-- Limits are deliberately generous for a real person using the app
-- normally, and tight enough to stop a script from spamming.
-- ------------------------------------------------------------------

create table if not exists rate_limit_log (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_log_lookup on rate_limit_log (user_id, action, created_at);

-- No RLS policies on purpose: this table isn't meant to be readable or
-- writable via the API at all, only through the SECURITY DEFINER
-- function below, which bypasses RLS as the function owner.
alter table rate_limit_log enable row level security;

create or replace function public.enforce_rate_limit(
  p_action text,
  p_max_count int,
  p_window_seconds int,
  p_friendly_label text default null
) returns void as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from rate_limit_log
  where user_id = auth.uid()
    and action = p_action
    and created_at > now() - (p_window_seconds || ' seconds')::interval;

  if recent_count >= p_max_count then
    raise exception 'You are % too quickly. Please wait a bit and try again.', coalesce(p_friendly_label, p_action);
  end if;

  insert into rate_limit_log (user_id, action) values (auth.uid(), p_action);

  -- Opportunistic cleanup instead of a scheduled job (no pg_cron setup
  -- required) — roughly 1 in 100 calls prunes anything over a day old.
  if random() < 0.01 then
    delete from rate_limit_log where created_at < now() - interval '1 day';
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- ---- Posts: 10 per 5 minutes ----
create or replace function public.rl_check_post() returns trigger as $$
begin
  perform public.enforce_rate_limit('post', 10, 300, 'posting');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_post on posts;
create trigger trg_rl_post before insert on posts for each row execute function public.rl_check_post();

-- ---- Comments: 20 per 5 minutes ----
create or replace function public.rl_check_comment() returns trigger as $$
begin
  perform public.enforce_rate_limit('comment', 20, 300, 'commenting');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_comment on comments;
create trigger trg_rl_comment before insert on comments for each row execute function public.rl_check_comment();

-- ---- Vibe comments (Q&A): 20 per 5 minutes ----
create or replace function public.rl_check_vibe_comment() returns trigger as $$
begin
  perform public.enforce_rate_limit('vibe_comment', 20, 300, 'commenting');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_vibe_comment on vibe_comments;
create trigger trg_rl_vibe_comment before insert on vibe_comments for each row execute function public.rl_check_vibe_comment();

-- ---- Likes: 60 per 5 minutes ----
create or replace function public.rl_check_like() returns trigger as $$
begin
  perform public.enforce_rate_limit('like', 60, 300, 'liking posts');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_like on post_likes;
create trigger trg_rl_like before insert on post_likes for each row execute function public.rl_check_like();

-- ---- Reels (vibes): 5 per hour — larger uploads, tighter limit ----
create or replace function public.rl_check_vibe() returns trigger as $$
begin
  perform public.enforce_rate_limit('vibe', 5, 3600, 'posting Reels');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_vibe on vibes;
create trigger trg_rl_vibe before insert on vibes for each row execute function public.rl_check_vibe();

-- ---- Messages: 30 per 5 minutes ----
create or replace function public.rl_check_message() returns trigger as $$
begin
  perform public.enforce_rate_limit('message', 30, 300, 'messaging');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_message on messages;
create trigger trg_rl_message before insert on messages for each row execute function public.rl_check_message();

-- ---- Creating squads: 5 per hour ----
create or replace function public.rl_check_squad_create() returns trigger as $$
begin
  perform public.enforce_rate_limit('squad_create', 5, 3600, 'creating squads');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_squad_create on squads;
create trigger trg_rl_squad_create before insert on squads for each row execute function public.rl_check_squad_create();

-- ---- Joining squads: 20 per hour ----
create or replace function public.rl_check_squad_join() returns trigger as $$
begin
  perform public.enforce_rate_limit('squad_join', 20, 3600, 'joining squads');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_squad_join on squad_members;
create trigger trg_rl_squad_join before insert on squad_members for each row execute function public.rl_check_squad_join();

-- ---- Reports: 20 per hour, enforced inside report_and_quarantine itself
-- (that function is called via RPC, not a table INSERT, so a trigger
-- doesn't apply — the check is added directly to the function body).
create or replace function public.report_and_quarantine(
  p_target_type text,
  p_target_id uuid,
  p_reason_label text,
  p_target_snippet text,
  p_device text
) returns void as $$
begin
  perform public.enforce_rate_limit('report', 20, 3600, 'reporting content');

  if p_target_type = 'post' then
    update posts set quarantined = true where id = p_target_id;
  elsif p_target_type = 'vibe' then
    update vibes set quarantined = true where id = p_target_id;
  else
    raise exception 'Invalid target type: %', p_target_type;
  end if;

  insert into mod_log (reason_label, target_snippet, device, lockout)
  values (p_reason_label, p_target_snippet, p_device, 'Content permanently quarantined - kill-switch engaged');
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.report_and_quarantine(text, uuid, text, text, text) to authenticated;

-- ------------------------------------------------------------------
-- studygroup.ph — migration 010: rate limiting
--
-- Database-level throttling on the actions that were previously
-- unlimited (posting, commenting, liking, messaging, posting Reels,
-- creating/joining squads, reporting). Enforced with BEFORE INSERT
-- triggers, so it applies no matter what calls the API — the app, a
-- script, or someone hitting Supabase directly. No Edge Function or
-- extra infrastructure needed, just SQL like everything else here.
--
-- Limits are deliberately generous for a real person using the app
-- normally, and tight enough to stop a script from spamming.
-- ------------------------------------------------------------------

create table if not exists rate_limit_log (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_log_lookup on rate_limit_log (user_id, action, created_at);

-- No RLS policies on purpose: this table isn't meant to be readable or
-- writable via the API at all, only through the SECURITY DEFINER
-- function below, which bypasses RLS as the function owner.
alter table rate_limit_log enable row level security;

create or replace function public.enforce_rate_limit(
  p_action text,
  p_max_count int,
  p_window_seconds int,
  p_friendly_label text default null
) returns void as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from rate_limit_log
  where user_id = auth.uid()
    and action = p_action
    and created_at > now() - (p_window_seconds || ' seconds')::interval;

  if recent_count >= p_max_count then
    raise exception 'You are % too quickly. Please wait a bit and try again.', coalesce(p_friendly_label, p_action);
  end if;

  insert into rate_limit_log (user_id, action) values (auth.uid(), p_action);

  -- Opportunistic cleanup instead of a scheduled job (no pg_cron setup
  -- required) — roughly 1 in 100 calls prunes anything over a day old.
  if random() < 0.01 then
    delete from rate_limit_log where created_at < now() - interval '1 day';
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- ---- Posts: 10 per 5 minutes ----
create or replace function public.rl_check_post() returns trigger as $$
begin
  perform public.enforce_rate_limit('post', 10, 300, 'posting');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_post on posts;
create trigger trg_rl_post before insert on posts for each row execute function public.rl_check_post();

-- ---- Comments: 20 per 5 minutes ----
create or replace function public.rl_check_comment() returns trigger as $$
begin
  perform public.enforce_rate_limit('comment', 20, 300, 'commenting');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_comment on comments;
create trigger trg_rl_comment before insert on comments for each row execute function public.rl_check_comment();

-- ---- Vibe comments (Q&A): 20 per 5 minutes ----
create or replace function public.rl_check_vibe_comment() returns trigger as $$
begin
  perform public.enforce_rate_limit('vibe_comment', 20, 300, 'commenting');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_vibe_comment on vibe_comments;
create trigger trg_rl_vibe_comment before insert on vibe_comments for each row execute function public.rl_check_vibe_comment();

-- ---- Likes: 60 per 5 minutes ----
create or replace function public.rl_check_like() returns trigger as $$
begin
  perform public.enforce_rate_limit('like', 60, 300, 'liking posts');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_like on post_likes;
create trigger trg_rl_like before insert on post_likes for each row execute function public.rl_check_like();

-- ---- Reels (vibes): 5 per hour — larger uploads, tighter limit ----
create or replace function public.rl_check_vibe() returns trigger as $$
begin
  perform public.enforce_rate_limit('vibe', 5, 3600, 'posting Reels');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_vibe on vibes;
create trigger trg_rl_vibe before insert on vibes for each row execute function public.rl_check_vibe();

-- ---- Messages: 30 per 5 minutes ----
create or replace function public.rl_check_message() returns trigger as $$
begin
  perform public.enforce_rate_limit('message', 30, 300, 'messaging');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_message on messages;
create trigger trg_rl_message before insert on messages for each row execute function public.rl_check_message();

-- ---- Creating squads: 5 per hour ----
create or replace function public.rl_check_squad_create() returns trigger as $$
begin
  perform public.enforce_rate_limit('squad_create', 5, 3600, 'creating squads');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_squad_create on squads;
create trigger trg_rl_squad_create before insert on squads for each row execute function public.rl_check_squad_create();

-- ---- Joining squads: 20 per hour ----
create or replace function public.rl_check_squad_join() returns trigger as $$
begin
  perform public.enforce_rate_limit('squad_join', 20, 3600, 'joining squads');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_squad_join on squad_members;
create trigger trg_rl_squad_join before insert on squad_members for each row execute function public.rl_check_squad_join();

-- ---- Reports: 20 per hour, enforced inside report_and_quarantine itself
-- (that function is called via RPC, not a table INSERT, so a trigger
-- doesn't apply — the check is added directly to the function body).
create or replace function public.report_and_quarantine(
  p_target_type text,
  p_target_id uuid,
  p_reason_label text,
  p_target_snippet text,
  p_device text
) returns void as $$
begin
  perform public.enforce_rate_limit('report', 20, 3600, 'reporting content');

  if p_target_type = 'post' then
    update posts set quarantined = true where id = p_target_id;
  elsif p_target_type = 'vibe' then
    update vibes set quarantined = true where id = p_target_id;
  else
    raise exception 'Invalid target type: %', p_target_type;
  end if;

  insert into mod_log (reason_label, target_snippet, device, lockout)
  values (p_reason_label, p_target_snippet, p_device, 'Content permanently quarantined - kill-switch engaged');
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.report_and_quarantine(text, uuid, text, text, text) to authenticated;
