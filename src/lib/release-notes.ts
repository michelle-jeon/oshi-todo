export type ReleaseNote = {
  version: string;
  title: string;
  publishedAt: string;
  changes: string[];
};

export const LATEST_RELEASE_NOTE: ReleaseNote = {
  version: "0.13.0",
  title: "코스튬 화면과 업데이트 안내 개선",
  publishedAt: "2026-06-13",
  changes: [
    "배경을 캐릭터의 정사각형 최하단 레이어로 추가했어요.",
    "선택형 코스튬을 벗을 수 있는 ‘없음’ 상태를 옷장과 캐릭터 생성에 추가했어요.",
    "앞으로 새로운 운영 버전이 배포되면 로그인 후 변경사항을 간단히 알려드려요."
  ]
};
