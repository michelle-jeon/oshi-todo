"use server";

import { DEFAULT_TODO_XP } from "@/lib/game-config";
import { requireUser } from "@/lib/auth";

type XpTargetType = "todo" | "routine";

type XpRecommendation = {
  xp: number;
  reason: string;
  source: "ai" | "fallback";
  notice?: string;
};

type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type AiRecommendationResult =
  | { data: XpRecommendation; notice: null }
  | { data: null; notice: string };

const MIN_XP = 1;
const MAX_XP = 100;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const recommendationCache = new Map<string, { data: XpRecommendation; expiresAt: number }>();

function clampXp(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_TODO_XP;
  }

  return Math.min(MAX_XP, Math.max(MIN_XP, Math.round(value)));
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]) as { xp?: unknown; reason?: unknown };
  } catch {
    return null;
  }
}

function getCacheKey(title: string, targetType: XpTargetType) {
  return `${targetType}:${title.toLocaleLowerCase("ko-KR").replace(/\s+/g, " ").trim()}`;
}

function ruleBasedRecommend(
  title: string,
  targetType: XpTargetType,
  notice: string
): XpRecommendation {
  const normalized = title.toLocaleLowerCase("ko-KR");
  let score = targetType === "routine" ? 18 : 10;

  const hardSignals = [
    "기획",
    "설계",
    "구현",
    "개발",
    "디버깅",
    "리팩터",
    "마이그레이션",
    "배포",
    "보고서",
    "발표",
    "포트폴리오",
    "공부",
    "강의",
    "운동"
  ];
  const tinySignals = [
    "휴지",
    "버리기",
    "치우기",
    "끄기",
    "켜기",
    "닫기",
    "열기",
    "꺼내기",
    "넣기"
  ];
  const physicalSignals = [
    "등산",
    "등반",
    "하이킹",
    "러닝",
    "달리기",
    "헬스",
    "수영",
    "요가",
    "필라테스",
    "자전거",
    "산책",
    "운동"
  ];
  const intensePhysicalSignals = ["정상", "종주", "관악산", "북한산", "한라산", "마라톤"];
  const outdoorSignals = ["외출", "병원", "은행", "관공서", "장보기", "마트", "이동", "방문"];
  const easySignals = ["확인", "읽기", "답장", "메일", "물", "예약", "체크", "메모"];
  const largeSignals = ["완성", "전체", "최종", "분석", "조사", "복습", "연습", "작성"];

  score += hardSignals.filter((signal) => normalized.includes(signal)).length * 15;
  score += physicalSignals.filter((signal) => normalized.includes(signal)).length * 20;
  score += intensePhysicalSignals.filter((signal) => normalized.includes(signal)).length * 35;
  score += outdoorSignals.filter((signal) => normalized.includes(signal)).length * 10;
  score += largeSignals.filter((signal) => normalized.includes(signal)).length * 10;
  score -= easySignals.filter((signal) => normalized.includes(signal)).length * 5;
  score -= tinySignals.filter((signal) => normalized.includes(signal)).length * 4;

  if (title.length >= 24) {
    score += 15;
  } else if (
    title.length <= 8 &&
    !physicalSignals.some((signal) => normalized.includes(signal)) &&
    !outdoorSignals.some((signal) => normalized.includes(signal))
  ) {
    score -= 5;
  }

  const xp = clampXp(score);
  const reason =
    xp >= 80
      ? "체력이나 시간이 크게 드는 일로 보여서 아주 높게 잡았어요."
      : xp >= 50
      ? "시간과 집중이 꽤 필요한 일로 보여서 높게 잡았어요."
      : xp <= 10
        ? "바로 끝낼 수 있는 작은 일로 보여서 낮게 잡았어요."
        : "보통 난이도의 작업으로 보고 중간 보상을 추천했어요.";

  return { xp, reason, source: "fallback", notice };
}

async function requestAiRecommendation(
  title: string,
  targetType: XpTargetType
): Promise<AiRecommendationResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      data: null,
      notice: "OPENAI_API_KEY가 없어 AI 대신 임시 추천을 적용했어요."
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_XP_MODEL ?? "gpt-5-mini",
        text: {
          format: {
            type: "json_schema",
            name: "xp_recommendation",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                xp: {
                  type: "integer",
                  minimum: MIN_XP,
                  maximum: MAX_XP,
                  description: "1~100 사이의 정수 XP. 1은 즉시 끝나는 사소한 일, 100은 매우 힘든 큰일."
                },
                reason: {
                  type: "string",
                  maxLength: 80,
                  description: "사용자가 이해할 수 있는 짧은 한국어 이유"
                }
              },
              required: ["xp", "reason"]
            }
          }
        },
        input: [
          {
            role: "system",
            content:
              "너는 OshiTodo의 XP 밸런스 도우미다. 한국어 투두/루틴 제목을 보고 보상 XP를 1~100 정수로 추천한다. XP는 시간, 체력, 집중력, 이동, 준비물, 심리적 부담을 함께 본다. 1~5는 책상 위 휴지 치우기처럼 즉시 끝나는 아주 사소한 일, 6~15는 메일 확인/짧은 정리, 16~30은 보통 집안일이나 개인 할 일, 31~55는 공부/운동/외출처럼 부담이 있는 일, 56~80은 오래 걸리거나 집중이 큰 일, 81~100은 관악산 정상 등반처럼 체력과 시간이 매우 많이 드는 일이다. 제목이 짧다는 이유만으로 낮게 주지 말고 실제 행동 부담을 우선한다."
          },
          {
            role: "user",
            content: JSON.stringify({
              type: targetType,
              title,
              examples: [
                { title: "책상 위에 휴지 치우기", xp: 1 },
                { title: "물 마시기", xp: 3 },
                { title: "메일 확인", xp: 8 },
                { title: "방 청소하기", xp: 28 },
                { title: "등산하기", xp: 55 },
                { title: "관악산 정상 등반하기", xp: 90 },
                { title: "기획서 초안 작성", xp: 60 }
              ]
            })
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return {
        data: null,
        notice: "AI 추천 호출이 실패해서 임시 추천을 적용했어요."
      };
    }

    const payload = (await response.json()) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ text?: string }> }>;
    };
    const text =
      payload.output_text ??
      payload.output
        ?.flatMap((item) => item.content ?? [])
        .map((content) => content.text)
        .filter(Boolean)
        .join("\n") ??
      "";
    const parsed = extractJson(text);

    if (!parsed || typeof parsed.xp !== "number" || typeof parsed.reason !== "string") {
      return {
        data: null,
        notice: "AI 추천 응답을 읽지 못해서 임시 추천을 적용했어요."
      };
    }

    return {
      data: {
        xp: clampXp(parsed.xp),
        reason: parsed.reason.slice(0, 120),
        source: "ai" as const
      },
      notice: null
    };
  } catch {
    return {
      data: null,
      notice: "AI 추천 연결이 지연되어 임시 추천을 적용했어요."
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getXpRecommendation(input: {
  title: string;
  type: XpTargetType;
}): Promise<XpRecommendation> {
  const title = input.title.trim().slice(0, 160);
  const targetType = input.type === "routine" ? "routine" : "todo";

  if (!title) {
    return ruleBasedRecommend(
      "할 일",
      targetType,
      "제목이 비어 있어 기본 임시 추천을 적용했어요."
    );
  }

  const cacheKey = getCacheKey(title, targetType);
  const cachedRecommendation = recommendationCache.get(cacheKey);

  if (cachedRecommendation && cachedRecommendation.expiresAt > Date.now()) {
    return cachedRecommendation.data;
  }

  const aiRecommendation = await requestAiRecommendation(title, targetType);

  if (aiRecommendation.data) {
    recommendationCache.set(cacheKey, {
      data: aiRecommendation.data,
      expiresAt: Date.now() + CACHE_TTL_MS
    });
    return aiRecommendation.data;
  }

  const fallbackRecommendation = ruleBasedRecommend(title, targetType, aiRecommendation.notice);
  recommendationCache.set(cacheKey, {
    data: fallbackRecommendation,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
  return fallbackRecommendation;
}

export async function recommendXpReward(input: {
  title: string;
  type: XpTargetType;
}): Promise<ActionResult<XpRecommendation>> {
  await requireUser();

  if (!input.title.trim()) {
    return { ok: false, error: "먼저 제목을 입력해 주세요." };
  }

  return {
    ok: true,
    data: await getXpRecommendation(input)
  };
}
