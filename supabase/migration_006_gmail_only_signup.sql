-- ------------------------------------------------------------------
-- studygroup.ph — migration 006: gmail.com-only signups
--
-- This replaces migration 005's confirmation-focused trigger with one
-- that also rejects any signup whose email isn't @gmail.com. This is
-- a lighter-weight alternative to full email confirmation: it filters
-- out obviously fake addresses without requiring anyone to click a
-- confirmation link, so signup logs people straight into the app.
--
-- Worth knowing: this does NOT prove someone owns the Gmail address —
-- there's no click-through step. It just blocks addresses that aren't
-- @gmail.com. For actual proof of ownership, use migration 005 (real
-- confirmation) instead.
-- ------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.email !~* '^[^@\s]+@gmail\.com$' then
    raise exception 'Only gmail.com addresses can sign up for Studygroup.';
  end if;

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

-- The trigger itself is unchanged (still points at handle_new_user), so
-- no need to recreate it — CREATE OR REPLACE FUNCTION is enough. Included
-- here anyway in case migration 005 was never run.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------
-- If you turned "Confirm email" ON earlier and want people to land
-- straight in the app on signup instead of waiting on a confirmation
-- link, turn it back OFF:
-- Supabase Dashboard -> Authentication -> Providers -> Email ->
--   toggle OFF "Confirm email" -> Save
-- ------------------------------------------------------------------
