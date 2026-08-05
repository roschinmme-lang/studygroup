-- ------------------------------------------------------------------
-- studygroup.ph — migration 004: notifications
-- Run this in the SQL Editor. Safe to run more than once.
--
-- Notifications are created by database triggers, not by the client.
-- That means they fire no matter which device/browser performed the
-- like/comment/message, and can't be spoofed by a client skipping a
-- step.
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

-- No insert policy on purpose: notifications are only ever created by
-- the SECURITY DEFINER trigger functions below, never directly by a
-- client, so there's nothing for a client-side insert policy to allow.

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

-- Realtime, so the bell badge updates live (safe to ignore if it errors
-- — just enable it via Dashboard -> Database -> Replication instead).
alter publication supabase_realtime add table notifications;
