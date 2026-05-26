-- =============================================================================
-- Initial schema for xinics-catalog-design
-- =============================================================================
-- Tables: profiles, catalog_proposal_types, catalog_site_types,
--         catalogs, catalog_edit_logs
-- Indexes, triggers, RLS policies, and seed data for the two type tables.
-- Storage bucket and policies are in a separate migration.
--
-- Idempotent — safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS
-- / CREATE OR REPLACE).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------

-- profiles — auth.users 확장 (게시자 표시명·아바타 캐시)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- catalog_proposal_types — 1차/2차/최종 시안 (어드민에서 추가/수정 가능)
create table if not exists public.catalog_proposal_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- catalog_site_types — 기본형/오픈캠퍼스형 (어드민에서 추가/수정 가능)
create table if not exists public.catalog_site_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- catalogs — 시안 카드 (1 row = 1 image = 1 card)
-- site_name이 메인 식별자(한 고객사가 여러 카탈로그/사이트를 가짐), customer_name은 보조.
create table if not exists public.catalogs (
  id uuid primary key default gen_random_uuid(),
  site_name text not null,
  customer_name text not null,
  domain text,
  proposal_type_id uuid references public.catalog_proposal_types(id) on delete restrict,
  site_type_id uuid references public.catalog_site_types(id) on delete restrict,
  design_tool text,
  figma_url text,
  local_path text,
  memo text,
  image_url text,
  thumbnail_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- catalog_edit_logs — 수정 이력 (변경 전/후 값 jsonb 보관, V1 수동 롤백 대비)
create table if not exists public.catalog_edit_logs (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('created', 'updated', 'deleted', 'restored')),
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------------------------------

create index if not exists catalogs_deleted_at_idx on public.catalogs (deleted_at);
create index if not exists catalogs_created_at_idx on public.catalogs (created_at desc);
create index if not exists catalogs_site_name_idx on public.catalogs (site_name);
create index if not exists catalogs_customer_name_idx on public.catalogs (customer_name);

create index if not exists catalog_edit_logs_catalog_id_created_at_idx
  on public.catalog_edit_logs (catalog_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 3. Trigger functions
-- -----------------------------------------------------------------------------

-- updated_at touch helper
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists catalogs_set_updated_at on public.catalogs;
create trigger catalogs_set_updated_at
  before update on public.catalogs
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- handle_new_user: auth.users 새 row 생기면 profiles 자동 upsert
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        avatar_url   = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at   = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles               enable row level security;
alter table public.catalog_proposal_types enable row level security;
alter table public.catalog_site_types     enable row level security;
alter table public.catalogs               enable row level security;
alter table public.catalog_edit_logs      enable row level security;

-- ---- profiles ---------------------------------------------------------------
drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public
  on public.profiles for select
  using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---- catalog_proposal_types -------------------------------------------------
drop policy if exists proposal_types_select_public on public.catalog_proposal_types;
create policy proposal_types_select_public
  on public.catalog_proposal_types for select
  using (true);

drop policy if exists proposal_types_insert_authed on public.catalog_proposal_types;
create policy proposal_types_insert_authed
  on public.catalog_proposal_types for insert
  with check (auth.uid() is not null);

drop policy if exists proposal_types_update_authed on public.catalog_proposal_types;
create policy proposal_types_update_authed
  on public.catalog_proposal_types for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists proposal_types_delete_authed on public.catalog_proposal_types;
create policy proposal_types_delete_authed
  on public.catalog_proposal_types for delete
  using (auth.uid() is not null);

-- ---- catalog_site_types -----------------------------------------------------
drop policy if exists site_types_select_public on public.catalog_site_types;
create policy site_types_select_public
  on public.catalog_site_types for select
  using (true);

drop policy if exists site_types_insert_authed on public.catalog_site_types;
create policy site_types_insert_authed
  on public.catalog_site_types for insert
  with check (auth.uid() is not null);

drop policy if exists site_types_update_authed on public.catalog_site_types;
create policy site_types_update_authed
  on public.catalog_site_types for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists site_types_delete_authed on public.catalog_site_types;
create policy site_types_delete_authed
  on public.catalog_site_types for delete
  using (auth.uid() is not null);

-- ---- catalogs ---------------------------------------------------------------
-- SELECT: 비로그인은 deleted_at IS NULL인 카탈로그만, 로그인은 휴지통 항목까지
drop policy if exists catalogs_select_visible on public.catalogs;
create policy catalogs_select_visible
  on public.catalogs for select
  using (deleted_at is null or auth.uid() is not null);

drop policy if exists catalogs_insert_authed on public.catalogs;
create policy catalogs_insert_authed
  on public.catalogs for insert
  with check (auth.uid() is not null);

drop policy if exists catalogs_update_authed on public.catalogs;
create policy catalogs_update_authed
  on public.catalogs for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists catalogs_delete_authed on public.catalogs;
create policy catalogs_delete_authed
  on public.catalogs for delete
  using (auth.uid() is not null);

-- ---- catalog_edit_logs ------------------------------------------------------
-- 로그인 사용자만 읽고 쓸 수 있음. UPDATE/DELETE 정책은 없음 = 차단.
drop policy if exists edit_logs_select_authed on public.catalog_edit_logs;
create policy edit_logs_select_authed
  on public.catalog_edit_logs for select
  using (auth.uid() is not null);

drop policy if exists edit_logs_insert_authed on public.catalog_edit_logs;
create policy edit_logs_insert_authed
  on public.catalog_edit_logs for insert
  with check (auth.uid() is not null and auth.uid() = actor_id);

-- -----------------------------------------------------------------------------
-- 5. Seed data (분류값) — idempotent upsert by slug
-- -----------------------------------------------------------------------------

insert into public.catalog_proposal_types (slug, name, sort_order) values
  ('first',  '1차 시안',  1),
  ('second', '2차 시안',  2),
  ('final',  '최종 시안', 3)
on conflict (slug) do update
  set name = excluded.name,
      sort_order = excluded.sort_order;

insert into public.catalog_site_types (slug, name, sort_order) values
  ('basic',        '기본형',       1),
  ('open_campus',  '오픈캠퍼스형', 2)
on conflict (slug) do update
  set name = excluded.name,
      sort_order = excluded.sort_order;
