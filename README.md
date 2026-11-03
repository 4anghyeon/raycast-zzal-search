# 짤방

짤방 이미지를 Cloudflare(Worker + D1 + R2 + Images)에 저장하고, Raycast에서 키워드로 검색해 붙여넣기/복사하고 등록, 수정, 삭제까지 하는 개인용 도구입니다.

## 구조 (모노레포, npm workspaces)

```
.
├── packages/shared/   # Zzal 타입, 정규화, 해시(id), 지원 포맷, 보관기간
├── worker/            # Cloudflare Worker (Hono): 등록, 조회, 수정, 삭제 API + 영구 삭제 cron
└── raycast/           # Raycast 확장. 커맨드는 "짤방 검색" 하나뿐이고, 등록/수정/삭제는 그 화면의 액션으로 처리
```

## 다른 컴퓨터에 설치하기 (Worker는 이미 배포되어 있는 경우)

```bash
git clone <저장소>
cd zzal-search
npm install
cd raycast
npm run dev
```

Raycast에서 "짤방 검색" 커맨드의 설정(⌘,)을 열어 입력:

| 항목 | 값 |
|---|---|
| `apiUrl` | 배포된 Worker 주소 (예: `https://zzal-worker.<계정>.workers.dev`) |
| `apiToken` | Worker에 설정된 `AUTH_TOKEN` |

## Worker를 처음부터 새로 세팅하는 경우

```bash
cd worker
npx wrangler login

npx wrangler d1 create zzal-db
# 출력된 database_id를 wrangler.jsonc의 d1_databases[0].database_id에 반영

npx wrangler r2 bucket create zzal-files

npm run db:migrate:remote      # 원격 D1에 스키마 적용

grep AUTH_TOKEN .dev.vars | cut -d= -f2 | npx wrangler secret put AUTH_TOKEN
npm run deploy
```

`.dev.vars`가 없다면 `.dev.vars.example`을 복사해서 `AUTH_TOKEN`에 임의의 값을 넣어두면 됩니다 (로컬 개발용 토큰이자, 위 명령으로 원격에도 그대로 등록됩니다).

## 로컬 개발

```bash
# 터미널 1: Worker (로컬 D1/R2 에뮬레이션, Images는 remote: true라 실제 서비스 호출)
cd worker && npm run dev

# 터미널 2: Raycast
cd raycast && npm run dev
```

Raycast 설정의 `apiUrl`을 로컬 Worker 주소(`http://localhost:8787` 등, 터미널에 뜨는 포트)로 지정하면 로컬 Worker와 붙습니다.

## 지원 형식 / 제한

- 지원 포맷: `png`, `jpg`/`jpeg`, `gif`, `webp`, `avif` (HEIC 미지원)
- 파일 크기 상한: 20MB (Cloudflare Images 입력 한도)
- 형식 판별은 확장자가 아니라 매직 바이트로 하며, 서버가 최종 판단합니다
- soft delete 후 30일 지나면 cron이 원본, 썸네일, 메타데이터를 영구 삭제합니다
