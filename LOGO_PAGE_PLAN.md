# 고객사 로고 페이지 개발 계획 (V2)

> 카탈로그 V1(`DEVELOPMENT_PLAN.md`) 운영이 안정된 후 추가. 별도 라우트(`/logo`)와 별도 테이블로 분리. 단, `profiles`, 인증(Google OAuth + @xinics.com), 휴지통 cron 등 공통 인프라는 카탈로그와 재사용.

---

## 1. 짚어야 할 부분

**(1) 데이터 분리 ≠ 기능 분리**
`customers` + `contracts` + `logos` 3개 테이블로 분리하되, **화면/기능은 묶여서 작동**. 사용자가 "지금 계약 중인 고객 로고만 보고/다운로드"를 원하면 SQL이 `customers JOIN contracts JOIN contract_scope_links`로 묶어서 결과 노출. 데이터 분리 이유는 **한 고객사가 여러 계약을 시간 축으로 가지기 때문** (예: 2023 카탈로그 → 2024 LMS 갱신). 로고에 계약 컬럼을 직접 넣으면 다중 계약/이력 추적 불가.

**(2) 계약 상태: 자동 계산 3종만**
예정/진행/만료. (시작일, 종료일, 오늘) 기준 자동. "변경"은 제외.

**(3) 만료된 고객 로고 처리**
삭제하지 않고 보관. 필터 기본값은 "현재 계약 중인 고객만". "전체 보기" 토글로 만료/예정도 노출.

**(4) 원본 자산은 1장만 보관 (PNG 또는 SVG), 출력은 동적 합성**
원본은 **투명 배경 PNG 또는 SVG 1장** (테두리 없는 깔끔한 로고)만 고객사당 보관. 배경/테두리/그리드 옵션은 다운로드 시 서버에서 즉석 합성.

**(5) 다운로드 옵션**
- **개별 다운로드**: 원본 그대로 (PNG면 PNG, SVG면 SVG)
- **통이미지 다운로드**: 옵션 모두 사용자 설정 가능
  - 배경: 투명 / 흰색
  - 테두리: 있음 / 없음
  - 그리드 열 수: 사용자 지정 (기본 5)
- 통이미지에는 **현재 필터된 고객만** 포함

---

## 2. 데이터 모델

```
customers                  -- 고객사 마스터
  id, name, sort_name,      -- sort_name: 가나다 정렬용 (예: '가톨릭대학교')
  domain, memo,
  created_at, updated_at, deleted_at

contract_scopes            -- 계약 범위 마스터 (DB 관리: 카탈로그/LMS/CMS/AI Chat/AI Tutor/트랜스라이브 등)
  id, slug, name, sort_order, is_active

contract_vendors           -- 계약 업체 마스터
  id, name, created_at

contracts                  -- 계약 본체 (customer 1 : N contracts)
  id, customer_id (FK), vendor_id (FK contract_vendors, nullable),
  start_date, end_date,
  memo,
  created_at, updated_at

contract_scope_links       -- contracts ↔ contract_scopes 다대다
  contract_id (FK), scope_id (FK)
  PRIMARY KEY (contract_id, scope_id)

-- 자동 상태 계산 (view 또는 SELECT 시 CASE):
--   start_date > today: '예정'
--   end_date < today:   '만료'
--   else:               '진행'

logos                      -- 고객사 로고 (customer 1 : 1 logo)
  id, customer_id (FK, UNIQUE),
  image_url,                -- 투명 배경 PNG 또는 SVG 원본 (1장)
  file_format text,         -- 'png' | 'svg'
  file_name,                -- 원본 파일명 (다운로드 시 기본 사용)
  file_size_bytes,
  width, height,            -- 원본 해상도 (PNG만, SVG는 viewBox 기반)
  created_by, created_at, updated_at, deleted_at

logo_edit_logs             -- 로고 수정 로그
  id, logo_id (FK),
  actor_id, action, changes (jsonb), created_at
```

**RLS 정책 요지**
- `customers`, `contracts`, `contract_scopes`, `contract_vendors`, `contract_scope_links`, `logos`: SELECT public, 쓰기는 인증된 사용자
- `logo_edit_logs`: SELECT/INSERT 인증된 사용자, UPDATE/DELETE 차단

**Storage 버킷**: `logo-files` (public read, authenticated write). 경로: `{customer_id}/logo.{png|svg}`.

---

## 3. 화면 구성

### `/logo` 리스트 페이지
- 상단 필터:
  - **계약 상태 필터** (기본값: "진행 중"만. 토글로 예정/만료/전체)
  - **계약 범위 멀티 선택** (카탈로그/LMS/CMS/AI Chat 등)
  - **기간 선택**: 특정 날짜 또는 기간 → 그 시점에 활성 계약이었던 고객만
  - **계약 업체 셀렉트**
  - **검색**: 고객사명, 도메인
  - **정렬**: 가나다순(기본), 최신 계약순(가장 최근 contracts.start_date 기준)
- 본문: 고객사별 카드 그리드 (5열).
  - 카드: 로고 원본 표시 + 고객사명 + 계약 상태 뱃지 + 활성 계약 범위 칩 + 업로드 일시
  - 카드 배경: 다크 모드(투명 PNG 잘 보임)
  - 카드 클릭 → 상세 페이지
- 상단 우측 (로그인 사용자만):
  - **"통이미지 다운로드"** 버튼 → 옵션 다이얼로그 열림
  - "새 고객사 등록", "휴지통" 버튼

### 통이미지 다운로드 다이얼로그
- 현재 필터/정렬 결과 N개 고객사가 대상임을 명시
- 옵션:
  - **배경**: 투명 / 흰색 (라디오)
  - **테두리**: 있음 / 없음 (토글)
  - **그리드 열 수**: 사용자 입력 (1~10, 기본 5). 행 수는 자동 계산.
- 실시간 미리보기 (작은 썸네일, 옵션 변경 시 즉시 갱신)
- "다운로드" 버튼 → `/api/logos/composite` 호출 → PNG 응답

### `/logo/{customer_id}` 상세 페이지
- 좌측: 로고 미리보기. 토글로 배경 변경(투명 체크패턴 / 흰색 / 검정).
- 우측:
  - 고객사 정보 (이름, 도메인, 메모)
  - 계약 정보 (활성 계약 카드들: 업체, 범위 칩, 기간, 상태). "+ 계약 추가" 버튼
  - 업로드 일시, 최근 수정 일시
  - 수정 로그
- 액션 (로그인 사용자만):
  - **개별 로고 다운로드** 버튼 (원본 PNG/SVG 그대로)
  - "로고 교체", "고객사 정보 수정", "계약 추가/수정/만료처리", "삭제" 버튼

### 통이미지 합성 API
`/api/logos/composite` (Route Handler):
- 입력 (POST body):
  - `customer_ids[]`: 합성 대상 (필터 결과를 그대로 전달)
  - `background`: `'transparent' | 'white'`
  - `border`: `boolean`
  - `columns`: `number`
  - `sort`: `'name' | 'recent_contract'`
- 처리:
  - 각 customer의 logo.image_url을 Supabase Storage에서 가져옴
  - SVG는 raster로 변환해서 합성 (sharp가 native 지원)
  - **Sharp** 라이브러리로 격자 합성:
    - 셀 비율 16:9 (정렬감 통일)
    - 각 로고는 셀 안에서 비율 유지 + 중앙 정렬 + 셀 여백 5%
    - 테두리: 옵션 시 셀 사이 1~2px 라인
    - 배경: 투명(alpha) 또는 #FFFFFF
  - 정렬 옵션 적용 (가나다순 = customers.sort_name, 최신 계약순 = 가장 최근 contracts.start_date desc)
- 응답: PNG 스트림, 파일명 `로고통이미지_{YYYY-MM-DD}_{N개}.png`

### 개별 다운로드
- 원본 fetch → blob → object URL → 파일명 `{customer_name}_logo.{png|svg}` 한글 그대로.

---

## 4. 개발 단계 개요

단계별 프롬프트는 카탈로그 V1 완료 후 별도 작성.

1. 스키마 마이그레이션: customers, contracts, contract_scopes, contract_vendors, contract_scope_links, logos, logo_edit_logs
2. 시드: contract_scopes 기본값 (카탈로그/LMS/CMS/AI Chat/AI Tutor/트랜스라이브)
3. `/admin`에 customer / contract / scope / vendor 관리 페이지 추가
4. `/logo` 리스트 (필터, 검색, 정렬 2종, 5열 카드)
5. `/logo/{customer_id}` 상세 페이지 (수정 로그 포함)
6. 로고 업로드 (1 고객사당 1장, PNG 또는 SVG, 투명 배경 권장 메시지)
7. 개별 다운로드 (원본 그대로, PNG/SVG)
8. **통이미지 합성 Route Handler** (`sharp`로 격자 합성, 배경/테두리/열수/정렬 옵션, 미리보기 다이얼로그 → 다운로드)
9. 휴지통 (logos / customers soft delete, 카탈로그 cron 재사용)
10. 헤더 메뉴에 `/catalog`, `/logo` 라우트 추가

---

## 5. 시작 전 결정 필요 항목

| 항목 | 결정값 |
|---|---|
| 계약 상태 | 자동 계산 3종 (예정/진행/만료). "변경" 제외 |
| 만료 고객 로고 표시 | 기본 숨김, "전체 보기" 토글로 노출 |
| 로고 파일 형식 | **PNG + SVG**. AI/EPS는 V2.5 |
| 통이미지 옵션 | 배경(투명/흰색), 테두리(있음/없음), 열 수(사용자 지정, 기본 5) |
| 통이미지 셀 비율 | 16:9 고정 (정렬감) — 변경 필요하면 코딩 단계에서 다시 |
| 정렬 옵션 | 가나다순(sort_name), 최신 계약순(가장 최근 start_date desc) |
| 한 고객사 로고 개수 | **1개** (UNIQUE 제약) |
| 계약 알림 | 만료 임박 알림 메일? V2.5로 보류 |

---

## 6. 카탈로그 V1과의 연결점

- **공통 인프라 재사용**: 인증, `profiles`, 휴지통 cron, 어드민 페이지 구조, shadcn 컴포넌트
- **`customers` 테이블 도입 시기**: V2 시작 시점에 카탈로그의 `customer_name` 자유 텍스트도 `customer_id` FK로 마이그레이션 검토 (선택사항, 정규화 효과)
- **헤더 네비게이션**: V1 단일 페이지 → V2부터 `/catalog`, `/logo` 두 라우트로 분기. 헤더에 메뉴 추가
- **합성 라이브러리**: `sharp`는 Vercel/Next.js에서 native binary 이슈가 가끔 발생 → 배포 시 sharp 호환성 점검 (또는 `@vercel/og` 같은 대안)
