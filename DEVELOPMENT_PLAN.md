# 사내 디자인 아카이브 (카탈로그) 개발 계획

## 1. 요구사항 점검 — 짚고 갈 부분

요구사항을 그대로 받기 전에 약한 부분부터.

**(1) "모든 로그인 사용자가 다른 사람 글까지 수정/삭제" 결정의 부작용**
누구나 실수로 망가뜨릴 수 있다. 수정 로그만으로는 부족할 수 있고, 다음 두 가지가 추가로 필요해진다.
- **Soft delete (휴지통)**: 삭제는 `deleted_at` 마킹으로 처리하고, 30일 후 cron이 hard delete. 실수 복구 가능.
- **수정 로그에 이전 값 보관**: diff만 남기지 말고 변경 전 값을 함께 저장 → 필요 시 수동 롤백.

**(2) "위험하니 꼭 확인 절차" — 어떤 강도?**
단순 "정말 삭제하시겠습니까?" 다이얼로그는 사람이 무의식적으로 OK를 누른다. 강도 옵션:
- 약: 체크박스 + 삭제 버튼
- 중: 고객명 또는 "DELETE"를 텍스트로 직접 입력해야 활성화 (권장)
- 강: 위 + 이메일로 확인 링크

중간 강도 + soft delete 조합 권장.

**(3) "시안 이미지" — 단수형인데 여러 장 가능한지 확인 완료**
시안마다 디자인 컨셉이 다를 거라 리스트에 동시에 다 보여야 함. 캐러셀(카드 1개에 여러 이미지 슬라이드)은 한 번에 1장만 보여서 부적합. 결론: **1 이미지 = 1 시안 = 1 카드** 모델. 컨셉이 다르면 별도 시안으로 등록. 옛 프로토타입 운영 방식과 동일.

**(4) "시안 경로" — 두 종류 다 존재**
Figma URL과 사내 폴더 경로(UNC `\\etc\...`) 둘 다 사용. 필드 2개로 분리: `figma_url`, `local_path`. 로컬 경로는 브라우저에서 클릭 동작 안 하니 표시 + 복사 버튼.

**(5) 썸네일 자동 생성 vs 별도 업로드**
사용자가 16:9 크롭본을 따로 만들어 올리게 하면 운영 부담 큼. 풀 이미지 업로드 시 자동으로 16:9 썸네일 생성(중앙 크롭 + 사용자 위치 조정 가능)이 현실적.

**(6) 검색/정렬/페이지네이션 명시 없음**
필터만으로 부족. 고객명 검색은 거의 확실히 쓰게 됨. 정렬(최신순/오래된순), 페이지네이션(또는 무한 스크롤)도 처음부터.

**(7) 이미지 다운로드 파일명 규칙**
자동 명명: `{customer_name}_{proposal_type}_{NN}.{ext}` 예: `한양대학교_최종시안_01.jpg`. 한글 파일명 그대로 사용.

**(8) 카테고리 확장성 — 카탈로그 전용으로 가는 걸로 정리**
처음 답변에서는 "확장 가능하게"였으나, 실제로는 카탈로그 외 디자인은 안 올릴 예정. 로고는 V2에 **별도 페이지/테이블로 분리**. → `design_categories` 상위 테이블 제거. 카탈로그 전용 단순 스키마로 간다.

---

## 2. 확정된 결정사항 (사용자 답변 반영)

| 항목 | 결정 |
|---|---|
| 권한 모델 | 모든 로그인 사용자가 모든 항목 수정/삭제 (단, 수정 로그 + soft delete로 안전망) |
| 분류값 (시안 종류/사이트 종류) | DB에서 관리 (어드민 페이지에서 추가/수정 가능) |
| 기술 스택 | Next.js 15 (App Router, TypeScript) + Supabase (Auth/DB/Storage) + Tailwind + shadcn/ui |
| 카테고리 범위 | 카탈로그 전용. 로고는 V2에 별도 페이지/테이블. |
| 이미지 모델 | 1 이미지 = 1 시안 = 1 카드 (컨셉별 분리 등록) |
| 시안 경로 필드 | `figma_url` + `local_path` 2필드 분리 |
| 이미지 정책 | jpg/png/webp, 장당 10MB 이하 |
| 다운로드 파일명 | `{고객명}_{시안종류}_{NN}.{ext}` 자동 명명 |
| 휴지통 | V1 포함. 30일 후 cron으로 hard delete. |
| 삭제 확인 강도 | 중 — 고객명 텍스트 입력 후 활성화 |
| 수정 로그 | 변경 전/후 값 모두 보관 (수동 롤백 가능) |
| 라이트박스 | 화면맞춤 + 원본 사이즈 줌/팬 지원 |
| 배포 | Vercel |

---

## 3. 데이터 모델 (카탈로그 전용 단순 스키마)

```
catalog_proposal_types     -- 1차/2차/최종 시안 (DB 관리)
  id, slug, name, sort_order, is_active

catalog_site_types         -- 기본형/오픈캠퍼스형 (DB 관리)
  id, slug, name, sort_order, is_active

catalogs                   -- 카탈로그 시안 (1 row = 1 이미지 = 1 카드)
  id, customer_name, domain,
  proposal_type_id (FK), site_type_id (FK, nullable),
  design_tool,
  figma_url,                -- Figma URL (선택)
  local_path,               -- 사내 폴더 경로 (선택)
  memo,
  image_url,                -- 원본 시안 이미지 (1장)
  thumbnail_url,            -- 16:9 자동 생성 썸네일
  created_by (FK auth.users),
  created_at, updated_at, deleted_at

catalog_edit_logs          -- 수정 로그
  id, catalog_id (FK), actor_id (FK auth.users),
  action (created/updated/deleted/restored),
  changes (jsonb: {field: {before, after}}),
  created_at

profiles                   -- auth.users 확장 (게시자 표시명용)
  id (FK auth.users), display_name, avatar_url, email
```

**RLS 정책 요지**
- `catalogs`, `catalog_*_types`: SELECT는 누구나 (단 `catalogs`는 `deleted_at IS NULL`)
- INSERT/UPDATE/DELETE: `auth.role() = 'authenticated'`
- `catalog_edit_logs`: SELECT/INSERT 인증된 사용자만, UPDATE/DELETE 차단

**Storage 버킷**
- `catalog-images` 버킷
- public read, authenticated write
- 원본 이미지 경로: `{catalog_id}/original.{ext}`, 썸네일: `{catalog_id}/thumb.{ext}`

> 로고 V2 추가 시: `logos` 테이블 + `/logo` 라우트를 별도 구성. 공통 컴포넌트(폼/모달/리스트)는 추후 추상화하되, V1에서는 카탈로그 전용으로 단순하게.

---

## 4. 개발 단계

### Stage 1. 프로젝트 셋업 & 인프라
### Stage 2. 인증 (Google OAuth + @xinics.com 제한)
### Stage 3. DB 스키마 & RLS & Storage
### Stage 4. 리스트 페이지 (카드 그리드 + 필터 + 검색)
### Stage 5. 상세 모달 + 이미지 라이트박스
### Stage 6. 생성 (업로드 + 자동 썸네일)
### Stage 7. 수정 + 수정 로그 자동 기록
### Stage 8. 삭제 + 확인 절차 + Soft delete
### Stage 9. 어드민(분류값 관리) + 마감 (모바일/SEO/에러처리)

---

## 5. 단계별 프롬프트 (코딩 AI에 그대로 던질 수 있는 형식)

### Stage 1 프롬프트 — 프로젝트 셋업

```
Next.js 15 (App Router, TypeScript) 프로젝트를 셋업해줘. 다음 조건:

- 패키지 매니저: pnpm
- Tailwind CSS v4
- shadcn/ui 초기화 (button, card, dialog, input, label, select, textarea, badge, skeleton, sonner 설치)
- ESLint, Prettier 기본 설정
- 디렉터리: /app, /components, /lib, /types
- Supabase 클라이언트 두 종류 생성: /lib/supabase/client.ts (브라우저용), /lib/supabase/server.ts (서버 컴포넌트/액션용). @supabase/ssr 패키지 사용.
- 환경변수: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. .env.example 파일 생성.
- /middleware.ts에 Supabase 세션 새로고침 미들웨어 (공식 가이드 기반)
- /app/layout.tsx에 Toaster (sonner) 추가
- README.md에 로컬 실행 방법, Supabase 프로젝트 셋업 방법 간단히

산출물 외 추가 패키지 설치는 자제. 추후 단계에서 필요한 것만 점진적으로 추가할 거임.
```

### Stage 2 프롬프트 — 인증 (Google OAuth + 도메인 제한)

```
Supabase Auth로 Google OAuth 로그인을 붙여줘. 조건:

- 로그인 페이지: /login. 가운데 정렬, "Google로 로그인" 버튼 하나만.
- 로그인은 supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin}/auth/callback` } }) 사용.
- /app/auth/callback/route.ts에서 code → session 교환 후, 이메일 도메인이 @xinics.com이 아니면 즉시 signOut 시키고 /login?error=domain 으로 리다이렉트.
- 로그인 성공 시 profiles 테이블에 upsert (id, email, display_name=user_metadata.full_name, avatar_url).
- 헤더 컴포넌트(/components/header.tsx): 로고, 우측에 로그인 안 됐으면 "로그인" 링크, 로그인 됐으면 아바타 + 드롭다운(이메일 표시 + 로그아웃).
- /lib/auth/get-user.ts: 서버에서 현재 사용자 가져오는 헬퍼.
- /hooks/use-user.ts: 클라이언트에서 사용자 상태 구독하는 훅.
- /login?error=domain 이면 토스트로 "회사 계정(@xinics.com)으로만 로그인 가능합니다." 표시.

도메인 검증은 클라이언트가 아니라 callback route에서 서버사이드로 해야 함. 우회 못하게.
```

### Stage 3 프롬프트 — DB 스키마 & RLS & Storage

```
Supabase에 다음 스키마를 마이그레이션 파일로 작성해줘. 위치: /supabase/migrations/

1) 테이블
- catalog_proposal_types(id uuid pk default gen_random_uuid(), slug text unique, name text, sort_order int default 0, is_active bool default true, created_at timestamptz default now())
- catalog_site_types(id, slug, name, sort_order, is_active, created_at)
- profiles(id uuid pk references auth.users(id) on delete cascade, email text, display_name text, avatar_url text, created_at, updated_at)
- catalogs(
    id uuid pk default gen_random_uuid(),
    customer_name text not null,
    domain text,
    proposal_type_id uuid fk→catalog_proposal_types,
    site_type_id uuid fk→catalog_site_types,
    design_tool text,
    figma_url text,
    local_path text,
    memo text,
    image_url text,
    thumbnail_url text,
    created_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    deleted_at timestamptz
  )
- catalog_edit_logs(id, catalog_id fk→catalogs on delete cascade, actor_id fk→auth.users, action text check in ('created','updated','deleted','restored'), changes jsonb, created_at)

2) 인덱스
- catalogs(deleted_at), catalogs(created_at desc), catalogs(customer_name)
- catalog_edit_logs(catalog_id, created_at desc)

3) RLS 정책
- 모든 테이블 RLS 활성화
- catalog_proposal_types / catalog_site_types: SELECT public, INSERT/UPDATE/DELETE는 인증된 사용자
- catalogs: SELECT public (where deleted_at is null), 인증된 사용자만 deleted_at IS NOT NULL인 row까지 SELECT 가능, INSERT/UPDATE/DELETE는 인증된 사용자
- catalog_edit_logs: SELECT/INSERT 인증된 사용자만, UPDATE/DELETE 차단
- profiles: SELECT public, 본인만 UPDATE/INSERT

4) 트리거
- catalogs UPDATE 시 updated_at 자동 갱신
- profiles handle_new_user 트리거 (auth.users에 row 생기면 profiles에 빈 row 자동 생성)

5) 시드 데이터 (/supabase/seed.sql)
- catalog_proposal_types: '1차 시안', '2차 시안', '최종 시안' (sort_order 1,2,3)
- catalog_site_types: '기본형', '오픈캠퍼스형' (sort_order 1,2)

6) Storage
- 'catalog-images' 버킷 생성 (public)
- 정책: SELECT 누구나, INSERT/UPDATE/DELETE 인증된 사용자
- /supabase/storage-policies.sql 파일로 작성

7) /types/database.types.ts 에 supabase gen types로 생성한 타입을 둘 수 있도록 README에 명령어 추가.

마이그레이션은 supabase CLI로 적용 가능한 형태. 모든 SQL은 멱등(if not exists) 사용.
```

### Stage 4 프롬프트 — 리스트 페이지 (카드 그리드 + 필터 + 검색)

```
/app/page.tsx 에 카탈로그 리스트 페이지를 만들어줘. 조건:

- 데이터 소스: catalogs 테이블 where deleted_at is null
- 조인: catalog_proposal_types, catalog_site_types, profiles (created_by → display_name)
- 서버 컴포넌트에서 1차 SSR, 클라이언트에서 필터 변경 시 클라이언트 fetch (URL searchParams 반영).

UI:
- 상단: 검색바(고객명/도메인 키워드), 필터 칩 그룹(시안 종류 다중선택, 사이트 종류 다중선택), 정렬 셀렉트(최신순/오래된순/고객명 가나다순), 로그인 사용자면 우측에 "새 카탈로그 등록" 버튼, "휴지통" 링크.
- 본문: 반응형 카드 그리드 (mobile 1열, sm 2열, md 3열, lg 4열).
- 카드:
  - 16:9 썸네일 (Image, object-cover, hover 시 살짝 zoom)
  - 카드 하단: 고객명(굵게), 작은 글씨로 시안 종류 + 사이트 종류 뱃지
  - 클릭 시 모달 오픈 (다음 단계에서 구현, 지금은 URL에 ?catalog={id} 추가하고 빈 모달만)
- 빈 상태: 일러스트 + "등록된 카탈로그가 없습니다."
- 로딩: 카드 모양 스켈레톤
- 페이지네이션: 무한 스크롤 (IntersectionObserver, 20개씩)

필터/검색/정렬 상태는 URL에 반영해서 새로고침/공유 가능하게.
비로그인 사용자도 모두 접근 가능. "새 카탈로그 등록" / "휴지통" 버튼만 숨김.

Server Action 또는 서버 컴포넌트 fetch + 클라이언트 useTransition 조합 자유롭게.
```

### Stage 5 프롬프트 — 상세 모달 + 이미지 라이트박스

```
카탈로그 카드 클릭 시 모달로 상세를 표시하는 기능을 추가해줘.

- URL 패턴: /?catalog={id} (추천: shadcn Dialog + useSearchParams)
- 모달 진입 시: catalogs + 분류 라벨 + profiles 조인해서 fetch.
- 모달 레이아웃:
  - 좌측(또는 상단): 이미지 영역. image_url 1장 표시 (비율 자유, object-contain).
  - 우측(또는 하단): 정보 패널.
- 모든 사용자에게 보이는 기본 정보: 고객명, 도메인, 시안 종류, 사이트 종류.
- 로그인한 사용자에게만 추가 표시:
  - 게시일시 (created_at)
  - 게시자 (profiles.display_name)
  - 디자인 툴
  - Figma URL (있으면 외부 링크 버튼)
  - 사내 폴더 경로 (있으면 텍스트로 표시 + 클립보드 복사 버튼; 브라우저에서 직접 열리지 않음을 주의)
  - 메모
  - 수정 로그 섹션 (접기/펼치기, catalog_edit_logs를 created_at desc로 표시: "OOO이 YYYY-MM-DD HH:mm에 ㅇㅇ을 변경")
  - 우측 상단 액션: "수정", "삭제" 버튼
  - 이미지 위에 "다운로드" 버튼
- 다운로드 파일명 자동 생성: `{customer_name}_{proposal_type_name}_{NN}.{ext}` (NN은 같은 (고객, 시안종류) 묶음의 등록 순번 padStart 2자리). 한글 그대로 사용.
- 이미지 클릭 시: 라이트박스(전체 화면, 어두운 배경, ESC/배경 클릭으로 닫기). 단일 이미지이므로 좌우 네비게이션 없음.
- **라이트박스 줌/팬 (전체보기)**:
  - 기본은 "화면맞춤" (이미지가 뷰포트에 fit, object-contain).
  - 우상단 컨트롤: [화면맞춤] / [원본 사이즈(100%)] 토글, [+ / −] 줌 버튼, 현재 배율 표시(예: 100%).
  - 단축키: `0` = 화면맞춤, `1` = 100%, `+`/`-` = 줌, 마우스 휠 = 줌, 더블클릭 = 100%↔화면맞춤 토글.
  - 줌 상태에서는 드래그로 팬(이동) 가능. 100% 이상일 때만 커서가 `grab`/`grabbing`.
  - 모바일: 핀치 줌 + 한 손가락 드래그 팬 (`react-zoom-pan-pinch` 또는 동급 라이브러리 사용).
  - 줌 중에는 배경 클릭으로 닫히지 않게(드래그와 충돌). 닫기는 ESC 또는 우상단 닫기 버튼만.
- 모달 닫기: ESC, 배경 클릭, 닫기 버튼, 또는 URL에서 ?catalog 제거하면 자동 닫힘
- 모바일: 모달 전체 화면 차지, 정보 패널 아래로
- 다운로드는 fetch → blob → object URL 패턴으로 파일명 강제. (anchor download 속성은 cross-origin에서 무시되는 경우 있음)

상태 관리는 URL 기반(공유 가능). 모달 중첩(라이트박스 위에 모달)이 깨지지 않게 z-index/포커스 트랩 주의.
```

### Stage 6 프롬프트 — 생성 (업로드 + 자동 썸네일)

```
"새 카탈로그 등록" 다이얼로그를 만들어줘. 로그인 사용자만 사용 가능.

위치: /components/catalog-upload-dialog.tsx (헤더의 등록 버튼에서 트리거)

폼 필드:
- 이미지 업로드 (필수, **1장**, 드래그앤드롭 영역, 미리보기, **10MB 제한**, jpg/png/webp만)
- 고객명 (필수, 한글 가능)
- 도메인 (선택)
- 시안 종류 (필수, catalog_proposal_types에서 선택)
- 사이트 종류 (선택, catalog_site_types에서 선택)
- 디자인 툴 (선택, 자유 입력 또는 셀렉트: Figma/Sketch/XD/Photoshop/Illustrator/기타)
- Figma URL (선택, URL 형식 검증)
- 사내 폴더 경로 (선택, 자유 텍스트 — `\\etc\...` 같은 UNC 경로 그대로 입력)
- 메모 (선택, textarea)
- 썸네일 16:9 크롭: 업로드된 이미지에 대해 자동으로 중앙 크롭 미리보기 → 사용자가 드래그로 위치 조정 가능 (react-image-crop, aspect 16/9 고정)

저장 흐름 (Server Action):
1) catalogs INSERT (created_by = current user) — image_url, thumbnail_url은 일단 null
2) 원본 이미지를 Storage 업로드 (경로: `{catalog_id}/original.{ext}`) → 공개 URL을 catalogs.image_url 업데이트
3) 16:9 크롭본을 Storage 업로드 (경로: `{catalog_id}/thumb.{ext}`) → catalogs.thumbnail_url 업데이트
4) catalog_edit_logs INSERT (action='created', changes에 전체 값 스냅샷)
5) 성공 토스트 + 리스트 새로고침

업로드 진행률 표시. 한 단계라도 실패 시 트랜잭션처럼 롤백(생성된 catalog row와 Storage 객체 삭제).
유효성: zod 스키마로 통일. 서버에서도 동일하게 검증.
파일 크기/형식 검증은 클라이언트 + 서버 양쪽에서.
```

### Stage 7 프롬프트 — 수정 + 수정 로그 자동 기록

```
모달의 "수정" 버튼 클릭 시 인라인 수정 모드로 전환. 로그인 사용자만.

- 동일한 폼 컴포넌트를 재사용(생성 다이얼로그와 공유). 초기값은 현재 카탈로그 데이터.
- 이미지 교체 옵션: "이미지 교체" 버튼 클릭 시 새 파일 업로드 → 기존 image_url/thumbnail_url 교체. 썸네일 크롭 위치도 재조정 가능.
- 저장 시:
  1) 변경된 필드만 diff 계산. 추적 대상: customer_name, domain, proposal_type_id, site_type_id, design_tool, figma_url, local_path, memo, image_url, thumbnail_url.
  2) 각 필드의 변경 전 값(before)과 변경 후 값(after) 모두 jsonb로 저장 → 수동 롤백 가능.
  3) catalogs UPDATE (변경된 필드만)
  4) catalog_edit_logs INSERT (action='updated', changes={field: {before, after}}, actor_id=current user)
  5) 이미지 교체된 경우 이전 Storage 객체 삭제
  6) 성공 토스트, 모달은 보기 모드로 전환, 수정 로그 섹션 갱신

수정 로그 표시 포맷 예:
"홍길동 · 2026-05-26 14:32 · 고객명을 'A대학교' → 'B대학교'로 변경, 메모 수정, 이미지 교체"

분류 라벨 변경 시 ID가 아니라 사람이 읽을 수 있는 이름으로 표시 (서버에서 조인해서 라벨로 변환 후 저장).
diff 계산은 클라이언트가 아니라 Server Action에서. 클라이언트 조작으로 가짜 로그 못 남기게.

수정 로그에 "이 시점으로 되돌리기" 버튼은 V2. V1에서는 before 값이 보관만 됨.
```

### Stage 8 프롬프트 — 삭제 + 확인 절차 + Soft delete

```
모달의 "삭제" 버튼 클릭 시 확인 절차 추가.

확인 모달:
- 제목: "이 카탈로그를 삭제하시겠습니까?"
- 본문: "삭제된 카탈로그는 30일간 휴지통에 보관되며, 그 후 영구 삭제됩니다."
- 추가 보호: 입력창에 해당 카탈로그의 고객명을 정확히 타이핑해야 "삭제" 버튼 활성화.
- 버튼: "취소", "삭제" (빨강, 비활성 상태로 시작)

삭제 흐름 (Server Action):
1) catalogs UPDATE deleted_at = now()  (hard delete 아님)
2) catalog_edit_logs INSERT (action='deleted', changes={customer_name, snapshot: 전체 row})
3) 모달 닫고 리스트에서 제거. 토스트에 "삭제됨. 5초 내 실행 취소" 버튼 → 클릭 시 deleted_at = null로 복원 (action='restored' 로그).

휴지통 페이지 (/trash) — **V1 필수**:
- 로그인 사용자만 접근. 비로그인은 /login으로 리다이렉트.
- deleted_at IS NOT NULL인 카탈로그 목록을 deleted_at desc로 표시.
- 각 항목 카드에 "남은 보관 기간 N일", "복원" 버튼, "영구 삭제" 버튼.
- 영구 삭제 시 한 번 더 확인 모달(고객명 텍스트 입력) → catalogs DELETE + Storage 객체 모두 제거 + edit_logs는 catalog_id FK cascade로 같이 제거.

cron (Supabase scheduled function — supabase pg_cron 확장 사용):
- 매일 1회 deleted_at < now() - interval '30 days' 인 항목을 위 영구 삭제 흐름과 동일하게 처리.
- /supabase/migrations/에 pg_cron job 등록 SQL 포함.
```

### Stage 9 프롬프트 — 어드민(분류값 관리) + 마감

```
A) 어드민: 분류값 관리 페이지 /admin (로그인 사용자만, 추후 admin role 분리 가능하게 구조만 잡기)

- /admin/proposal-types: catalog_proposal_types CRUD (간단한 테이블 UI, inline edit, 추가/숨김(is_active=false)/정렬)
- /admin/site-types: catalog_site_types CRUD (간단한 테이블 UI)

B) 마감

- 모바일 반응형 점검 (특히 모달과 카드 그리드)
- 빈 상태 / 에러 상태 / 로딩 상태 일관되게
- 글로벌 에러 바운더리 /app/error.tsx
- 404 페이지
- SEO 메타: 페이지별 title/description, OG 이미지(대표 카드 썸네일 또는 기본 이미지)
- robots.txt, sitemap.ts
- Lighthouse 검사 후 이미지 lazy loading / Next/Image 적용 확인
- 접근성: 모달 포커스 트랩, alt 텍스트, 키보드 네비게이션, 색상 대비
- Sentry 또는 Vercel Analytics 연동 (선택)
- Vercel 배포 + 도메인 연결 + 환경변수 설정
- Supabase 프로덕션 프로젝트와 분리 (dev/prod)

배포 전 체크리스트를 /DEPLOY.md 로 만들어줘.
```

---

## 6. 추천 추가 기능

지금 단계에서 같이 넣으면 좋은 것 / V2로 미뤄도 되는 것 구분.

**V1에 같이 넣으면 좋음** (대부분 위에 반영됨)
- **고객명/도메인 검색**: 필터만으론 사람이 못 찾음. 항상 쓰임. → 반영.
- **무한 스크롤**: 100개 넘으면 필수. → 반영.
- **Soft delete + 휴지통**: → 반영.
- **수정 로그에 이전 값 저장**: → 반영.
- **공유 가능한 URL (모달 직링크)**: Slack에 카드 링크 던질 때 유용. → 반영.
- **OG 이미지**: 위 링크 던졌을 때 Slack 미리보기 뜨도록.
- **라이트박스 줌/팬(원본 사이즈 보기)**: 디테일 확인용. → 반영.

**V2로 미뤄도 됨**
- **태그 시스템**: 자유 태그(컬러, 무드, 학과 등). 검색 풍부해짐.
- **시안 버전 그룹핑**: 1차→2차→최종을 한 묶음으로 연결 (parent_id 또는 group_id).
- **즐겨찾기**: 개인별 북마크.
- **다운로드 통계**: 어떤 시안이 자주 쓰이는지 → 가장 잘 쓰이는 톤 파악.
- **댓글/피드백**: 사내 코멘트 (Slack 쓰면 불필요할 수도).
- **변경 알림**: 특정 디자인을 watch 하는 사람에게 변경 이메일.
- **이미지 비교 (before/after)**: 1차 vs 2차 시안 나란히 비교.
- **bulk 일괄 등록**: 폴더 통째로 드래그 → 자동 분류 시도.
- **관리자 역할 분리**: 분류값 관리는 관리자만 등으로 강화.
- **사내 SSO 통합**: Google OAuth 외 회사 IdP가 있다면.

**무료로 얻을 수 있는 것**
- **다크모드**: Tailwind + next-themes로 1시간이면 끝남. 카탈로그 보는 사람이 디자이너라 의외로 만족도 높음.
- **이미지 lazy + blur placeholder**: Next/Image 기본 기능, 체감 속도 큰 차이.

---

## 7. 결정 완료 (모두 위에 반영됨)

| 항목 | 결정값 |
|---|---|
| 이미지 형식 / 용량 | jpg/png/webp, 장당 10MB |
| 다운로드 파일명 규칙 | `{customer_name}_{proposal_type_name}_{NN}.{ext}` (한글 그대로) |
| 시안 경로 필드 | `figma_url` + `local_path` 2필드 분리 |
| 휴지통 페이지 | V1 필수 포함 |
| 이미지 모델 | 1 이미지 = 1 카드 (컨셉별 분리 등록) |
| 카테고리 확장 | V1은 카탈로그 전용. 로고는 V2에 `/logo` 라우트 + `logos` 테이블 별도 분리. |
| 라이트박스 | 화면맞춤(기본) + 원본 사이즈 줌/팬(휠·핀치·드래그) |

남은 자유도(코딩 단계에서 선택):
- 어드민 권한 분리(role 컬럼) — V1은 로그인 사용자 = 어드민으로 보고, role 컬럼만 미리 추가해 두기.
- pg_cron vs Supabase Edge Function — 휴지통 정리 cron 선택은 구현 시 결정.
