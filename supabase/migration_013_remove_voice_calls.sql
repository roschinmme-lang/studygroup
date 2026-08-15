-- ------------------------------------------------------------------
-- studygroup.ph — migration 013: remove voice calls
--
-- Voice calling has been removed from the app. This drops the table,
-- its trigger functions, and its realtime registration. Safe to run
-- even if some of these were never created.
-- ------------------------------------------------------------------

alter publication supabase_realtime drop table if exists calls;

drop trigger if exists trg_rl_call on calls;
drop trigger if exists trg_calls_updated_at on calls;

drop table if exists calls;

drop function if exists public.rl_check_call();

-- Not dropped: public.set_updated_at() — it's a generic helper, not
-- specific to calls, safe to leave in place even though nothing uses
-- it right now.
