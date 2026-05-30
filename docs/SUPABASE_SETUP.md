# Supabase 설정

## 환경 변수

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 넣는다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://프로젝트-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=publishable-key
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

## 마이그레이션

마이그레이션은 DB 구조 변경 내역을 파일로 남기는 것이다. 예를 들어 테이블 생성, 컬럼 추가, RLS 정책 추가, RPC 함수 수정 같은 작업이 마이그레이션에 들어간다.

이 프로젝트에서는 `supabase/migrations` 폴더의 SQL 파일들이 순서대로 적용된다.

```bash
npx supabase link --project-ref 프로젝트-ref
npx supabase db push
```

`db push`를 실행하면 아직 Supabase 프로젝트에 적용되지 않은 마이그레이션이 원격 DB에 반영된다.

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
http://localhost:3000
http://localhost:3000/auth/callback
```

배포 주소 예시:

```text
https://your-domain.com
https://your-domain.com/auth/callback
```

Google Cloud Console에서는 OAuth Client를 만들 때 Web application으로 만들고, Authorized JavaScript origins에는 앱의 origin만 넣는다.

```text
http://localhost:3000
https://your-domain.com
```

## Google 계정 선택 화면의 도메인 문구

Google 계정 선택 화면에서 `프로젝트-ref.supabase.co(으)로 이동`처럼 표시될 수 있다. 이는 Supabase Auth의 OAuth callback 도메인이 Supabase 프로젝트 도메인이기 때문이다.

운영에서 이 문구까지 브랜드 도메인으로 정리하려면 Supabase Custom Domain 또는 별도 auth 도메인을 검토한다. 로컬 개발 단계에서는 기능 검증을 우선한다.
