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

빠른 로컬 개발은 이메일/비밀번호 로그인이 가장 단순하다.

이메일 확인이 켜져 있으면 회원가입 뒤 확인 메일을 눌러야 로그인된다. 테스트를 빠르게 하려면 잠시 끌 수 있다.

```text
Authentication > Providers > Email
```

실제 공개 전에 이메일 확인은 다시 켜는 편이 좋다.
