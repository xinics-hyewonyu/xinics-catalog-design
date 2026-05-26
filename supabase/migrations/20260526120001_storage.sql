-- =============================================================================
-- Storage bucket + policies for catalog images
-- =============================================================================
-- Bucket: catalog-images (public read, authenticated write).
-- 원본 이미지 경로: {catalog_id}/original.{ext}
-- 썸네일 경로:      {catalog_id}/thumb.{ext}
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('catalog-images', 'catalog-images', true)
on conflict (id) do update
  set public = excluded.public;

-- ---- Policies on storage.objects --------------------------------------------

drop policy if exists catalog_images_select on storage.objects;
create policy catalog_images_select
  on storage.objects for select
  using (bucket_id = 'catalog-images');

drop policy if exists catalog_images_insert_authed on storage.objects;
create policy catalog_images_insert_authed
  on storage.objects for insert
  with check (bucket_id = 'catalog-images' and auth.uid() is not null);

drop policy if exists catalog_images_update_authed on storage.objects;
create policy catalog_images_update_authed
  on storage.objects for update
  using (bucket_id = 'catalog-images' and auth.uid() is not null)
  with check (bucket_id = 'catalog-images' and auth.uid() is not null);

drop policy if exists catalog_images_delete_authed on storage.objects;
create policy catalog_images_delete_authed
  on storage.objects for delete
  using (bucket_id = 'catalog-images' and auth.uid() is not null);
