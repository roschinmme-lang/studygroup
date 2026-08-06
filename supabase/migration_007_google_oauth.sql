-- ------------------------------------------------------------------
-- studygroup.ph — migration 007: Google OAuth login
--
-- Google OAuth verifies the person actually owns the account they're
-- signing in with. Since Google doesn't give us academic tier or
-- school, first-time Google sign-ins land on a short onboarding step
-- in the app to fill those in — this migration adds the `onboarded`
-- flag the trigger and app use to know whether that step is still
-- needed.
--
-- Existing accounts (created via email/password signup) default to
-- onboarded = true, since they already picked a tier during signup.
-- ------------------------------------------------------------------

alter table profiles add column if not exists onboarded boolean not null default true;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  has_tier boolean;
  derived_name text;
begin
  if new.email !~* '^[^@\s]+@gmail\.com$' then
    raise exception 'Only gmail.com addresses can sign up for Studygroup.';
  end if;

  -- Email/password signups pass tier/school as metadata up front, so
  -- they're already fully onboarded. Google OAuth signups don't have
  -- that metadata, so they land with onboarded = false and the app
  -- prompts for the missing fields on first login.
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
-- Manual setup required (this can't be done from SQL):
--
-- 1. Google Cloud Console (console.cloud.google.com):
--    - Create/select a project -> APIs & Services -> Credentials
--    - Create an OAuth 2.0 Client ID (Application type: Web application)
--    - You'll need a redirect URI from Supabase first (next step), then
--      add it under "Authorized redirect URIs" here.
--
-- 2. Supabase Dashboard -> Authentication -> Providers -> Google:
--    - Toggle it on
--    - Copy the "Redirect URL" Supabase shows you — paste that into the
--      Google Cloud OAuth client's Authorized redirect URIs (step 1)
--    - Paste your Google OAuth Client ID and Client Secret into Supabase
--    - Save
--
-- 3. Supabase Dashboard -> Authentication -> URL Configuration:
--    - Site URL: your production URL (e.g. https://studygroup-xyz.vercel.app)
--    - Redirect URLs: add both http://localhost:5173 and your production URL
-- ------------------------------------------------------------------
