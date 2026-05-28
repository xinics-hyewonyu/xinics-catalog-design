-- =============================================================================
-- Stage 8.5 — IP allowlist + author_name + 외부 공개 정책
-- =============================================================================
-- 1) catalogs.author_name : 자유 텍스트 작성자명 (NULL 허용 — 폴백 표시는 앱에서)
-- 2) allowed_ips          : IP 화이트리스트 (회사/자택). middleware에서 service_role로 조회
-- =============================================================================

-- 1) author_name 컬럼 추가 ----------------------------------------------------
alter table public.catalogs
  add column if not exists author_name text;

-- 2) allowed_ips 테이블 ------------------------------------------------------
create table if not exists public.allowed_ips (
  id          uuid primary key default gen_random_uuid(),
  ip_address  inet        not null,
  label       text        not null,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- 같은 IP를 중복 등록하지 않도록 (활성/비활성과 무관하게)
create unique index if not exists allowed_ips_ip_address_uniq
  on public.allowed_ips (ip_address);

-- 활성 행만 빠르게 조회
create index if not exists allowed_ips_active_idx
  on public.allowed_ips (is_active) where is_active;

-- 3) RLS — anon 차단, 모든 접근은 service_role 또는 인증 사용자만 ---------------
alter table public.allowed_ips enable row level security;

drop policy if exists allowed_ips_select_authed on public.allowed_ips;
create policy allowed_ips_select_authed
  on public.allowed_ips for select
  using (auth.uid() is not null);

drop policy if exists allowed_ips_insert_authed on public.allowed_ips;
create policy allowed_ips_insert_authed
  on public.allowed_ips for insert
  with check (auth.uid() is not null);

drop policy if exists allowed_ips_update_authed on public.allowed_ips;
create policy allowed_ips_update_authed
  on public.allowed_ips for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists allowed_ips_delete_authed on public.allowed_ips;
create policy allowed_ips_delete_authed
  on public.allowed_ips for delete
  using (auth.uid() is not null);

-- 4) 시드: 회사 사무실 IP ----------------------------------------------------
insert into public.allowed_ips (ip_address, label) values
  ('61.82.188.188', '회사 사무실')
on conflict (ip_address) do nothing;
