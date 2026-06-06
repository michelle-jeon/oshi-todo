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
staging     개발/QA 확인용 프로젝트
production  실제 사용자 데이터 프로젝트
```

두 프로젝트는 같은 schema를 유지하되 데이터는 섞지 않는다. 운영 데이터가 있는 `production`에는 테스트용 seed를 넣지 않는다.

## 환경변수 매핑

로컬 `.env.local`은 현재 작업 목적에 맞는 프로젝트를 가리킨다.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GOOGLE_CLIENT_ID
```

Vercel 같은 배포 환경에서는 아래처럼 나눈다.

```text
Preview / Development  staging Supabase 값
Production             production Supabase 값
```

서비스 롤 키나 Google Client Secret은 `NEXT_PUBLIC_` 환경변수로 넣지 않는다.

## 마이그레이션 적용 순서

DB 구조 변경이 생기면 아래 순서로 적용한다.

1. `supabase/migrations`에 migration 파일을 추가한다.
2. SQL Editor용 파일이 필요한 경우 `supabase/sql_editor`에도 같은 변경을 정리한다.
3. staging 프로젝트에 먼저 적용한다.
4. staging에서 앱 흐름을 확인한다.
5. 문제가 없으면 production 프로젝트에 같은 migration을 적용한다.
6. 적용한 버전과 주의사항을 `CHANGELOG.md`와 `docs/VERSIONING.md`에 남긴다.

운영 데이터가 있는 테이블에는 `drop`, `truncate`, 조건 없는 대량 `update`를 실행하지 않는다.

## 배포 전 확인

브랜치와 환경을 분리한 뒤에도 배포 직전에는 항상 아래를 확인한다.

```bash
npm run verify
```

그 다음 `docs/RELEASE_CHECKLIST.md`의 smoke test를 따라 로그인, 투두, 루틴, 상점, 옷장, XP/재화 기록, 작업시간 기록을 확인한다.

## 아직 수동으로 해야 하는 일

- GitHub에서 `main`, `develop` 보호 규칙을 정한다.
- Vercel Preview 환경이 staging Supabase를 바라보도록 환경변수를 넣는다.
- Vercel Production 환경이 production Supabase를 바라보도록 환경변수를 넣는다.
- Google OAuth Authorized origins와 Supabase redirect URL을 staging/production 도메인별로 등록한다.
