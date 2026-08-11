-- ------------------------------------------------------------------
-- studygroup.ph — migration 012: fix calls.updated_at
--
-- updated_at was only ever set once, by the column default at INSERT
-- time — none of the status-changing functions (accept/decline/end)
-- touched it, so it never reflected when a call was actually accepted,
-- declined, or ended. Fixed with a trigger instead of editing every
-- function individually, so it stays correct automatically no matter
-- what updates the row in the future.
-- ------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_calls_updated_at on calls;
create trigger trg_calls_updated_at
  before update on calls
  for each row execute function public.set_updated_at();
