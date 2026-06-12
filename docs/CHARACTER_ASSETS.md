# 캐릭터 레이어 에셋 규칙

## 인간 캐릭터 기본 카테고리

인간 캐릭터 레이어는 아래 순서로 합성한다.

```text
바디 → 신발 → 하의 → 상의 → 헤어 → 입 → 눈 → 악세서리
```

코드에서는 각 카테고리에 기본 `layerOrder`를 10 단위로 지정한다.

```text
바디 10
신발 20
하의 30
상의 40
헤어 50
입 60
눈 70
악세서리 80
```

특정 아이템의 합성 순서가 달라야 하면 `src/lib/character-assets.ts`의 해당 아이템에 `layerOrder`를 직접 지정한다. 예를 들어 하의보다 위에 보여야 하는 하이탑 신발은 `layerOrder: 35`로 지정할 수 있다.

## 폴더와 파일명

인간 레이어 파일은 아래 경로에 카테고리별로 저장한다.

```text
public/assets/characters/human/layers/body
public/assets/characters/human/layers/shoes
public/assets/characters/human/layers/bottom
public/assets/characters/human/layers/top
public/assets/characters/human/layers/hair
public/assets/characters/human/layers/mouth
public/assets/characters/human/layers/eyes
public/assets/characters/human/layers/accessory
```

파일명은 소문자 영문과 하이픈을 사용한다.

```text
아이템명-색상.png
```

예시는 `short-sleeve-shirt-blue.png`, `straight-pants-black.png`이다. 색상이 없는 아이템은 `smile.png`처럼 아이템명만 쓴다.

모든 레이어는 같은 캔버스 크기와 캐릭터 위치를 유지한 투명 PNG로 만든다.

## 코스튬 썸네일과 착용 레이어

- 코스튬 화면의 아이템 카드에는 상품 자체를 알아보기 쉬운 작은 `thumbnail_url` 이미지를 사용한다.
- 아바타에 직접 합성하는 큰 투명 PNG는 종족별 `shop_item_variants.layer_asset_url`에 저장한다.
- 같은 상품도 인간과 고양이에서 착용 위치가 다르면 종족별 변형에 서로 다른 레이어 이미지를 연결한다.
- 썸네일이 아직 없으면 코스튬 카드에는 레이어 이미지 대신 `상품 이미지 준비 중`을 표시한다.

## 기본 제공과 상점 아이템

- `HUMAN_LAYER_ITEMS`에서 `isBasic: true`인 아이템은 캐릭터 생성부터 사용할 수 있다.
- 기본 제공 아이템은 옷장에는 표시하지만 상점에는 표시하지 않는다.
- 상점 아이템은 DB의 카테고리 슬롯과 payload 선택 키를 맞춘다.
- 관리자 페이지에서 등록하는 상품은 공통 정보는 `shop_items`, 종족별 착용 정보는 `shop_item_variants`에 저장한다.
- 새 상점 슬롯을 추가한 뒤에는 `supabase/sql_editor/12_human_character_slots.sql`을 적용한다.

카테고리별 슬롯과 선택 키는 아래와 같다.

```text
human_body   → bodyId
human_shoes  → shoesId
human_bottom → bottomId
human_top    → topId
human_hair   → hairId
human_mouth  → mouthId
human_eyes   → eyeId
accessory    → accessoryId
```
