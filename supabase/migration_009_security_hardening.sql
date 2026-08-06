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

create or replace function public.report_and_quarantine(
  p_target_type text,
  p_target_id uuid,
  p_reason_label text,
  p_target_snippet text,
  p_device text
) returns void as $$
begin
  if p_target_type = 'post' then
    update posts set quarantined = true where id = p_target_id;
  elsif p_target_type = 'vibe' then
    update vibes set quarantined = true where id = p_target_id;
  else
    raise exception 'Invalid target type: %', p_target_type;
  end if;

  insert into mod_log (reason_label, target_snippet, device, lockout)
  values (p_reason_label, p_target_snippet, p_device, 'Content permanently quarantined \u2022 kill-switch engaged');
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.report_and_quarantine(text, uuid, text, text, text) to authenticated;

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
