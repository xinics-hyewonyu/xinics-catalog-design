# 카탈로그 벌크 업로드

50건 이상을 한 번에 Supabase로 올리는 워크플로우.

## 1) 자료 준비

이 폴더 안에:

- **`catalogs.csv`** — 메타데이터 테이블 (엑셀에서 편집 후 `CSV UTF-8`로 저장)
- **`images/`** — 폴더 안에 모든 이미지 파일 (jpg / png / webp)

예시 템플릿: [`catalogs.template.csv`](./catalogs.template.csv) 를 복사해서 `catalogs.csv`로 저장 후 채워주세요.

### CSV 컬럼

| 컬럼 | 필수 | 설명 | 예시 |
|---|---|---|---|
| `image_filename` | ✓ | `images/` 폴더 안의 파일명 (확장자 포함) | `hanyang-2026.png` |
| `site_name` | ✓ | 카탈로그 사이트명 (메인 식별자) | `한양대학교 입학처 2026 카탈로그` |
| `customer_name` | ✓ | 고객사명 | `한양대학교` |
| `proposal_type` | ✓ | 시안 종류 — `first` / `second` / `final` | `final` |
| `site_type` | – | 사이트 종류 — `basic` / `open_campus` | `basic` |
| `design_tool` | – | `피그마` / `HTML` / `XD` / `포토샵` | `피그마` |
| `file_path` | – | Figma URL 또는 사내 UNC 경로 | `https://www.figma.com/...` |
| `catalog_url` | – | 공개된 카탈로그 페이지 URL | `https://catalog.hanyang.ac.kr/2026` |
| `memo` | – | 자유 텍스트 (쉼표·줄바꿈 들어가면 `"..."` 따옴표로 감싸기) | `"메인 컬러 보라, 카드 강조"` |

- `proposal_type` / `site_type`은 영어 슬러그로 입력 (한국어 라벨로 자동 변환됨)
- 같은 카탈로그를 두 번 올리려면 행 두 개로 분리

## 2) 업로드 실행

```bash
pnpm dlx tsx scripts/bulk-upload.ts
```

스크립트가 행마다:
1. CSV 검증 (필수 컬럼 + 슬러그 유효성)
2. 이미지 파일 존재 확인
3. Supabase Storage(`catalog-images/<uuid>/original.<ext>`)에 업로드
4. `catalogs` 테이블에 row 삽입
5. `catalog_edit_logs`에 `created` 로그 기록

각 행 결과를 `[ok]` / `[fail]`로 출력. 실패한 행만 다시 올리려면 CSV에서 성공한 행을 빼고 재실행.

## 3) gitignore

`catalogs.csv`와 `images/` 폴더는 `.gitignore` 처리되어 있어요 (실제 자료가 레포에 안 올라감). 템플릿과 README만 커밋.
