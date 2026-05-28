-- =============================================================================
-- Add additional catalog_site_types: cms, reservation, sub, page, login, intro.
-- Idempotent upsert by slug.
-- =============================================================================

insert into public.catalog_site_types (slug, name, sort_order) values
  ('sub',         '서브형',        3),
  ('login',       '로그인',        4),
  ('page',        '소개페이지',    5),
  ('intro',       '인트로',        6),
  ('oer',         'OER',          7),
  ('cms',         'CMS',          8),
  ('reservation', '예약관리시스템', 9)
on conflict (slug) do update
  set name = excluded.name,
      sort_order = excluded.sort_order;
