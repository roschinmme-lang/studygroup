-- ------------------------------------------------------------------
-- studygroup.ph — migration 008: real Vibes Feed
--
-- Replaces the static mock clips with real uploaded videos. Also drops
-- the "auto-caption transcript" feature — that was fake/mock data, and
-- there's no real transcription pipeline behind it, so it's removed
-- rather than kept as a placeholder. The Q&A thread becomes real,
-- backed by vibe_comments.
-- ------------------------------------------------------------------

create table if not exists vibes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  video_url text not null,
  title text not null,
  subject text,
  quarantined boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists vibe_comments (
  id uuid primary key default gen_random_uuid(),
  vibe_id uuid not null references vibes(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table vibes enable row level security;
alter table vibe_comments enable row level security;

create policy "Vibes are viewable by authenticated users"
  on vibes for select using (auth.role() = 'authenticated');
create policy "Users can post their own vibes"
  on vibes for insert with check (auth.uid() = author_id);
create policy "Authenticated users can quarantine vibes"
  on vibes for update using (auth.role() = 'authenticated');

create policy "Vibe comments viewable by authenticated users"
  on vibe_comments for select using (auth.role() = 'authenticated');
create policy "Users can add their own vibe comments"
  on vibe_comments for insert with check (auth.uid() = author_id);

-- Public storage bucket for uploaded videos.
insert into storage.buckets (id, name, public)
values ('vibe-videos', 'vibe-videos', true)
on conflict (id) do nothing;

create policy "Public read access to vibe videos"
  on storage.objects for select
  using (bucket_id = 'vibe-videos');

create policy "Authenticated users can upload vibe videos"
  on storage.objects for insert
  with check (bucket_id = 'vibe-videos' and auth.role() = 'authenticated');

create policy "Users can delete their own vibe videos"
  on storage.objects for delete
  using (bucket_id = 'vibe-videos' and auth.uid()::text = (storage.foldername(name))[1]);

alter publication supabase_realtime add table vibes, vibe_comments;

-- ------------------------------------------------------------------
-- Note on file size: Supabase's default per-file upload limit is 50MB
-- on most plans. The app validates against that client-side too. Keep
-- your first test clip short (a few seconds to a minute) to stay well
-- under it, especially on a free-tier project.
-- ------------------------------------------------------------------
