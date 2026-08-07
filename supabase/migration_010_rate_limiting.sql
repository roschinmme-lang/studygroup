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
