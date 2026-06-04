"use server";

import { DEFAULT_TODO_XP } from "@/lib/game-config";
import { requireUser } from "@/lib/auth";

type XpTargetType = "todo" | "routine";

type XpRecommendation = {
  xp: number;
  reason: string;
  source: "ai" | "rule";
};

type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const MIN_XP = 5;
const MAX_XP = 100;

function clampXp(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_TODO_XP;
  }

  return Math.min(MAX_XP, Math.max(MIN_XP, Math.round(value / 5) * 5));
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

function ruleBasedRecommend(title: string, targetType: XpTargetType): XpRecommendation {
  const normalized = title.toLocaleLowerCase("ko-KR");
  let score = targetType === "routine" ? 15 : 10;

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
  const easySignals = ["확인", "읽기", "정리", "답장", "메일", "청소", "물", "예약", "체크"];
  const largeSignals = ["완성", "전체", "최종", "분석", "조사", "복습", "연습", "작성"];

  score += hardSignals.filter((signal) => normalized.includes(signal)).length * 15;
  score += largeSignals.filter((signal) => normalized.includes(signal)).length * 10;
  score -= easySignals.filter((signal) => normalized.includes(signal)).length * 5;

  if (title.length >= 24) {
    score += 15;
  } else if (title.length <= 8) {
    score -= 5;
  }

  const xp = clampXp(score);
  const reason =
    xp >= 50
      ? "시간과 집중이 꽤 필요한 일로 보여서 높게 잡았어요."
      : xp <= 10
        ? "짧게 끝낼 수 있는 일로 보여서 낮게 잡았어요."
        : "보통 난이도의 작업으로 보고 중간 보상을 추천했어요.";

  return { xp, reason, source: "rule" };
}

async function requestAiRecommendation(title: string, targetType: XpTargetType) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
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
        model: process.env.OPENAI_XP_MODEL ?? "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "너는 OshiTodo의 XP 밸런스 도우미다. 한국어 투두/루틴 제목을 보고 보상 XP를 5~100 사이 5 단위로 추천한다. 간단한 일은 낮게, 오래 걸리거나 복잡한 일은 높게 잡는다. 반드시 JSON만 반환한다."
          },
          {
            role: "user",
            content: JSON.stringify({
              type: targetType,
              title,
              schema: { xp: "number", reason: "짧은 한국어 이유" }
            })
          }
        ],
        temperature: 0.2
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
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
      return null;
    }

    return {
      xp: clampXp(parsed.xp),
      reason: parsed.reason.slice(0, 120),
      source: "ai" as const
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function recommendXpReward(input: {
  title: string;
  type: XpTargetType;
}): Promise<ActionResult<XpRecommendation>> {
  await requireUser();

  const title = input.title.trim().slice(0, 160);
  const targetType = input.type === "routine" ? "routine" : "todo";

  if (!title) {
    return { ok: false, error: "먼저 제목을 입력해 주세요." };
  }

  const aiRecommendation = await requestAiRecommendation(title, targetType);
  return {
    ok: true,
    data: aiRecommendation ?? ruleBasedRecommend(title, targetType)
  };
}
