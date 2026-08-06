-- ------------------------------------------------------------------
-- studygroup.ph — migration 005: real email confirmation
--
-- Why this is needed: once "Confirm email" is turned on in Supabase,
-- there is no active session between signUp() and the user clicking
-- the confirmation link in their inbox. The old flow inserted the
-- profile row from the client right after signUp() — but with no
-- session yet, that insert would be rejected by RLS.
--
-- The fix: create the profile automatically via a trigger on
-- auth.users, using SECURITY DEFINER so it runs regardless of RLS or
-- session state. The client passes the profile fields as signup
-- metadata (options.data), and this trigger reads them from
-- new.raw_user_meta_data.
-- ------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, tier, tier_label, school, initials, color, minor, is_mentor)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'tier', 'UNI'),
    coalesce(new.raw_user_meta_data->>'tier_label', 'University'),
    coalesce(new.raw_user_meta_data->>'school', 'Not specified'),
    coalesce(new.raw_user_meta_data->>'initials', upper(left(new.email, 2))),
    coalesce(new.raw_user_meta_data->>'color', '#FFD000'),
    coalesce((new.raw_user_meta_data->>'minor')::boolean, false),
    false
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
-- After running this, go turn "Confirm email" back ON:
-- Supabase Dashboard -> Authentication -> Providers -> Email -> toggle
-- ON "Confirm email" -> Save.
--
-- Also set your Site URL and Redirect URLs so confirmation links work
-- correctly for both local dev and your deployed app:
-- Supabase Dashboard -> Authentication -> URL Configuration ->
--   Site URL: your production URL (e.g. https://studygroup-xyz.vercel.app)
--   Redirect URLs: add both http://localhost:5173 and your production URL
--
-- Accounts created BEFORE you turn confirmation on are unaffected —
-- they're already marked confirmed and can keep logging in normally.
-- ------------------------------------------------------------------
