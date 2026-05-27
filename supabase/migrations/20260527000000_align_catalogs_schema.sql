-- =============================================================================
-- Re-align public.catalogs with the latest app schema.
-- =============================================================================
-- The initial migration (20260526120000) was applied before we collapsed
-- figma_url + local_path → file_path, added catalog_url, added site_name,
-- and dropped domain. Older Supabase projects still carry the old shape;
-- this file moves them to the new one. Idempotent — safe to run any time.
-- =============================================================================

-- 1) Drop columns that no longer exist in the app schema.
alter table public.catalogs drop column if exists figma_url;
alter table public.catalogs drop column if exists local_path;
alter table public.catalogs drop column if exists domain;

-- 2) site_name is the primary identifier. Add it (nullable first, backfill
--    from customer_name where missing, then mark NOT NULL).
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'catalogs'
      and column_name = 'site_name'
  ) then
    alter table public.catalogs add column site_name text;
    update public.catalogs
       set site_name = coalesce(site_name, customer_name)
     where site_name is null;
    alter table public.catalogs alter column site_name set not null;
  end if;
end $$;

-- 3) New text columns (free text — Figma URL or UNC for file_path, full URL
--    for the published catalog page).
alter table public.catalogs add column if not exists file_path text;
alter table public.catalogs add column if not exists catalog_url text;

-- 4) Helpful index for sorting / searching by site_name.
create index if not exists catalogs_site_name_idx on public.catalogs (site_name);
