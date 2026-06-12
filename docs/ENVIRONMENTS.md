# 환경과 브랜치 운영

OshiTodo를 다른 사람이 써도 되는 상태로 배포하기 위해 개발 환경과 운영 환경을 분리하는 기준입니다.

## 브랜치 기준

권장 브랜치는 아래처럼 둔다.

```text
main        운영 배포용 안정 브랜치
develop     기능 통합과 QA용 개발 브랜치
codex/*     개별 기능과 버그 수정 작업 브랜치
```

현재 로컬 저장소와 원격 저장소에는 `main`과 `develop` 브랜치가 실제로 생성되어 있다. 평상시 개발과 QA는 `develop`에서 진행하고, 운영 배포가 가능한 커밋만 `main`으로 승격한다.

작업 흐름은 아래 순서로 맞춘다.

1. 새 기능이나 버그 수정은 `codex/*` 브랜치에서 작업한다.
2. `npm run verify`가 통과하면 `develop`으로 합친다.
3. `develop`에서 실제 로그인, 투두, 루틴, 상점, 옷장, 작업시간 기록을 확인한다.
4. 배포 가능한 상태가 되면 `develop`을 `main`으로 합친다.
5. 운영 배포는 `main`만 바라보게 한다.

급한 운영 버그는 `codex/hotfix-*` 브랜치에서 고친 뒤 `main`과 `develop`에 모두 반영한다.

## Supabase 프로젝트 기준

Supabase 프로젝트는 최소 2개로 나눈다.

```text
development 개발/QA 확인용 프로젝트
production  실제 사용자 데이터 프로젝트
```

두 프로젝트는 같은 schema를 유지하되 데이터는 섞지 않는다. 운영 데이터가 있는 `production`에는 테스트용 seed를 넣지 않는다.

현재 단일 프로젝트를 사용 중이라면 그 프로젝트를 `production`으로 보존한다. 새 `development` 프로젝트에는 `supabase/migrations`만 적용하고 기존 사용자, 캐릭터, 출석, 인벤토리 데이터는 복사하지 않는다.

## 환경변수 매핑

로컬 개발은 `.env.development.local`, 운영 빌드 확인은 `.env.production.local`을 사용한다. 기존 `.env.local`은 두 파일보다 우선 적용되어 분리를 무력화하므로, 개발/운영 파일 구성을 마친 뒤 제거하거나 백업 위치로 옮긴다.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GOOGLE_CLIENT_ID
```

템플릿은 아래 파일을 사용한다.

```text
.env.development.example -> .env.development.local
.env.production.example  -> .env.production.local
```

두 환경이 실제로 다른 Supabase 프로젝트를 가리키는지 확인한다.

```bash
npm run env:check
```

Vercel 같은 배포 환경에서는 아래처럼 나눈다.

```text
Preview / Development  development Supabase 값
Production             production Supabase 값
```

Vercel에서 같은 변수 이름을 환경별로 각각 등록한다. Preview/Development에 production 키를 넣거나 Production에 development 키를 넣지 않는다.

서비스 롤 키나 Google Client Secret은 `NEXT_PUBLIC_` 환경변수로 넣지 않는다.

## 마이그레이션 적용 순서

DB 구조 변경이 생기면 아래 순서로 적용한다.

1. `supabase/migrations`에 migration 파일을 추가한다.
2. SQL Editor용 파일이 필요한 경우 `supabase/sql_editor`에도 같은 변경을 정리한다.
3. development 프로젝트에 먼저 적용한다.
4. development에서 앱 흐름을 확인한다.
5. 문제가 없으면 production 프로젝트에 같은 migration을 적용한다.
6. 적용한 버전과 주의사항을 `CHANGELOG.md`와 `docs/VERSIONING.md`에 남긴다.

운영 데이터가 있는 테이블에는 `drop`, `truncate`, 조건 없는 대량 `update`를 실행하지 않는다.

GitHub Actions의 `Supabase migrations` 워크플로는 `development` 또는 `production` GitHub Environment를 명시적으로 고른 뒤 migration을 실행한다. 각 Environment에 서로 다른 `SUPABASE_DB_URL` secret을 등록한다.

- `development`: 개발용 Supabase Database connection string
- `production`: 운영용 Supabase Database connection string
- production Environment에는 required reviewer를 설정한다.
- 먼저 `dry_run=true`로 실행하고 결과를 확인한 뒤 실제 적용한다.

## 기존 단일 DB 분리 순서

1. 현재 연결된 Supabase 프로젝트를 `production`으로 지정하고 백업한다.
2. Supabase에서 빈 `development` 프로젝트를 새로 만든다.
3. development 프로젝트에 `supabase/migrations`를 순서대로 적용한다.
4. development에 관리자 테스트 계정과 테스트 데이터만 별도로 만든다.
5. 로컬 `.env.local` 값을 `.env.production.local`에 보관한다.
6. 새 development 키를 `.env.development.local`에 입력한다.
7. `.env.local`을 제거하고 `npm run env:check`로 두 project ref가 다른지 확인한다.
8. Vercel Preview/Development와 Production 환경변수를 각각 연결한다.
9. Google OAuth와 Supabase Auth redirect URL을 개발/운영 도메인별로 모두 등록한다.
10. development에서 migration과 기능을 검증한 뒤 production에 승격한다.

## 배포 전 확인

브랜치와 환경을 분리한 뒤에도 배포 직전에는 항상 아래를 확인한다.

```bash
npm run verify
```

그 다음 `docs/RELEASE_CHECKLIST.md`의 smoke test를 따라 로그인, 투두, 루틴, 상점, 옷장, XP/재화 기록, 작업시간 기록을 확인한다.

## 아직 수동으로 해야 하는 일

- GitHub에서 `main`, `develop` 보호 규칙을 정한다.
- Vercel Preview 환경이 development Supabase를 바라보도록 환경변수를 넣는다.
- Vercel Production 환경이 production Supabase를 바라보도록 환경변수를 넣는다.
- Google OAuth Authorized origins와 Supabase redirect URL을 development/production 도메인별로 등록한다.
- GitHub `development`, `production` Environment에 서로 다른 `SUPABASE_DB_URL` secret을 등록한다.
- GitHub production Environment에 required reviewer를 설정한다.
