# xinics-catalog-design

사내 디자인 카탈로그 시안 아카이브. 자세한 계획은 [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md).

## 기술 스택

- Next.js 16 (App Router, TypeScript) — `pnpm` 사용
- Tailwind CSS v4 + 사내 XDS 디자인 시스템 (`/design-system/`)
- Supabase (Auth / Postgres / Storage) — `@supabase/ssr`
- 다크모드: `next-themes`, 토스트: `sonner`, 아이콘: `lucide-react`

## 로컬 실행

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경 변수 설정
cp .env.example .env.local
# .env.local 에 Supabase 프로젝트의 URL/anon key/service role key 입력

# 3. 개발 서버
pnpm dev
# http://localhost:3000
```

## Supabase 프로젝트 셋업

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성 (region: ap-northeast-2 권장).
2. 프로젝트 설정 → API → URL, anon key, service role key 를 `.env.local`에 복사.
3. 마이그레이션 적용:
   ```bash
   # 최초 1회: 프로젝트와 로컬 디렉터리 링크
   pnpm dlx supabase link --project-ref <project-ref>

   # /supabase/migrations/ 폴더의 SQL을 원격 DB에 적용
   pnpm dlx supabase db push
   ```
   - `20260526120000_initial_schema.sql` — 테이블·인덱스·RLS·트리거·시드 분류값(1차/2차/최종, 기본형/오픈캠퍼스형)
   - `20260526120001_storage.sql` — `catalog-images` 버킷 + 정책
4. 타입 재생성 (마이그레이션 변경 시):
   ```bash
   pnpm dlx supabase gen types typescript --linked > types/database.types.ts
   ```
   `types/database.types.ts`는 마이그레이션 기준으로 손으로 작성되어 있으니, 프로젝트 연결 후 위 명령으로 덮어쓰면 됨.

## 로컬 Supabase (선택)

매번 원격에 push하기 부담스럽다면 로컬 개발용 컨테이너를 사용:
```bash
pnpm dlx supabase init     # 최초 1회 — /supabase/config.toml 생성
pnpm dlx supabase start    # 로컬 컨테이너(Auth/DB/Storage) 기동
pnpm dlx supabase db reset # /supabase/migrations + /supabase/seed.sql 재적용
```
로컬용 URL/key는 `supabase start` 출력에서 확인.

## 디자인 시스템(XDS)

- `/design-system/`은 **read-only** — XDS Generator에서 재 export로만 갱신.
- Tailwind preset, 토큰 CSS, 컴포넌트 명세(`/design-system/components/*.md`)가 모두 들어 있다.
- 신규 UI는 `/components/xds/`에 토큰만 사용해서 wrapper로 작성.
- 자세한 적용 가이드는 [DEVELOPMENT_PLAN.md §8](./DEVELOPMENT_PLAN.md).

## 디렉터리

```
app/                Next.js App Router
components/
  providers/        클라이언트 프로바이더 (ThemeProvider 등)
  xds/              XDS 명세 기반 wrapper 컴포넌트
  ui/               shadcn primitive (필요 시 추가)
lib/
  supabase/         Supabase 클라이언트 (client/server/middleware)
  auth/             인증 헬퍼 (Stage 2)
hooks/              클라이언트 훅
types/              타입 정의 (database.types.ts 등)
supabase/
  migrations/       SQL 마이그레이션 (Stage 3)
design-system/      XDS read-only
```

## 스크립트

| 명령 | 동작 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 서버 |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier 적용 |
