-- ------------------------------------------------------------------
-- studygroup.ph — migration 011: voice calls (WebRTC)
--
-- Real 1:1 calling using WebRTC for the actual audio, with this table
-- used purely for signaling (exchanging the SDP offer/answer needed to
-- set up the peer connection) and call state (ringing/accepted/etc).
-- ICE candidates are exchanged over a Supabase Realtime broadcast
-- channel keyed by call id, not stored here (they're numerous and
-- short-lived, a DB row per candidate would be wasteful).
--
-- `call_type` supports 'video' too, so this table doesn't need to
-- change when video calling is added later — only the client UI does.
-- ------------------------------------------------------------------

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references profiles(id) on delete cascade,
  callee_id uuid not null references profiles(id) on delete cascade,
  call_type text not null default 'audio' check (call_type in ('audio', 'video')),
  status text not null default 'ringing' check (status in ('ringing', 'accepted', 'declined', 'ended', 'missed')),
  offer_sdp jsonb,
  answer_sdp jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table calls enable row level security;

create policy "Participants can read their own calls"
  on calls for select using (auth.uid() = caller_id or auth.uid() = callee_id);
create policy "Users can start a call as the caller"
  on calls for insert with check (auth.uid() = caller_id);
create policy "Participants can update their own call"
  on calls for update using (auth.uid() = caller_id or auth.uid() = callee_id);

alter publication supabase_realtime add table calls;

-- Rate limit: max 10 calls started per 10 minutes per caller, using the
-- same generic rate-limit machinery from migration 010.
create or replace function public.rl_check_call() returns trigger as $$
begin
  perform public.enforce_rate_limit('call', 10, 600, 'starting calls');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rl_call on calls;
create trigger trg_rl_call before insert on calls for each row execute function public.rl_check_call();
