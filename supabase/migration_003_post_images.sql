-- ------------------------------------------------------------------
-- studygroup.ph — migration 003: post images
-- Run this in the SQL Editor after schema.sql (and migration_002 if you
-- ran that separately). Safe to run more than once.
-- ------------------------------------------------------------------

alter table posts add column if not exists image_url text;

-- Public storage bucket for post images. "public: true" means anyone
-- with the URL can view an image (needed so images render in the feed),
-- but uploading/deleting is still restricted by the policies below.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "Public read access to post images"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "Authenticated users can upload post images"
  on storage.objects for insert
  with check (bucket_id = 'post-images' and auth.role() = 'authenticated');

create policy "Users can delete their own post images"
  on storage.objects for delete
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);
