-- ------------------------------------------------------------------
-- studygroup.ph — migration 014: lock down profile self-escalation
--
-- Found in review: the "update your own profile" policy only checked
-- WHOSE row was being changed, not WHICH fields — so any signed-in
-- user could set is_mentor = true on themselves (becoming the account
-- minors get routed to for "Message Mentor"), or a JHS account could
-- set tier = 'UNI' / minor = false on itself to remove the View-Only
-- restriction and the "can't be DM'd by adults" protection. All of
-- that was one authenticated API call away — no exploit tooling
-- needed, just a normal request with a different JSON body than the
-- app sends.
--
-- Fixed with a trigger that silently reverts any client attempt to:
--   - change is_mentor at all (only settable via direct SQL by you)
--   - change tier/minor/tier_label/color after onboarding is complete
--     (they're meant to be chosen once, during signup or the Google
--     onboarding step, then locked — same as the email/password flow
--     already worked, which only ever set tier once via signup
--     metadata with no UI to change it afterward)
-- ------------------------------------------------------------------

create or replace function public.protect_profile_fields()
returns trigger as $$
begin
  if new.is_mentor is distinct from old.is_mentor then
    new.is_mentor := old.is_mentor;
  end if;

  if old.onboarded = true and (
    new.tier is distinct from old.tier or new.minor is distinct from old.minor
  ) then
    new.tier := old.tier;
    new.tier_label := old.tier_label;
    new.minor := old.minor;
    new.color := old.color;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_protect_profile_fields on profiles;
create trigger trg_protect_profile_fields
  before update on profiles
  for each row execute function public.protect_profile_fields();

-- ------------------------------------------------------------------
-- Smaller, lower-severity finding from the same review: the
-- notifications "mark as read" policy could let a user rewrite any
-- field on their own notification rows (which type it is, who it's
-- from, which post it points to) — not a privilege escalation or
-- cross-user issue since it only touches their own inbox, but there's
-- no reason to allow it. Locked to only the `read` flag.
-- ------------------------------------------------------------------

create or replace function public.protect_notification_fields()
returns trigger as $$
begin
  new.recipient_id := old.recipient_id;
  new.actor_id := old.actor_id;
  new.type := old.type;
  new.post_id := old.post_id;
  new.message_id := old.message_id;
  new.created_at := old.created_at;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_protect_notification_fields on notifications;
create trigger trg_protect_notification_fields
  before update on notifications
  for each row execute function public.protect_notification_fields();
