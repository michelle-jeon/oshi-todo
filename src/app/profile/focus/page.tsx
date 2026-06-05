import { ArrowLeft, BarChart3, CalendarDays, Clock3, Trophy } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { CSSProperties } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type FocusWindowLogRow = {
  id: string;
  work_date: string;
  window_key: string;
  display_name: string;
  full_name: string;
  seconds: number;
  xp: number;
  updated_at: string;
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

export default async function FocusHistoryPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const todayString = getTodayString();
  const weekStart = getWeekStart(todayString);
  const monthStart = `${todayString.slice(0, 7)}-01`;
  const lookbackStart = addDays(todayString, -89);
  const chartStart = addDays(todayString, -13);

  const { data: logs, error } = await supabase
    .from("focus_window_logs")
    .select("id, work_date, window_key, display_name, full_name, seconds, xp, updated_at")
    .eq("user_id", user.id)
    .gte("work_date", lookbackStart)
    .order("work_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .returns<FocusWindowLogRow[]>();

  const focusLogs = logs ?? [];
  const todayLogs = focusLogs.filter((log) => log.work_date === todayString);
  const weekLogs = focusLogs.filter((log) => log.work_date >= weekStart);
  const monthLogs = focusLogs.filter((log) => log.work_date >= monthStart);
  const dailyStats = buildDailyStats(focusLogs, chartStart, 14);
  const monthWorkStats = buildWorkNameStats(monthLogs);
  const topWorkStats = monthWorkStats.slice(0, 5);
  const maxDailySeconds = Math.max(...dailyStats.map((stat) => stat.seconds), 1);
  const activeMonthDays = new Set(monthLogs.map((log) => log.work_date)).size;
  const averageMonthSeconds = activeMonthDays > 0 ? Math.round(sumSeconds(monthLogs) / activeMonthDays) : 0;
  const monthTotalSeconds = sumSeconds(monthLogs);
  const topWorkSeconds = topWorkStats.reduce((sum, stat) => sum + stat.seconds, 0);
  const otherWorkSeconds = Math.max(monthTotalSeconds - topWorkSeconds, 0);
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
    background: buildDonutBackground(donutStats, monthTotalSeconds)
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

      <section className="work-summary-grid">
        <div className="panel xp-summary-card">
          <span className="profile-setting-icon">
            <Clock3 size={18} />
          </span>
          <div>
            <p className="subtle">오늘</p>
            <strong>{formatDuration(sumSeconds(todayLogs))}</strong>
            <span className="subtle">{sumXp(todayLogs).toLocaleString()} XP</span>
          </div>
        </div>
        <div className="panel xp-summary-card">
          <span className="profile-setting-icon">
            <CalendarDays size={18} />
          </span>
          <div>
            <p className="subtle">이번 주</p>
            <strong>{formatDuration(sumSeconds(weekLogs))}</strong>
            <span className="subtle">{sumXp(weekLogs).toLocaleString()} XP</span>
          </div>
        </div>
        <div className="panel xp-summary-card">
          <span className="profile-setting-icon">
            <BarChart3 size={18} />
          </span>
          <div>
            <p className="subtle">이번 달</p>
            <strong>{formatDuration(sumSeconds(monthLogs))}</strong>
            <span className="subtle">{activeMonthDays.toLocaleString()}일 기록</span>
          </div>
        </div>
        <div className="panel xp-summary-card">
          <span className="profile-setting-icon">
            <Trophy size={18} />
          </span>
          <div>
            <p className="subtle">기록일 평균</p>
            <strong>{formatDuration(averageMonthSeconds)}</strong>
            <span className="subtle">이번 달 기준</span>
          </div>
        </div>
      </section>

      <section className="panel work-chart-panel">
        <h2>최근 14일</h2>
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
                  <span>이번 달</span>
                  <strong>{formatDuration(monthTotalSeconds)}</strong>
                </div>
              </div>
            </div>
            <div className="work-window-list">
              {topWorkStats.map((stat, index) => {
                const percent = monthTotalSeconds > 0 ? Math.round((stat.seconds / monthTotalSeconds) * 100) : 0;

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
