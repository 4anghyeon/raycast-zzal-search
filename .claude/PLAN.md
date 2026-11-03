# zzal 개발 계획

짤 이미지를 Cloudflare(R2 + D1)에 저장하고, Raycast에서 **키워드로 검색 → 붙여넣기/복사**, **등록·수정·삭제**까지 하는 개인용 도구.

---

## 1. 목표와 범위

### 목표

- Raycast에서 키워드로 짤을 찾아 Enter 한 번에 앞 앱(카톡, 슬랙 등)에 붙여넣기
- 짤의 등록·수정·삭제를 전부 Raycast 안에서 처리
- 데이터는 Cloudflare에 두고, 다른 컴퓨터에서는 확장만 설치하면 같은 짤을 그대로 사용
- 특정 OS에 종속되지 않는 구조. 지금 타깃은 macOS뿐이지만 OS 전용 도구를 쓰지 않음

### 범위 밖

- 아이폰 앱 / 키보드 확장
- 윈도우 지원 (막지는 않지만 신경 쓰지 않음)
- 여러 사용자 / 공유 기능
- Raycast Store 배포

---

## 2. 설계 원칙

1. **서버가 단일 진실 공급원.** 메타데이터와 파일은 Cloudflare에만 있고, 클라이언트는 캐시만 가진다.
2. **API가 경계.** 클라이언트는 Worker API만 호출하고 R2·D1에 직접 접근하지 않는다. 나중에 클라이언트가 바뀌거나 늘어나도 서버는 그대로 둔다.
3. **OS 비종속.**
   - `sips`, `xattr`, AppleScript, `osascript` 등 macOS 전용 명령어 사용 금지
   - 이미지 처리(썸네일)는 서버에서 처리
   - 파일 경로는 하드코딩하지 않고 Raycast `environment.supportPath` 사용
   - 파일·해시 처리는 Node 표준 모듈(`fs`, `path`, `crypto`)만 사용
4. **검색은 로컬에서.** 서버에 검색 API를 만들지 않는다. 메타 전체를 동기화해서 로컬에서 필터링한다 (즉시 응답, 오프라인 동작).
5. **백엔드는 최소한으로.** 엔드포인트는 CRUD + 파일 조회뿐.

---

## 3. 아키텍처

```
┌──────────────┐   Bearer 토큰   ┌──────────────────┐
│ Raycast 확장 │ ──────────────▶ │ Worker API (Hono)│
│              │                 │                  │
│ - 로컬 메타  │ ◀── 변경분 ──── │                  │──▶ D1: 메타데이터
│ - 썸네일 캐시│                 │                  │──▶ R2: 원본, 썸네일
│ - 원본 캐시  │ ◀── 파일 ────── │                  │──▶ Images 바인딩: 썸네일 생성
└──────────────┘                 └──────────────────┘
```

### 저장소 역할

| 저장소 | 내용 |
|--------|------|
| D1 | 짤 메타데이터 (이름, 키워드, 파일 정보, 타임스탬프) |
| R2 | `originals/{id}.{ext}`, `thumbs/{id}.webp` |
| Images 바인딩 | 등록 시 썸네일 1회 생성 (조회 시에는 사용하지 않음) |

### 무료 한도 (2026-11 기준 공식 문서)

| 서비스 | 무료 한도 | 이 프로젝트에서 |
|--------|-----------|-----------------|
| Workers | 요청 10만/일, 요청당 CPU 10ms | 개인 사용으로는 도달 불가 |
| D1 | 읽기 500만 행/일, 쓰기 10만 행/일, 저장 5GB | 메타데이터만 저장 |
| R2 | 저장 10GB/월, Class A 100만/월, Class B 1,000만/월, 전송 무료 | 짤 1개 2MB 기준 약 5천 개 |
| Images | 고유 변환 5,000건/월 | 등록 시 1회만 호출 → 월 등록 5천 개까지 |

한도를 넘으면 과금이 아니라 에러가 난다 (Workers·D1은 UTC 0시 리셋, Images는 새 변환만 실패).

---

## 4. 확정된 결정

| # | 항목 | 결정 | 이유 |
|---|------|------|------|
| C1 | 저장소 | Cloudflare (Workers + D1 + R2) | 나중에 다른 클라이언트를 붙일 수 있는 구조 |
| C2 | 키워드 저장 방식 | D1 메타데이터 | Finder 태그·파일명 규칙·이미지 내장 메타 사용 안 함 |
| C3 | 짤 id | 원본 파일 SHA-256 해시 (앞 16자리 hex) | 중복 등록 방지, 파일명과 무관 |
| C4 | 썸네일 | 등록 시 서버에서 1회 생성, R2에 저장 | OS 비종속, 바인딩 호출 횟수 최소화 |
| C5 | 이미지 표시 | 썸네일을 로컬 캐시에 받아 파일 경로로 표시 | Grid 이미지 URL의 인증 헤더 지원 여부와 무관, 오프라인 동작 |
| C6 | 삭제 | soft delete (`deleted_at`) + 주기적 영구 삭제 | 변경분 동기화 시 삭제 사실을 전달해야 함 |
| C7 | 수정 범위 | 이름, 키워드만 | 이미지 교체는 삭제 후 재등록 (해시 id와 일관성) |
| C8 | 인증 | 단일 Bearer 토큰 (Worker 시크릿) | 1인 사용 |
| C9 | 저장소 구성 | 모노레포 (npm workspaces) | 다른 컴퓨터에서 clone 한 번으로 설치 |

---

## 5. 미결정 사항

| # | 항목 | 선택지 | 결정 |
|---|------|--------|------|
| D1 | Enter 기본 동작 | 붙여넣기 / 복사 (설정으로 변경 가능) | 붙여넣기 (잠정) |
| D2 | 원본 캐시 정책 | 사용한 짤만 캐시 / 전체 미리 받기 | 사용한 짤만 (잠정) |
| D3 | 영구 삭제 주기 | 30일 / 수동 | 30일 (잠정) |
| D4 | 파일 크기 상한 | 10MB / 20MB | 20MB (Images 입력 한도) |
| D5 | 일괄 가져오기 커맨드 | M7에 포함 / 보류 | TBD |

---

## 6. 0단계: 사전 검증

코드 작성 전에 확인한다. **결과에 따라 설계가 바뀌는 항목만** 남겼다.

| # | 검증 항목 | 방법 | 실패 시 대응 |
|---|-----------|------|--------------|
| V1 | 무료 플랜에서 Images 바인딩 호출 가능 | 최소 Worker를 배포해서 R2 이미지에 `env.IMAGES.input().transform()` 호출 | 썸네일 없이 원본만 사용 (C4 폐기) |
| V2 | GIF `anim: false` 결과 | 움직이는 GIF로 V1 실행 → 첫 프레임 정지 이미지인지 확인 | 썸네일 대신 원본 표시 |
| V3 | 바인딩 과금 집계 방식 | V1~V2 후 대시보드에서 Images 사용량이 호출 수만큼 늘었는지 확인 | 등록 시 1회 호출 원칙이 맞는지 재확인 |
| V4 | 파일 붙여넣기 대상 앱 | 로컬 GIF/PNG를 `Clipboard.paste({ file })`로 카톡, 슬랙, 디스코드, 브라우저 입력창에 붙여넣기. GIF 애니메이션 유지 여부 확인 | 안 되는 앱 목록을 README에 기록 |
| V5 | Grid에 로컬 파일 경로 이미지 표시 | `content`에 캐시 파일 절대 경로 지정 | `file://` URL 형태 등 다른 지정 방식 확인 |
| V6 | 워크스페이스 공유 패키지 번들링 | `ray develop`에서 `@zzal/shared` import가 번들되는지 확인 | 공유 타입을 확장 안에 복사 |

V1~V3은 Cloudflare 계정에서, V4~V6은 맥에서 진행한다.

---

## 7. 데이터 모델

### D1 스키마

```sql
CREATE TABLE zzals (
  id           TEXT PRIMARY KEY,           -- SHA-256 앞 16자리 hex
  name         TEXT NOT NULL,
  keywords     TEXT NOT NULL DEFAULT '[]', -- JSON 배열
  mime         TEXT NOT NULL,              -- image/gif, image/png ...
  ext          TEXT NOT NULL,
  size         INTEGER NOT NULL,           -- bytes
  width        INTEGER,
  height       INTEGER,
  has_thumb    INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,           -- epoch ms (서버 시각)
  updated_at   INTEGER NOT NULL,
  deleted_at   INTEGER
);

CREATE INDEX idx_zzals_updated_at ON zzals (updated_at);
```

- 키워드는 JSON 배열로 저장한다. 검색이 로컬에서 이뤄지므로 정규화 테이블이 필요 없다.
- 모든 타임스탬프는 **서버 시각**으로 기록한다. 클라이언트 시계를 신뢰하지 않는다.

### 공유 타입 (`@zzal/shared`)

```ts
interface Zzal {
  id: string;
  name: string;
  keywords: string[];
  mime: string;
  ext: string;
  size: number;
  width: number | null;
  height: number | null;
  hasThumb: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

interface SyncResponse {
  items: Zzal[];       // 삭제된 항목 포함
  serverTime: number;  // 다음 동기화의 since 값
}
```

### 정규화 규칙

- 이름·키워드: `trim()` → `normalize("NFC")` → 빈 값 제거 → 중복 제거
- 키워드 개수 상한 20개, 각 30자 (임시값)
- 정규화는 **서버에서** 한다. 클라이언트가 어떤 형태로 보내도 저장되는 값은 동일하다.

---

## 8. API 명세

모든 요청에 `Authorization: Bearer <token>` 필요. 실패 시 `401`.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/zzals?since={ms}` | 변경분 동기화. `since` 생략 시 전체 |
| POST | `/zzals` | 등록 (multipart: `file`, `name`, `keywords`) |
| PATCH | `/zzals/:id` | 이름, 키워드 수정 |
| DELETE | `/zzals/:id` | soft delete |
| GET | `/zzals/:id/file` | 원본 다운로드 |
| GET | `/zzals/:id/thumb` | 썸네일 다운로드 |

### GET `/zzals?since=`

- `updated_at >= since`인 항목 반환 (삭제 항목 포함)
- `>=`를 쓰는 이유: 같은 밀리초에 여러 건이 갱신되면 `>`로는 누락될 수 있다. 중복은 클라이언트가 id로 upsert해서 흡수한다.
- 응답의 `serverTime`을 다음 `since`로 사용

### POST `/zzals`

1. 파일 크기 확인 (D4 상한 초과 시 `413`)
2. 매직 바이트로 형식 판별 (확장자·Content-Type 신뢰 안 함). 지원: png, jpeg, gif, webp. 그 외 `415`
3. SHA-256 계산 → id 생성
4. 같은 id 존재 시
   - 삭제되지 않은 상태 → `409` + 기존 항목 반환
   - soft delete 상태 → 복구하고 이름·키워드 갱신 (`200`)
5. R2에 원본 저장
6. Images 바인딩으로 썸네일 생성 (`width: 320`, `anim: false`, webp) → R2 저장. **실패해도 등록은 성공**시키고 `has_thumb = 0`
7. D1에 행 삽입 → `201` + 항목 반환

HEIC는 지원하지 않는다. 짤 용도에서 드물고, 붙여넣기 대상 앱 호환성이 낮다.

### PATCH `/zzals/:id`

- body: `{ name?, keywords? }`
- 삭제된 항목이면 `404`
- `updated_at` 갱신

### DELETE `/zzals/:id`

- `deleted_at`, `updated_at`을 현재 시각으로 설정
- R2 파일은 그대로 둔다 (영구 삭제 작업에서 처리)

### 영구 삭제

- Cron Trigger로 하루 1회, `deleted_at`이 D3 기간을 넘은 항목의 R2 파일과 D1 행 삭제
- 삭제된 행이 사라진 뒤 그 이전 `since`로 동기화하는 클라이언트는 삭제 사실을 못 받는다 → D3 기간보다 오래 동기화하지 않은 클라이언트는 **전체 재동기화**하도록 한다 (클라이언트가 `serverTime - lastSync > D3`이면 `since` 생략)

### 에러 응답 형식

```json
{ "error": { "code": "DUPLICATE", "message": "이미 등록된 짤입니다", "item": { ... } } }
```

---

## 9. Raycast 확장

### 커맨드

| 커맨드 | 모드 | 설명 |
|--------|------|------|
| 짤 검색 | Grid | 검색, 붙여넣기/복사, 수정·삭제 진입 |
| 짤 등록 | Form | 파일 선택 + 이름 + 키워드 |
| 짤 가져오기 | Form | 로컬 폴더 일괄 업로드 (D5) |

### 짤 검색 (Grid)

- 아이템
  - `content`: 썸네일 캐시 경로 (없으면 원본 캐시 경로, 둘 다 없으면 플레이스홀더 아이콘)
  - `title`: 이름
  - `keywords`: 키워드 배열
- 필터링은 Raycast 기본 필터 (`title` + `keywords`)
- `useFrecencySorting`으로 자주 쓴 짤 상단 배치
- `Grid.Dropdown`: 전체 / 키워드별 보기 (M6)

| 단축키 | 액션 |
|--------|------|
| Enter | 붙여넣기 (D1 설정에 따라 복사와 교체) |
| ⌘ Enter | 복사 |
| ⌘ E | 수정 (Form push) |
| ⌃ X | 삭제 (`confirmAlert` 후 실행) |
| ⌘ R | 동기화 |

단축키는 `Keyboard.Shortcut.Common`에 해당 항목이 있으면 그것을 우선 사용한다.

### 짤 등록 (Form)

- `Form.FilePicker` (여러 개 선택 허용, 파일만)
- 이름: 파일 하나일 때만 입력. 여러 개면 파일명(확장자 제외)을 기본 이름으로 사용
- 키워드: `Form.TextField`, 쉼표로 구분. 여러 파일 선택 시 모든 파일에 공통 적용
  - `Form.TagPicker`는 미리 정의된 항목에서 고르는 컴포넌트라 새 키워드 입력에 맞지 않아 사용하지 않는다
- 제출 결과
  - 성공: 토스트 + 로컬 캐시에 즉시 반영
  - `409` 중복: "이미 등록된 짤" 토스트 + 기존 짤 수정 화면으로 이동하는 액션 제공
  - 여러 개 업로드 시 성공/중복/실패 개수 요약 토스트

### 수정 (Form)

- 이름, 키워드 초기값 채워서 표시
- 제출 시 PATCH → 로컬 캐시 갱신 → pop

### 삭제

- `confirmAlert` (destructive 스타일) → DELETE → 로컬 캐시에서 제거

### 설정 (preferences)

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `apiUrl` | textfield | O | Worker URL |
| `apiToken` | password | O | Bearer 토큰 |
| `primaryAction` | dropdown | X | `paste` / `copy` |

### 로컬 저장

| 대상 | 위치 | 비고 |
|------|------|------|
| 메타 목록 | Raycast `Cache` | `{ items: Record<id, Zzal>, lastSync }` |
| 썸네일 | `{supportPath}/thumbs/{id}.webp` | 동기화 시 없는 것만 다운로드 |
| 원본 | `{supportPath}/originals/{id}.{ext}` | 붙여넣기/복사 시 없으면 다운로드 (D2) |

- 동기화 결과에 `deletedAt`이 있으면 메타와 캐시 파일 모두 삭제
- 다운로드는 동시 실행 수 제한 (예: 6개)
- 쓰기는 임시 파일에 쓴 뒤 rename (중간에 끊겨도 깨진 파일이 남지 않게)

### 데이터 흐름

1. 커맨드 실행 → 캐시된 목록을 즉시 표시
2. 백그라운드로 `GET /zzals?since=` → 캐시 병합 → 빠진 썸네일 다운로드
3. 붙여넣기 시 원본 캐시 확인 → 없으면 다운로드(로딩 토스트) → `Clipboard.paste({ file })`

`@raycast/utils`의 `useCachedPromise`로 1~2를 처리한다.

---

## 10. 프로젝트 구조

```
zzal/
├── package.json              # npm workspaces 루트
├── packages/
│   └── shared/               # @zzal/shared: 타입, 정규화 함수
│       └── src/index.ts
├── worker/
│   ├── wrangler.jsonc        # D1, R2, Images 바인딩, cron
│   ├── migrations/
│   │   └── 0001_init.sql
│   └── src/
│       ├── index.ts          # Hono 앱, 라우팅
│       ├── auth.ts
│       ├── routes/zzals.ts
│       ├── lib/
│       │   ├── image.ts      # 매직 바이트 판별, 썸네일 생성
│       │   └── hash.ts
│       └── cron.ts           # 영구 삭제
└── raycast/
    ├── package.json          # Raycast manifest
    ├── assets/icon.png
    └── src/
        ├── search-zzal.tsx
        ├── register-zzal.tsx
        ├── import-zzal.tsx
        ├── components/
        │   └── EditForm.tsx
        └── lib/
            ├── api.ts        # fetch 래퍼, 에러 변환
            ├── sync.ts       # 변경분 동기화, 캐시 병합
            └── files.ts      # 썸네일·원본 캐시
```

정규화 함수를 `shared`에 두는 이유: 서버가 최종 정규화를 하지만, 클라이언트도 같은 함수로 입력 미리보기·중복 키워드 제거를 해서 결과를 예측 가능하게 한다.

---

## 11. 마일스톤

| # | 내용 | 완료 기준 |
|---|------|-----------|
| M0 | 사전 검증 (V1~V6) | 결과 기록, 실패 항목은 대응안 반영 |
| M1 | 모노레포 + Worker 골격 | `wrangler dev`로 인증 미들웨어 동작, D1 마이그레이션 적용 |
| M2 | 등록·조회 API | 파일 업로드 → R2 저장 → 썸네일 생성 → D1 기록, 동기화 API 응답 |
| M3 | 수정·삭제 API + 영구 삭제 cron | PATCH/DELETE 동작, soft delete 항목이 동기화에 포함됨 |
| M4 | Raycast 검색 + 동기화 | Grid에 썸네일 표시, 키워드 검색, 변경분 동기화 |
| M5 | 붙여넣기·복사 | 원본 캐시 다운로드 후 붙여넣기, frecency 정렬 |
| M6 | 등록·수정·삭제 UI | Form 등록(다중), 수정, 삭제 확인창, 중복 처리 |
| M7 | 마무리 | 일괄 가져오기(D5), 키워드 드롭다운, 예외 처리, README |

M2까지 끝나면 `curl`로 짤을 넣어볼 수 있고, M5까지 끝나면 실사용이 가능하다.

---

## 12. 예외 처리

| 상황 | 처리 |
|------|------|
| 설정 누락 (`apiUrl`, `apiToken`) | EmptyView + 설정 열기 액션 |
| 토큰 오류 (`401`) | 실패 토스트 + 설정 열기 액션 |
| 네트워크 오류 | 캐시된 목록으로 계속 동작, 실패 토스트 1회 |
| 오프라인에서 원본 미캐시 짤 선택 | "오프라인이라 받을 수 없음" 토스트 |
| 무료 한도 초과 (Workers 1027, D1 한도 에러) | 원인을 토스트에 표시, 캐시로 계속 동작 |
| 썸네일 생성 실패 | 등록은 성공, 원본으로 표시 |
| 지원하지 않는 형식 (`415`) | 지원 형식 안내 토스트 |
| 파일 크기 초과 (`413`) | 상한 안내 토스트 |
| 붙여넣기 실패 | 복사로 대체하고 안내 |

---

## 13. 테스트 체크리스트

### API

- [ ] 토큰 없거나 틀리면 `401`
- [ ] 같은 파일 두 번 등록 시 `409` + 기존 항목
- [ ] 삭제한 짤 재등록 시 복구
- [ ] 확장자를 바꾼 파일도 매직 바이트로 올바르게 판별
- [ ] 지원 외 형식 `415`, 크기 초과 `413`
- [ ] GIF 썸네일이 정지 이미지로 생성
- [ ] 같은 밀리초 갱신 항목이 동기화에서 누락되지 않음
- [ ] 한글 키워드 NFD 입력 → NFC로 저장

### Raycast

- [ ] 한글 키워드 검색
- [ ] 다중 파일 등록, 결과 요약 토스트
- [ ] 수정 후 다른 컴퓨터(또는 캐시 초기화 후)에서 반영 확인
- [ ] 삭제 후 다른 컴퓨터에서 목록·캐시 파일 제거 확인
- [ ] 오프라인에서 캐시된 목록 검색, 캐시된 원본 붙여넣기
- [ ] GIF 붙여넣기 시 애니메이션 유지 (V4 대상 앱)
- [ ] 자주 쓴 짤 상단 배치

### OS 비종속 점검

- [ ] 코드에 macOS 전용 명령어·경로 없음 (`sips`, `osascript`, `xattr`, `~/Library` 검색)
- [ ] 파일 경로는 전부 `path.join` + `supportPath` 기반

---

## 14. 리스크

| 리스크 | 가능성 | 대응 |
|--------|--------|------|
| 무료 플랜에서 Images 바인딩 불가 | 낮음 | V1에서 확인, 썸네일 없이 원본 표시 |
| 짤이 많을 때 첫 동기화가 느림 | 중 | 썸네일 동시 다운로드 제한 + 화면에 보이는 것부터 표시 |
| 일부 앱에서 파일 붙여넣기 불가 | 중 | V4 결과 문서화 |
| 토큰 유출 | 낮음 | 토큰 재발급 절차 README에 기록 (`wrangler secret put`) |
| Cloudflare 무료 정책 변경 | 낮음 | API 경계가 있으므로 저장소 교체 시 Worker만 수정 |

---

## 15. 다른 컴퓨터에 설치

```bash
git clone <저장소>
cd zzal
npm install
cd raycast && npm run dev   # 최초 1회 등록, 이후 터미널 종료해도 유지
```

1. Raycast 설정에서 `apiUrl`, `apiToken` 입력
2. 짤 검색 실행 → 첫 동기화로 썸네일 캐시 생성

Worker는 이미 배포되어 있으므로 다시 배포할 필요 없다.

---

## 16. 기술 스택

| 영역 | 선택 |
|------|------|
| 런타임 | Node 22.22.2 이상 (Raycast CLI 요구사항) |
| Raycast | `@raycast/api` 2.x, `@raycast/utils` 2.x |
| Worker | Hono, Wrangler |
| DB / 스토리지 | D1, R2, Images 바인딩 |
| 언어 | TypeScript (Raycast eslint-config 호환 범위 6.x) |
| 모노레포 | npm workspaces |

---

## 참고 문서

- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Images pricing](https://developers.cloudflare.com/images/pricing/)
- [Images binding](https://developers.cloudflare.com/images/optimization/binding/)
- [Images features (`anim`)](https://developers.cloudflare.com/images/optimization/features/)
- [Raycast Clipboard API](https://developers.raycast.com/api-reference/clipboard.md)
- [Raycast Grid API](https://developers.raycast.com/api-reference/user-interface/grid.md)
- [Raycast API Changelog](https://developers.raycast.com/misc/changelog)
