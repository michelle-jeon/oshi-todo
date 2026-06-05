import { ArrowLeft, BarChart3, CalendarDays, Clock3, Trophy } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { CSSProperties } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type FocusSearchParams = {
  character?: string;
  from?: string;
  period?: string;
  to?: string;
  work?: string;
};

type FocusWindowLogRow = {
  character_id: string | null;
  id: string;
  work_date: string;
  window_key: string;
  display_name: string;
  full_name: string;
  seconds: number;
  xp: number;
  updated_at: string;
};

type CharacterFilterRow = {
  id: string;
  display_name: string;
  is_active: boolean;
};

type DailyStat = {
  date: string;
  seconds: number;
  xp: number;
};

type WorkNameStat = {
  key: string;
  name: string;
  seconds: number;
  xp: number;
  days: Set<string>;
};

const WORK_STAT_COLORS = ["#2f8f6b", "#d69a2d", "#5f6fb4", "#b95f46", "#7a8f44", "#9b6fb0"];
const PERIOD_OPTIONS = [
  { value: "today", label: "오늘" },
  { value: "week", label: "이번 주" },
  { value: "month", label: "이번 달" },
  { value: "custom", label: "직접 지정" }
] as const;

type PeriodOption = (typeof PERIOD_OPTIONS)[number]["value"];

type FocusPeriodRange = {
  endDate: string;
  period: PeriodOption;
  startDate: string;
};

function parseDateString(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString: string, amount: number) {
  const date = parseDateString(dateString);
  date.setDate(date.getDate() + amount);
  return toDateString(date);
}

function getDaysBetween(startDate: string, endDate: string) {
  const start = parseDateString(startDate).getTime();
  const end = parseDateString(endDate).getTime();

  return Math.max(Math.round((end - start) / 86_400_000) + 1, 1);
}

function getTodayString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function getWeekStart(dateString: string) {
  const date = parseDateString(dateString);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return toDateString(date);
}

function isDateString(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return toDateString(parseDateString(value)) === value;
}

function isPeriodOption(value?: string): value is PeriodOption {
  return PERIOD_OPTIONS.some((option) => option.value === value);
}

function getPeriodRange(params: FocusSearchParams, todayString: string): FocusPeriodRange {
  const monthStart = `${todayString.slice(0, 7)}-01`;
  const period = isPeriodOption(params.period) ? params.period : "month";

  if (period === "today") {
    return { endDate: todayString, period, startDate: todayString };
  }

  if (period === "week") {
    return { endDate: todayString, period, startDate: getWeekStart(todayString) };
  }

  if (period === "custom") {
    const from = isDateString(params.from) ? params.from : monthStart;
    const to = isDateString(params.to) ? params.to : todayString;

    if (from > to) {
      return { endDate: from, period, startDate: to };
    }

    return { endDate: to, period, startDate: from };
  }

  return { endDate: todayString, period: "month", startDate: monthStart };
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours <= 0) {
    return `${minutes}분`;
  }

  return `${hours}시간 ${minutes}분`;
}

function formatShortDate(dateString: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric"
  }).format(parseDateString(dateString));
}

function sumSeconds(logs: FocusWindowLogRow[]) {
  return logs.reduce((sum, log) => sum + log.seconds, 0);
}

function sumXp(logs: FocusWindowLogRow[]) {
  return logs.reduce((sum, log) => sum + log.xp, 0);
}

function buildDailyStats(logs: FocusWindowLogRow[], startDate: string, days: number) {
  const stats = new Map<string, DailyStat>();

  Array.from({ length: days }, (_, index) => addDays(startDate, index)).forEach((date) => {
    stats.set(date, { date, seconds: 0, xp: 0 });
  });

  logs.forEach((log) => {
    const stat = stats.get(log.work_date);

    if (!stat) {
      return;
    }

    stat.seconds += log.seconds;
    stat.xp += log.xp;
  });

  return Array.from(stats.values());
}

function getWorkName(log: FocusWindowLogRow) {
  return log.display_name || log.full_name || "이름 없는 작업";
}

function buildWorkNameStats(logs: FocusWindowLogRow[]) {
  const stats = new Map<string, WorkNameStat>();

  logs.forEach((log) => {
    const name = getWorkName(log);
    const key = name.trim().toLocaleLowerCase();
    const current =
      stats.get(key) ??
      ({
        key,
        name,
        seconds: 0,
        xp: 0,
        days: new Set<string>()
      } satisfies WorkNameStat);

    current.seconds += log.seconds;
    current.xp += log.xp;
    current.days.add(log.work_date);
    stats.set(key, current);
  });

  return Array.from(stats.values()).sort((a, b) => b.seconds - a.seconds);
}

function buildDonutBackground(stats: WorkNameStat[], totalSeconds: number) {
  if (totalSeconds <= 0) {
    return "#efe5d4";
  }

  let cursor = 0;
  const segments = stats.map((stat, index) => {
    const start = cursor;
    const end = cursor + (stat.seconds / totalSeconds) * 100;
    cursor = end;

    return `${WORK_STAT_COLORS[index % WORK_STAT_COLORS.length]} ${start}% ${end}%`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

export default async function FocusHistoryPage({
  searchParams
}: {
  searchParams: Promise<FocusSearchParams>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const params = await searchParams;
  const todayString = getTodayString();
  const { endDate, period, startDate } = getPeriodRange(params, todayString);
  const workFilter = params.work?.trim() ?? "";
  const normalizedWorkFilter = workFilter.toLocaleLowerCase();
  const requestedCharacterId = params.character?.trim() ?? "";
  const [{ data: logs, error }, { data: characters }] = await Promise.all([
    supabase
      .from("focus_window_logs")
      .select("id, character_id, work_date, window_key, display_name, full_name, seconds, xp, updated_at")
      .eq("user_id", user.id)
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .order("work_date", { ascending: false })
      .order("updated_at", { ascending: false })
      .returns<FocusWindowLogRow[]>(),
    supabase
      .from("characters")
      .select("id, display_name, is_active")
      .eq("user_id", user.id)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: true })
      .returns<CharacterFilterRow[]>()
  ]);
  const characterOptions = characters ?? [];
  const selectedCharacterId = characterOptions.some((character) => character.id === requestedCharacterId)
    ? requestedCharacterId
    : "";
  const focusLogs = (logs ?? []).filter((log) => {
    const matchesCharacter = !selectedCharacterId || log.character_id === selectedCharacterId;
    const matchesWork =
      normalizedWorkFilter.length === 0 ||
      `${log.display_name} ${log.full_name}`.toLocaleLowerCase().includes(normalizedWorkFilter);

    return matchesCharacter && matchesWork;
  });
  const chartDays = Math.min(getDaysBetween(startDate, endDate), 31);
  const chartStart = getDaysBetween(startDate, endDate) > 31 ? addDays(endDate, -30) : startDate;
  const dailyStats = buildDailyStats(focusLogs, chartStart, chartDays);
  const workStats = buildWorkNameStats(focusLogs);
  const topWorkStats = workStats.slice(0, 5);
  const maxDailySeconds = Math.max(...dailyStats.map((stat) => stat.seconds), 1);
  const activeDays = new Set(focusLogs.map((log) => log.work_date)).size;
  const totalSeconds = sumSeconds(focusLogs);
  const totalXp = sumXp(focusLogs);
  const averageSeconds = activeDays > 0 ? Math.round(totalSeconds / activeDays) : 0;
  const topWorkSeconds = topWorkStats.reduce((sum, stat) => sum + stat.seconds, 0);
  const otherWorkSeconds = Math.max(totalSeconds - topWorkSeconds, 0);
  const donutStats =
    otherWorkSeconds > 0
      ? [
          ...topWorkStats,
          {
            key: "other",
            name: "기타",
            seconds: otherWorkSeconds,
            xp: 0,
            days: new Set<string>()
          }
        ]
      : topWorkStats;
  const donutStyle = {
    background: buildDonutBackground(donutStats, totalSeconds)
  } satisfies CSSProperties;

  return (
    <main className="simple-shell">
      <header className="simple-header">
        <Link className="ghost-button" href={"/profile" as Route}>
          <ArrowLeft size={16} /> 계정 설정
        </Link>
        <h1>작업시간 기록</h1>
      </header>

      {error ? (
        <p className="notice">
          작업시간 DB 스키마가 아직 준비되지 않았어요. SQL Editor에서
          `supabase/sql_editor/01_focus_logs_schema.sql` 내용을 실행한 뒤 새로고침해 주세요.
        </p>
      ) : null}

      <section className="panel work-filter-panel">
        <form className="work-filter-form" action="/profile/focus">
          <label>
            <span>기간</span>
            <select name="period" defaultValue={period}>
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>시작일</span>
            <input name="from" type="date" defaultValue={startDate} />
          </label>
          <label>
            <span>종료일</span>
            <input name="to" type="date" defaultValue={endDate} />
          </label>
          <label>
            <span>작업 이름</span>
            <input name="work" type="search" defaultValue={workFilter} placeholder="예: 디자인" />
          </label>
          <label>
            <span>캐릭터</span>
            <select name="character" defaultValue={selectedCharacterId}>
              <option value="">전체 캐릭터</option>
              {characterOptions.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.display_name}
                  {character.is_active ? " · 활성" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="work-filter-actions">
            <button className="primary-button" type="submit">
              적용
            </button>
            <Link className="ghost-button" href={"/profile/focus" as Route}>
              초기화
            </Link>
          </div>
        </form>
      </section>

      <section className="work-summary-grid">
        <div className="panel xp-summary-card">
          <span className="profile-setting-icon">
            <Clock3 size={18} />
          </span>
          <div>
            <p className="subtle">선택 기간</p>
            <strong>{formatDuration(totalSeconds)}</strong>
            <span className="subtle">
              {formatShortDate(startDate)} - {formatShortDate(endDate)}
            </span>
          </div>
        </div>
        <div className="panel xp-summary-card">
          <span className="profile-setting-icon">
            <CalendarDays size={18} />
          </span>
          <div>
            <p className="subtle">기록일</p>
            <strong>{activeDays.toLocaleString()}일</strong>
            <span className="subtle">작업 기록 기준</span>
          </div>
        </div>
        <div className="panel xp-summary-card">
          <span className="profile-setting-icon">
            <BarChart3 size={18} />
          </span>
          <div>
            <p className="subtle">획득 XP</p>
            <strong>{totalXp.toLocaleString()} XP</strong>
            <span className="subtle">작업창 기록</span>
          </div>
        </div>
        <div className="panel xp-summary-card">
          <span className="profile-setting-icon">
            <Trophy size={18} />
          </span>
          <div>
            <p className="subtle">기록일 평균</p>
            <strong>{formatDuration(averageSeconds)}</strong>
            <span className="subtle">선택 기간 기준</span>
          </div>
        </div>
      </section>

      <section className="panel work-chart-panel">
        <h2>날짜별 기록</h2>
        <div className="work-day-chart">
          {dailyStats.map((stat) => (
            <div className="work-day-row" key={stat.date}>
              <span>{formatShortDate(stat.date)}</span>
              <div className="work-day-bar-track">
                <div
                  className="work-day-bar"
                  style={{ width: `${Math.max((stat.seconds / maxDailySeconds) * 100, stat.seconds > 0 ? 6 : 0)}%` }}
                />
              </div>
              <strong>{formatDuration(stat.seconds)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel work-chart-panel">
        <h2>작업 이름별 통계</h2>
        {topWorkStats.length > 0 ? (
          <div className="work-share-layout">
            <div className="work-donut-wrap">
              <div className="work-donut" style={donutStyle}>
                <div>
                  <span>선택 기간</span>
                  <strong>{formatDuration(totalSeconds)}</strong>
                </div>
              </div>
            </div>
            <div className="work-window-list">
              {topWorkStats.map((stat, index) => {
                const percent = totalSeconds > 0 ? Math.round((stat.seconds / totalSeconds) * 100) : 0;

                return (
                  <article className="work-window-row" key={stat.key}>
                    <span
                      className="work-window-rank"
                      style={{
                        background: WORK_STAT_COLORS[index % WORK_STAT_COLORS.length],
                        color: "#ffffff"
                      }}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <strong>{stat.name}</strong>
                      <p className="subtle">
                        {stat.days.size.toLocaleString()}일 · {stat.xp.toLocaleString()} XP · {percent}%
                      </p>
                      <div className="work-window-meter">
                        <div style={{ width: `${Math.max(percent, 4)}%` }} />
                      </div>
                    </div>
                    <strong>{formatDuration(stat.seconds)}</strong>
                  </article>
                );
              })}
              {otherWorkSeconds > 0 ? (
                <article className="work-window-row muted-work-row">
                  <span className="work-window-rank">+</span>
                  <div>
                    <strong>기타</strong>
                    <p className="subtle">상위 5개 밖의 작업</p>
                  </div>
                  <strong>{formatDuration(otherWorkSeconds)}</strong>
                </article>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="empty-state">이번 달 작업시간 기록이 아직 없어요.</div>
        )}
      </section>
    </main>
  );
}
