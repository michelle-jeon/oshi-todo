# OshiTodo 아키텍처

## 제품 구조

OshiTodo는 웹에서 시작하는 투두 게임이다. 사용자가 할 일을 완료하면 현재 선택된 캐릭터가 경험치를 얻고, 그 경험치로 캐릭터나 방 꾸미기 아이템을 해금한다.

MVP는 계정당 활성 캐릭터 1명을 기준으로 만든다. 다만 데이터 모델은 여러 캐릭터, 인벤토리, 방 꾸미기, 친구, 광장으로 확장할 수 있게 둔다.

## 기술 스택

- Next.js App Router: 웹 MVP, 서버 렌더링, 서버 액션, 이후 PWA 확장에 적합하다.
- Supabase Auth: 이메일/비밀번호 로그인을 빠르게 붙일 수 있다.
- Supabase Postgres: 투두, 캐릭터, 경험치, 친구 관계처럼 관계형으로 관리해야 하는 데이터에 적합하다.
- Supabase RLS: 사용자별 데이터 접근 권한을 DB에서 막는다.
- Supabase Realtime: 광장, 친구 접속 상태, 나중의 동시 작업 화면에 사용한다.
- TypeScript: 캐릭터 커스터마이징과 아이템 종류가 늘어날수록 데이터 계약을 지키기 쉽다.

모바일 앱을 나중에 붙일 경우에도 Supabase 백엔드는 그대로 사용한다. 게임 규칙은 `src/lib`에 두고, DB 쓰기는 서버 액션이나 RPC로 감싸서 웹/앱에서 같은 규칙을 쓰게 한다.

## 주요 데이터 모델

- `profiles`: Supabase Auth 사용자와 연결되는 서비스 프로필이다. 친구 검색을 위해 이메일도 저장한다.
- `characters`: 캐릭터 소유자, 종족, 이름, 경험치, 활성 캐릭터 여부, 커스터마이징 JSON, 방 JSON을 저장한다.
- `todos`: 날짜별 할 일이다. 완료 시 어떤 캐릭터가 경험치를 받았는지 기록한다.
- `routines`: 매일 또는 특정 요일마다 나타나는 반복 할 일이다.
- `xp_events`: 경험치 지급 내역이다. 중복 지급 버그를 추적하기 쉽다.
- `shop_items`: 헤어, 눈, 옷, 악세서리, 무늬, 방 아이템 등 상점 카탈로그다.
- `shop_item_variants`: 상품 하나가 종족별로 사용하는 착용 슬롯, payload, 레이어 이미지를 저장한다.
- `character_inventory`: 캐릭터가 구매한 아이템 목록이다.
- `friendships`: 팔로우/팔로잉 관계다.
- `plaza_rooms`: 실시간 광장 방 정보다.

## 동시성 규칙

투두 완료는 반드시 DB 트랜잭션으로 처리한다. `complete_todo` RPC는 투두와 활성 캐릭터 행을 잠그고, 투두 완료 처리, 캐릭터 경험치 증가, 경험치 이벤트 생성을 한 번에 수행한다.

그래서 같은 계정이 여러 기기에서 같은 투두를 동시에 눌러도 경험치가 두 번 지급되지 않는다.

## 커스터마이징 전략

MVP 커스터마이징은 JSON으로 시작한다.

- 인간: `species`, `variantId`, 이후 `hairStyle`, `hairColor`, `eyeColor`, `skinColor`, `outfitId`, `accessoryIds`
- 고양이: `species`, `variantId`, 이후 `furColor`, `patternId`, `eyeColor`, `accessoryIds`

나중에 검색, 밸런스, 정렬이 중요해지는 필드는 JSON에서 별도 컬럼으로 승격한다.

## 방 전략

`room_customization`은 MVP에서 JSON으로 둔다. 방 꾸미기 UI가 생기면 방 아이템도 `shop_items`와 `character_inventory`를 통해 해금하고, 배치 정보만 방 JSON에 저장한다.

## 관리자 전략

현재는 별도 저장소보다 같은 저장소의 `/admin` 영역을 사용한다. 카탈로그 타입, Supabase 인증, 캐릭터 미리보기 규칙을 공유해야 하는 초기 단계에서는 중복 구현과 배포 불일치 위험이 더 크기 때문이다.

관리자 접근은 `profiles.is_admin`과 Supabase RLS로 제한한다. 운영 조직과 배포 주기가 분리될 정도로 커지면 관리자 프런트만 별도 저장소로 옮기고, `shop_items`와 `shop_item_variants` 데이터 계약은 유지한다.

상품 삭제는 보유 사용자가 없는 경우에만 허용한다. 이미 지급·구매된 상품은 삭제 대신 비활성화해 사용자 인벤토리를 보존한다.
