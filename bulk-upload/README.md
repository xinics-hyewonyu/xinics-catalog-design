# 카탈로그 벌크 업로드

CSV에 정리한 카탈로그 목록을 한 번에 Supabase로 올리기.

## 1) 자료 준비

이 폴더 안에:

- **`catalogs.csv`** — 메타데이터 테이블 (엑셀에서 편집 후 `CSV UTF-8`로 저장)
- **`images/`** — 폴더 안에 모든 이미지 파일 (jpg / png / webp) — *선택*

예시 템플릿: [`catalogs.template.csv`](./catalogs.template.csv) 를 복사해서 `catalogs.csv`로 저장 후 채워주세요.

### CSV 컬럼

| 컬럼 | 필수 | 설명 |
|---|---|---|
| `image_filename` | – | `images/` 폴더 안의 파일명. 비워두면 이미지 없이 카탈로그가 생성되고 카드엔 placeholder가 표시됨 |
| `site_name` | ✓ | 카탈로그 사이트명 (메인 식별자) |
| `customer_name` | ✓ | 고객사명 |
| `proposal_type` | – | 시안 종류 — `first` / `second` / `final`. 비워두면 분류 없음. |
| `site_type` | – | 사이트 종류 — `basic` / `open_campus` / `cms` / `reservation` |
| `design_tool` | – | `피그마` / `HTML` / `XD` / `포토샵` |
| `file_path` | – | Figma URL 또는 사내 UNC 경로 |
| `catalog_url` | – | 공개된 카탈로그 페이지 URL |
| `memo` | – | 자유 텍스트 (쉼표·줄바꿈 들어가면 `"..."` 따옴표로 감싸기) |

## 2) (선택) 사이트 메인 자동 캡처

`catalog_url`이 채워진 행에 대해 헤드리스 Chromium으로 메인 화면을 캡처하고
`image_filename` 컬럼을 자동으로 채워줍니다.

```bash
pnpm dlx tsx scripts/screenshot-sites.ts
```

- 캡처: 1600×900 viewport, 도메인 로드 후 1.5초 대기 → PNG 저장
- 이미 `image_filename`이 채워진 행은 건너뜀 (재실행 안전)
- 결과 파일: `bulk-upload/images/cap-NNN.png`
- SSO/login 페이지가 뜨는 사이트는 그 화면이 그대로 캡처됨 (수동 교체 필요)
- 10건마다 CSV 중간 저장 — 도중에 끊겨도 진행분 보존

## 3) 업로드 실행

```bash
pnpm dlx tsx scripts/bulk-upload.ts
```

행마다 결과 출력:
- `[ok]   row 2: 한양대학교 입학처 2026 카탈로그`
- `[fail] row 5: image not found at ...` ← 실패한 것만 CSV에서 수정 후 재실행

## 4) gitignore

`catalogs.csv`와 `images/` 폴더는 `.gitignore` 처리되어 있어요 (실제 자료가 레포에 안 올라감). 템플릿과 README만 커밋.
