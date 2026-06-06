# Supabase 설정

## 환경 변수

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 넣는다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://프로젝트-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=publishable-key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=google-oauth-client-id.apps.googleusercontent.com
```

Supabase 대시보드에서는 보통 다음 위치에서 찾는다.

- Project Settings > API > Project URL
- Project Settings > API > publishable key 또는 anon public key

`.env.local`은 절대 Git에 올리지 않는다. 현재 저장소는 이미 `.gitignore`에서 이 파일을 제외한다.

## 비밀값 관리

- 로컬 개발: `.env.local`
- Vercel 배포: Vercel Project Settings > Environment Variables
- 팀원이 생긴 뒤: 1Password, Bitwarden, Doppler 같은 비밀값 관리 도구 사용

브라우저에서 쓰는 `NEXT_PUBLIC_` 값은 완전한 비밀키가 아니다. 그래도 저장소에 올리지 않는 습관을 유지한다. 서비스 롤 키처럼 강한 권한의 키는 클라이언트 코드에 절대 넣지 않는다.

staging/production Supabase 프로젝트 분리와 브랜치 운영 기준은 `docs/ENVIRONMENTS.md`를 따른다.

## 배포 환경변수 체크리스트

Vercel 같은 배포 환경에는 최소한 아래 값이 필요하다.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GOOGLE_CLIENT_ID
```

배포 전 확인할 것:

- `NEXT_PUBLIC_SUPABASE_URL`이 운영 Supabase 프로젝트 URL인지 확인.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 같은 프로젝트의 publishable/anon key인지 확인.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`가 Google Cloud Console의 Web OAuth Client ID인지 확인.
- Google OAuth Authorized JavaScript origins에 운영 도메인 추가.
- Google OAuth Authorized redirect URIs에 Supabase Google provider의 callback URL 추가.
- Supabase Auth URL Configuration에 운영 Site URL과 redirect URL 추가.
- `.env.local` 값과 Vercel 환경변수를 서로 복사할 때 Client Secret을 `NEXT_PUBLIC_` 이름으로 넣지 않았는지 확인.

배포 직전 검증 순서와 배포 후 smoke test는 `docs/RELEASE_CHECKLIST.md`를 기준으로 확인한다.

## 마이그레이션

마이그레이션은 DB 구조 변경 내역을 파일로 남기는 것이다. 예를 들어 테이블 생성, 컬럼 추가, RLS 정책 추가, RPC 함수 수정 같은 작업이 마이그레이션에 들어간다.

이 프로젝트에서는 `supabase/migrations` 폴더의 SQL 파일들이 순서대로 적용된다.

홈 화면에 `Supabase DB 스키마가 아직 준비되지 않았어요` 안내가 보이면, 우선 아직 적용하지 않은 최신 SQL 파일이 있는지 확인한다. 현재 작업시간 기록 기능에는 아래 파일이 필요하다.

```text
supabase/migrations/20260531212355_add_focus_window_logs.sql
```

Supabase Dashboard의 SQL Editor에서 위 파일 내용을 실행하면 작업시간 로그 테이블과 저장 함수가 준비된다. 이 파일은 `create table if not exists`와 `create or replace function`을 쓰므로 같은 프로젝트에서 다시 실행해도 비교적 안전하다. 단, 정책이나 트리거가 이미 있으면 Supabase가 중복 이름 오류를 낼 수 있으니, 오류가 나면 어떤 줄에서 났는지 확인한 뒤 이미 만들어진 항목은 건너뛴다.

투두 보상, 우선순위, 마감일 기능에는 아래 파일들이 필요하다.

```text
supabase/migrations/20260604093000_add_base_xp_rewards.sql
supabase/migrations/20260604111500_add_todo_priority.sql
supabase/migrations/20260604123000_add_xp_difficulty.sql
supabase/migrations/20260605113000_add_todo_due_dates.sql
```

SQL Editor에서 직접 실행할 때는 아래 파일 내용을 번호 순서대로 복사해 붙여 넣는다.

```text
supabase/sql_editor/05_base_xp_rewards.sql
supabase/sql_editor/07_todo_priority.sql
supabase/sql_editor/08_xp_difficulty.sql
supabase/sql_editor/11_todo_due_dates.sql
supabase/sql_editor/12_human_character_slots.sql
```

`05_base_xp_rewards.sql`은 투두와 루틴에 `base_xp_reward` 컬럼을 추가하고, 기존 데이터의 기준 XP를 현재 `xp_reward`로 채운다. `07_todo_priority.sql`은 투두에 `priority` 컬럼과 조회 인덱스를 추가한다. `08_xp_difficulty.sql`은 투두와 루틴에 `xp_difficulty` 컬럼을 추가하고 `가벼움/보통/도전` 난이도를 각각 5/20/50 XP로 맞춘다. `11_todo_due_dates.sql`은 투두에 `due_date` 컬럼과 마감일 조회 인덱스를 추가한다. `12_human_character_slots.sql`은 인간 캐릭터의 바디, 신발, 하의, 상의, 입 상점 슬롯을 추가한다. 이 컬럼들이 없으면 홈 화면에서 XP 기준값, 우선순위, 난이도, 마감일 DB 스키마 안내가 뜰 수 있다.

새 마이그레이션 파일 이름은 아래 형식을 쓴다.

```text
YYYYMMDDHHMMSS_변경_내용.sql
```

예시:

```text
20260531212355_add_focus_window_logs.sql
```

새 DB 기능을 만들 때 기본 순서는 다음과 같다.

1. `supabase/migrations`에 SQL 파일을 추가한다.
2. 테이블에는 RLS를 켠다.
3. 사용자 소유 데이터는 `auth.uid()` 기준 정책을 추가한다.
4. 앱에서 직접 insert/update가 필요하면 정책을 열지 않고, 가능하면 `security definer` RPC로 좁게 만든다.
5. 로컬 타입체크/빌드를 통과시킨다.
6. Supabase 원격 DB에 push한다.

```bash
npx supabase link --project-ref 프로젝트-ref
npx supabase db push
```

`db push`를 실행하면 아직 Supabase 프로젝트에 적용되지 않은 마이그레이션이 원격 DB에 반영된다.

DB push 전에 어떤 SQL이 적용될지 불안하면 Supabase Dashboard의 SQL Editor에서 파일 내용을 먼저 검토한다. 운영 데이터가 있는 테이블에는 `drop`, `truncate`, 대량 `update`를 바로 쓰지 않는다.

## Seed 데이터

상점 아이템처럼 반복해서 넣어야 하는 데이터는 `data/shop-items.json`에 적고, 아래 명령으로 upsert SQL을 만든다.

```bash
npm run seed:shop-items
```

출력된 SQL은 Supabase SQL Editor에 붙여넣어 실행한다. 이 스크립트는 `on conflict (code) do update`를 쓰기 때문에 같은 아이템 코드를 여러 번 실행해도 최신 값으로 갱신된다.

명령을 실행하지 않고 SQL Editor에서 바로 적용하려면 아래 파일 내용을 붙여넣어 실행한다.

```text
supabase/sql_editor/09_shop_items_seed.sql
```

이 파일도 같은 `on conflict (code) do update` 방식을 쓰므로 여러 번 실행해도 기존 상점 아이템을 최신 값으로 맞춘다.

작업시간 과거 기록을 화면에서 확인하려면 아래 폴더의 파일을 번호 순서대로 열고, 파일 경로가 아니라 파일 안의 SQL 내용을 Supabase SQL Editor에 붙여넣어 실행한다.

```text
supabase/sql_editor/01_focus_logs_schema.sql
supabase/sql_editor/02_query_indexes.sql
supabase/sql_editor/03_demo_focus_logs.sql
```

각 파일은 새 쿼리 창에서 따로 실행한다. 긴 SQL을 한 번에 복사하다가 중간이 잘리면 `unterminated dollar-quoted string` 오류가 날 수 있다.

한 번에 실행하고 싶다면 아래 통합 파일을 사용할 수 있다. SQL Editor에 `supabase/...sql` 같은 파일 경로를 입력하면 syntax error가 난다.

```text
supabase/sql_editor_focus_demo_setup.sql
```

이 SQL은 기본값으로 가장 최근 profile과 연결된 캐릭터를 찾아 최근 2주 정도의 작업시간 더미 기록을 넣는다. 특정 계정에 넣고 싶다면 `03_demo_focus_logs.sql` 상단의 `target_user_id_input uuid := null;`에서 `null`을 원하는 `public.profiles.id`로 바꾼 뒤 실행한다. 활성 캐릭터가 없으면 최근 캐릭터를 활성화하고, 캐릭터가 아예 없으면 화면 확인용 더미 캐릭터를 만든다. 같은 날짜와 작업창 조합은 `on conflict`로 덮어쓰기 때문에 여러 번 실행해도 같은 더미 기록이 계속 중복되지는 않는다.

## DB 조회 효율

앱에서 자주 쓰는 조회는 아래처럼 사용자와 날짜, 생성일, 구매일 기준으로 정렬된다.

- 홈: 활성 캐릭터, 투두 날짜별 목록, 루틴, 작업시간 로그
- 작업시간: 날짜별 작업창 기록
- XP 기록: XP 이벤트와 구매 기록
- 친구/광장: 팔로잉/팔로워, 내가 만든 광장

이 경로를 위해 아래 migration에 보조 인덱스를 추가했다.

```text
supabase/migrations/20260603090000_add_query_indexes.sql
supabase/migrations/20260605110000_add_xp_ledger_cursor_indexes.sql
```

`20260603090000_add_query_indexes.sql`은 기본 조회 경로용 인덱스이고, `20260605110000_add_xp_ledger_cursor_indexes.sql`은 XP/재화 기록의 커서 페이지네이션 정렬 기준에 맞춘 인덱스다. 두 migration은 필요한 테이블이 있을 때만 인덱스를 만들도록 방어되어 있다. Supabase SQL Editor에서 직접 실행하려면 아래 파일도 함께 실행한다.

```text
supabase/sql_editor/10_xp_ledger_cursor_indexes.sql
```

Supabase CLI를 쓰면 `npx supabase db push`로 반영한다.

루틴 종료 기능과 투두 생성 정렬 조회 인덱스는 아래 SQL Editor 파일로도 반영할 수 있다.

```text
supabase/sql_editor/04_routine_end_and_indexes.sql
```

## 인증 설정

현재 앱은 Google 로그인만 지원한다.

Supabase 기본 이메일 발송 기능은 데모용이라 인증 메일 발송 제한이 매우 낮다. OshiTodo는 이 제한을 피하기 위해 이메일/비밀번호 회원가입을 열지 않고, Google OAuth로 가입과 로그인을 처리한다.

## Google 로그인 설정

Supabase Dashboard에서 아래를 설정한다.

```text
Authentication > Providers > Google
```

1. Google provider를 켠다.
2. Google Cloud Console에서 만든 OAuth Client ID와 Client Secret을 넣는다.
3. Supabase가 보여주는 Callback URL을 Google Cloud Console의 Authorized redirect URIs에 추가한다.
4. 앱 주소를 Supabase URL Configuration에 넣는다.

로컬 개발 주소:

```text
http://127.0.0.1:3000
http://127.0.0.1:3000/auth/callback
http://localhost:3000
http://localhost:3000/auth/callback
http://127.0.0.1:32145
http://127.0.0.1:32145/auth/callback
```

운영 주소:

```text
https://oshi-todo-one.vercel.app
https://oshi-todo-one.vercel.app/auth/callback
```

Google Cloud Console에서는 OAuth Client를 만들 때 Web application으로 만들고, Authorized JavaScript origins에는 앱의 origin만 넣는다.

```text
http://127.0.0.1:3000
http://localhost:3000
http://127.0.0.1:32145
https://oshi-todo-one.vercel.app
```

현재 Google 로그인 버튼은 JavaScript 콜백으로 ID 토큰을 받아 Supabase에 전달하므로 Google 승인된 리디렉션 URI는 사용하지 않는다. 전체 설정과 배포 절차는 `docs/DEPLOYMENT_AND_OAUTH.md`를 따른다.

`.env.local`의 `NEXT_PUBLIC_GOOGLE_CLIENT_ID`에는 Google Cloud Console에서 발급된 Client ID를 넣는다. `OshiTodo` 같은 앱 이름을 넣는 칸이 아니다.

```text
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com
```

Client Secret은 브라우저에 노출되는 `NEXT_PUBLIC_` 환경 변수에 넣지 않는다.

## Google 계정 선택 화면의 도메인 문구

Supabase redirect OAuth를 쓰면 Google 계정 선택 화면에서 `프로젝트-ref.supabase.co(으)로 이동`처럼 표시될 수 있다. 이는 Supabase Auth의 OAuth callback 도메인이 Supabase 프로젝트 도메인이기 때문이다.

운영에서 이 문구까지 브랜드 도메인으로 정리하려면 Supabase Custom Domain 또는 별도 auth 도메인을 검토한다. 로컬 개발 단계에서는 기능 검증을 우선한다.
