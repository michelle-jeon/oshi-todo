# PC 앱 개발과 배포

OshiTodo PC 앱은 Electron이 Next.js standalone 서버를 앱 내부에서 실행하는 구조다. 웹앱과 같은 UI, Supabase 데이터, 인증 설정을 사용하면서 데스크톱에서 실제 활성 작업창을 확인할 수 있다.

## 실행 명령

개발 중에는 웹 개발 서버와 Electron을 함께 실행한다.

```bash
npm run desktop:dev
```

현재 운영체제에서 실행 가능한 앱 폴더를 만든다.

```bash
npm run desktop:package
```

배포용 설치 파일을 만든다.

```bash
npm run desktop:dist
```

macOS 앱 폴더는 `dist/desktop/mac-arm64/OshiTodo.app`에 생성된다.

## 인증 설정

PC 앱은 내부 주소 `http://127.0.0.1:32145`에서 웹앱을 실행한다. Google OAuth를 사용하려면 Google Cloud Console의 Authorized JavaScript origins에 아래 주소를 추가해야 한다.

```text
http://127.0.0.1:32145
```

Supabase Auth URL Configuration에도 같은 주소에서 시작한 인증 흐름이 허용되는지 확인한다.

## 작업창 권한

macOS에서는 작업창 목록과 활성 창 확인을 위해 시스템 설정에서 OshiTodo에 아래 권한을 허용해야 한다.

- 개인정보 보호 및 보안 > 화면 및 시스템 오디오 녹음
- 개인정보 보호 및 보안 > 손쉬운 사용

Windows는 PowerShell과 `user32` API로 활성 창을 확인한다. Linux는 `xdotool`이 필요하며 Wayland 환경에서는 활성 창 확인이 제한될 수 있다.

## 배포 전 남은 작업

- 최종 앱 아이콘 적용.
- macOS Developer ID 코드 서명과 공증.
- Windows 설치 파일과 Linux AppImage 실기기 검증.
- 원격 배포와 자동 업데이트 방식 결정.
