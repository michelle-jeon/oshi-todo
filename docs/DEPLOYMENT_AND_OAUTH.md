# OAuth, 로컬 실행, 웹 배포, PC 앱 빌드

## 현재 주소

OshiTodo가 사용하는 주요 주소는 아래와 같다.

```text
로컬 웹 개발      http://127.0.0.1:3000
선택적 localhost  http://localhost:3000
운영 웹           https://oshi-todo-one.vercel.app
PC 앱 내부 웹     http://127.0.0.1:32145
```

PC 앱 내부 주소는 인터넷에 공개되는 주소가 아니다. Electron 앱이 실행되는 동안 사용자 컴퓨터 안에서만 열리는 로컬 주소다. 현재 PC 앱도 Google Identity Services 웹 로그인을 사용하므로 Google OAuth의 승인된 JavaScript 원본에는 등록해야 한다.

## Google Cloud Console 설정

현재 로그인 버튼은 Google Identity Services의 JavaScript 콜백으로 ID 토큰을 받은 뒤 Supabase `signInWithIdToken`에 전달한다.

Google Cloud Console에서 기존 **웹 애플리케이션** OAuth 클라이언트를 열고, **승인된 JavaScript 원본**에 아래 값을 추가한다. 원본에는 경로와 끝 슬래시를 넣지 않는다.

```text
http://127.0.0.1:3000
http://localhost:3000
http://127.0.0.1:32145
https://oshi-todo-one.vercel.app
```

현재 로그인 버튼 흐름은 Google의 승인된 리디렉션 URI를 사용하지 않는다. Google Cloud Console의 승인된 리디렉션 URI에는 위 앱 주소나 `/auth/callback`을 무작정 추가하지 않는다. Supabase Google Provider 화면에 표시되는 callback URL이 이미 등록되어 있다면 기존 값은 유지한다.

Vercel Preview 주소는 배포마다 달라질 수 있고 Google 승인된 JavaScript 원본은 와일드카드를 지원하지 않는다. Preview에서도 Google 로그인이 꼭 필요하면 Vercel에서 `develop` 브랜치에 고정 도메인을 연결하고 그 주소를 Google 승인된 JavaScript 원본에 추가한다.

OAuth 동의 화면이 `테스트` 상태라면 등록된 테스트 사용자만 로그인할 수 있다. 다른 사람이 자유롭게 사용하게 만들 때는 앱 이름, 지원 이메일, 홈페이지, 개인정보처리방침을 준비하고 게시 상태와 브랜드 검증 필요 여부를 확인한다.

## Supabase Auth URL 설정

Supabase Dashboard의 `Authentication > URL Configuration`에서 아래처럼 설정한다.

Site URL:

```text
https://oshi-todo-one.vercel.app
```

Redirect URLs:

```text
http://127.0.0.1:3000/**
http://localhost:3000/**
http://127.0.0.1:32145/**
https://oshi-todo-one.vercel.app/**
```

현재 ID 토큰 로그인은 이 리디렉션 목록을 직접 사용하지 않지만, 향후 OAuth 리디렉션 로그인이나 인증 메일 흐름을 추가할 때 잘못된 주소로 이동하지 않도록 미리 정확히 설정한다.

## Vercel 환경변수

Vercel Dashboard에서 OshiTodo 프로젝트를 열고 `Settings > Environment Variables`에 아래 값을 설정한다.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GOOGLE_CLIENT_ID
```

운영용 값은 Production 환경에 넣는다. Preview에서 운영 데이터가 섞이지 않게 하려면 별도 development Supabase 값을 Preview 환경에 넣는다.

환경변수를 바꾼 뒤에는 기존 배포가 자동으로 바뀌지 않으므로 Vercel Deployments 화면에서 Redeploy하거나 새 커밋을 푸시한다.

## 혼자 로컬 웹 서버 실행

터미널을 열고 아래 명령을 실행한다.

```bash
cd /Users/mikyeong/Documents/OshiTodo
npm install
npm run dev
```

서버가 준비되면 브라우저에서 아래 주소를 연다.

```text
http://127.0.0.1:3000
```

터미널을 닫으면 서버도 종료된다. 종료할 때는 서버가 실행 중인 터미널에서 `Control + C`를 누른다.

3000 포트가 이미 사용 중이라는 오류가 나면 사용 중인 프로세스를 확인한다.

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

출력된 PID가 이전 OshiTodo 개발 서버인지 확인한 뒤 종료한다.

```bash
kill PID번호
```

## 웹 운영 배포

현재 브랜치 역할은 아래와 같다.

```text
develop  개발과 QA
main     운영 배포
```

Vercel 프로젝트의 Production Branch가 `main`으로 설정되어 있다면:

- `develop` 푸시: Vercel Preview 배포 생성.
- `main` 푸시: Vercel Production 배포 생성 후 운영 주소 갱신.
- GitHub 저장소만 갱신되며 Supabase DB migration은 자동 적용되지 않음.
- PC 앱 설치 파일도 자동 생성되지 않음.

운영 반영 전에는 Vercel Dashboard의 `Settings > Environments > Production > Branch Tracking`에서 Production Branch가 실제로 `main`인지 확인한다.

최신 `develop`을 운영 `main`으로 승격하는 직접 명령은 아래와 같다.

```bash
cd /Users/mikyeong/Documents/OshiTodo
git switch develop
git pull --ff-only origin develop
npm run verify
git switch main
git merge --ff-only develop
git push origin main
git switch develop
```

더 안전하게 운영하려면 GitHub에서 `develop`에서 `main`으로 Pull Request를 만든 뒤 Vercel Preview와 검증 결과를 확인하고 병합한다.

## PC 앱 다시 빌드

개발 중 Electron 앱을 실행한다.

```bash
cd /Users/mikyeong/Documents/OshiTodo
npm run desktop:dev
```

현재 운영체제에서 실행 가능한 앱 폴더를 다시 만든다.

```bash
npm run desktop:package
```

DMG와 ZIP 같은 배포 파일을 다시 만든다.

```bash
npm run desktop:dist
```

macOS 결과물은 `dist/desktop` 아래에 생성된다. 빌드할 때 `.env.local`의 `NEXT_PUBLIC_GOOGLE_CLIENT_ID`와 Supabase 값이 앱 내부 웹 번들에 반영되므로, 값을 바꿨다면 앱도 다시 빌드해야 한다.

PC 앱 설치 파일은 Vercel에 올라가지 않는다. 현재는 로컬에서 직접 빌드하며, 자동 배포와 업데이트는 별도 작업으로 남아 있다.

외부 사용자에게 macOS 앱을 배포하기 전에는 앱 아이콘, Developer ID 코드 서명, 공증을 완료해야 한다.
