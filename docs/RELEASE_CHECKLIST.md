# 릴리스 체크리스트

OshiTodo 웹앱을 다른 사람이 써도 되는 상태로 배포하기 전에 확인할 항목입니다.

## 로컬 검증

배포 전에는 프로젝트 루트에서 아래 명령을 실행한다.

```bash
npm run verify
```

이 명령은 아래 세 단계를 순서대로 실행한다.

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`

하나라도 실패하면 배포하지 않고 먼저 원인을 수정한다.

## Supabase 확인

- 개발/운영 환경 분리 기준은 `docs/ENVIRONMENTS.md`를 기준으로 확인한다.
- `docs/SUPABASE_SETUP.md`의 SQL Editor 실행 순서를 최신 상태로 적용했는지 확인한다.
- 새 DB 변경이 있으면 `supabase/migrations`와 `supabase/sql_editor` 중 어디에 반영되어야 하는지 확인한다.
- 운영 데이터가 있는 테이블에는 `drop`, `truncate`, 무조건 대량 `update`를 실행하지 않는다.
- 상점 아이템은 `npm run seed:shop-items` 출력 또는 `supabase/sql_editor/09_shop_items_seed.sql`로 upsert한다.

## 환경변수

배포 환경에는 최소한 아래 값이 있어야 한다.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GOOGLE_CLIENT_ID
```

- 운영 Supabase URL과 anon key가 같은 프로젝트 값인지 확인한다.
- Google OAuth Client ID가 운영 도메인을 허용하는 Web OAuth Client인지 확인한다.
- Client Secret이나 service role key를 `NEXT_PUBLIC_` 환경변수에 넣지 않는다.

## 인증 설정

- Google OAuth Authorized JavaScript origins에 운영 도메인을 추가한다.
- Google OAuth Authorized redirect URIs에 Supabase Google provider callback URL을 추가한다.
- Supabase Auth URL Configuration에 운영 Site URL과 redirect URL을 추가한다.
- Google 계정 선택 화면에서 Supabase 도메인이 보이는 것은 Custom Domain을 붙이기 전까지 정상이다.

## 배포 후 확인

배포 직후 아래 흐름을 직접 확인한다.

1. 로그인 화면이 뜨는지 확인한다.
2. Google 로그인 후 홈으로 들어가는지 확인한다.
3. 투두 생성, 완료, 되돌리기를 확인한다.
4. 루틴 생성, 완료, 종료를 확인한다.
5. 상점 진입, 아이템 목록 표시, 구매 버튼 상태를 확인한다.
6. 옷장 진입과 장착 저장을 확인한다.
7. XP/재화 기록과 완료 아카이브가 에러 없이 열리는지 확인한다.
8. 브라우저 콘솔에 반복 오류가 없는지 확인한다.

문제가 있으면 `CHANGELOG.md`의 다음 릴리스 준비 중에 임시 기록한 뒤, 수정 커밋에서 버전과 백로그를 함께 갱신한다.
