"use client";

import { CalendarDays, Check, MonitorPlay, Pencil, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { recordFocusProgress } from "@/app/focus-actions";

type FocusTrackerProps = {
  initialTodayXp: number;
  initialSelectedDate: string;
  initialLogs: FocusWindowLogItem[];
};

type FocusWindowStats = {
  displayName: string;
  fullName: string;
  needsName: boolean;
  sourceKey: string;
  seconds: number;
  xp: number;
};

export type FocusWindowLogItem = {
  id: string;
  work_date: string;
  window_key: string;
  display_name: string;
  full_name: string;
  seconds: number;
  xp: number;
  updated_at: string;
};

type CaptureHandleMediaStreamTrack = MediaStreamTrack & {
  getCaptureHandle?(): {
    handle?: string;
    origin?: string;
  } | null;
};

const FOCUS_WINDOW_NAME_STORAGE_KEY = "oshiTodo.focusWindowNames";

function getDesktopBridge() {
  return typeof window === "undefined" ? undefined : window.oshiTodoDesktop;
}

function getDesktopWindowKey(windowInfo: OshiTodoDesktopWindow) {
  return `desktop:${windowInfo.ownerBundleId ?? windowInfo.ownerName}:${windowInfo.id}`;
}

function getDesktopWindowName(windowInfo: OshiTodoDesktopWindow) {
  return {
    displayName: windowInfo.title || windowInfo.ownerName,
    fullName: [windowInfo.ownerName, windowInfo.title].filter(Boolean).join(" · "),
    needsName: false
  };
}

function isSameDesktopWindow(
  activeWindow: OshiTodoDesktopWindow | null,
  selectedWindow: OshiTodoDesktopWindow | null
) {
  if (!activeWindow || !selectedWindow) {
    return false;
  }

  if (activeWindow.id === selectedWindow.id) {
    return true;
  }

  const sameOwner =
    activeWindow.ownerBundleId && selectedWindow.ownerBundleId
      ? activeWindow.ownerBundleId === selectedWindow.ownerBundleId
      : Boolean(selectedWindow.ownerName) && activeWindow.ownerName === selectedWindow.ownerName;
  const activeTitle = activeWindow.title.trim().toLocaleLowerCase();
  const selectedTitle = selectedWindow.title.trim().toLocaleLowerCase();
  const sameTitle =
    activeTitle &&
    selectedTitle &&
    (activeTitle.includes(selectedTitle) || selectedTitle.includes(activeTitle));

  return Boolean(sameTitle && (!selectedWindow.ownerName || sameOwner));
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}분 ${remainingSeconds}초`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function getCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function logsToWindowStats(logs: FocusWindowLogItem[]) {
  return Object.fromEntries(
    logs.map((log) => [
      log.window_key,
      {
        displayName: log.display_name,
        fullName: log.full_name,
        needsName: false,
        sourceKey: log.window_key,
        seconds: log.seconds,
        xp: log.xp
      } satisfies FocusWindowStats
    ])
  );
}

function loadCustomWindowNames() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const savedNames = window.localStorage.getItem(FOCUS_WINDOW_NAME_STORAGE_KEY);

    return savedNames ? (JSON.parse(savedNames) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveCustomWindowName(key: string, name: string) {
  const currentNames = loadCustomWindowNames();
  const nextNames = {
    ...currentNames,
    [key]: name
  };

  window.localStorage.setItem(FOCUS_WINDOW_NAME_STORAGE_KEY, JSON.stringify(nextNames));
}

function getNamedWindowKey(name: string) {
  return `custom:${name.trim().toLocaleLowerCase()}`;
}

function getSourceWindowKey(name: string) {
  return `source:${name.trim().toLocaleLowerCase()}`;
}

function getReadableWindowName(rawLabel: string) {
  const label = rawLabel.trim();

  if (!label) {
    return {
      displayName: "선택한 작업창",
      fullName: "선택한 작업창",
      needsName: false
    };
  }

  if (label.startsWith("web-contents-media-stream://")) {
    return {
      displayName: "",
      fullName: label,
      needsName: true
    };
  }

  try {
    const url = new URL(label);

    return {
      displayName: url.hostname || label,
      fullName: label,
      needsName: false
    };
  } catch {
    return {
      displayName: label,
      fullName: label,
      needsName: false
    };
  }
}

function FocusWindowPreview({ name, stream }: { name: string; stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.srcObject = stream;

    return () => {
      if (video.srcObject === stream) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className="focus-window-preview" role="tooltip">
      <video ref={videoRef} autoPlay muted playsInline aria-label={`${name} 미리보기`} />
      <span>{name}</span>
    </div>
  );
}

export function FocusTracker({
  initialLogs,
  initialSelectedDate,
  initialTodayXp
}: FocusTrackerProps) {
  const streamRef = useRef<MediaStream | null>(null);
  const desktopTargetRef = useRef<OshiTodoDesktopWindow | null>(null);
  const eligibilityCheckInFlightRef = useRef(false);
  const rewardTickRef = useRef(0);
  const todayString = getTodayString();
  const [isRunning, setIsRunning] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [todayXp, setTodayXp] = useState(initialTodayXp);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [activeWindowKey, setActiveWindowKey] = useState("선택한 작업창");
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [visibleMonth, setVisibleMonth] = useState(parseDate(initialSelectedDate));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [focusLogs, setFocusLogs] = useState(initialLogs);
  const [windowStats, setWindowStats] = useState<Record<string, FocusWindowStats>>(() =>
    logsToWindowStats(initialLogs.filter((log) => log.work_date === initialSelectedDate))
  );
  const windowStatsRef = useRef(windowStats);
  const [windowOrder, setWindowOrder] = useState<string[]>(() =>
    initialLogs
      .filter((log) => log.work_date === initialSelectedDate)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .map((log) => log.window_key)
  );
  const [customWindowNames, setCustomWindowNames] =
    useState<Record<string, string>>(loadCustomWindowNames);
  const [editingWindowKey, setEditingWindowKey] = useState<string | null>(null);
  const [draftWindowName, setDraftWindowName] = useState("");
  const [desktopWindowOptions, setDesktopWindowOptions] = useState<OshiTodoDesktopWindow[]>([]);
  const [isDesktopPickerOpen, setIsDesktopPickerOpen] = useState(false);
  const [desktopErrorMessage, setDesktopErrorMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const stopCaptureStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    windowStatsRef.current = windowStats;
  }, [windowStats]);

  const readEligibility = useCallback(async () => {
    const desktopBridge = getDesktopBridge();

    if (desktopBridge && desktopTargetRef.current) {
      try {
        const activeWindow = await desktopBridge.getActiveWindow();
        return isSameDesktopWindow(activeWindow, desktopTargetRef.current);
      } catch {
        return false;
      }
    }

    return Boolean(streamRef.current) && document.visibilityState === "visible" && document.hasFocus();
  }, []);

  const checkEligibility = useCallback(async () => {
    setIsEligible(await readEligibility());
  }, [readEligibility]);

  async function beginTrackingDesktopWindow(windowInfo: OshiTodoDesktopWindow) {
    const sourceKey = getDesktopWindowKey(windowInfo);
    const windowName = getDesktopWindowName(windowInfo);
    const savedWindowName = customWindowNames[sourceKey];
    const resolvedWindowName = savedWindowName
      ? {
          displayName: savedWindowName,
          fullName: `${savedWindowName} · ${windowName.fullName}`,
          needsName: false
        }
      : windowName;
    const statsKey = savedWindowName
      ? getNamedWindowKey(savedWindowName)
      : getSourceWindowKey(windowName.fullName);

    stopCaptureStream();
    desktopTargetRef.current = windowInfo;
    rewardTickRef.current = 0;
    setPreviewStream(null);
    setActiveWindowKey(statsKey);
    setWindowOrder((current) => [statsKey, ...current.filter((key) => key !== statsKey)]);
    setWindowStats((current) => ({
      ...current,
      [statsKey]: current[statsKey] ?? {
        ...resolvedWindowName,
        sourceKey,
        seconds: 0,
        xp: 0
      }
    }));
    setDesktopErrorMessage(null);
    setIsDesktopPickerOpen(false);
    setIsRunning(true);
    try {
      const activeWindow = (await getDesktopBridge()?.getActiveWindow()) ?? null;
      setIsEligible(isSameDesktopWindow(activeWindow, windowInfo));
    } catch {
      setDesktopErrorMessage("활성 작업창 확인 권한이 필요해요.");
      setIsEligible(false);
    }
  }

  const stop = useCallback(() => {
    stopCaptureStream();
    desktopTargetRef.current = null;
    setPreviewStream(null);
    setIsRunning(false);
    setIsEligible(false);
  }, [stopCaptureStream]);

  const showDate = useCallback((dateString: string) => {
    if (dateString !== todayString && isRunning) {
      stop();
    }

    setSelectedDate(dateString);

    if (dateString !== todayString) {
      const selectedLogs = focusLogs
        .filter((log) => log.work_date === dateString)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setWindowStats(logsToWindowStats(selectedLogs));
      setWindowOrder(selectedLogs.map((log) => log.window_key));
      return;
    }

    const todayLogs = focusLogs
      .filter((log) => log.work_date === todayString)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    setWindowStats((current) => ({ ...logsToWindowStats(todayLogs), ...current }));
    setWindowOrder((current) => [
      ...current,
      ...todayLogs.map((log) => log.window_key).filter((key) => !current.includes(key))
    ]);
  }, [focusLogs, isRunning, stop, todayString]);

  async function start() {
    const desktopBridge = getDesktopBridge();

    if (desktopBridge) {
      try {
        const openWindows = await desktopBridge.getOpenWindows();

        setDesktopWindowOptions(openWindows);
        setDesktopErrorMessage(
          openWindows.length > 0 ? null : "선택할 수 있는 외부 작업창을 찾지 못했어요."
        );
        setIsDesktopPickerOpen(true);
      } catch {
        setDesktopErrorMessage("운영체제의 작업창 정보를 읽지 못했어요. 접근 권한을 확인해 주세요.");
      }

      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      const videoTrack = stream.getVideoTracks()[0] as CaptureHandleMediaStreamTrack | undefined;
      const trackLabel = videoTrack?.label || "선택한 작업창";
      const captureHandle = videoTrack?.getCaptureHandle?.();
      const sourceKey = captureHandle?.origin
        ? `${captureHandle.handle ?? trackLabel} · ${captureHandle.origin}`
        : trackLabel;
      const windowName = captureHandle?.handle
        ? {
            displayName: captureHandle.handle,
            fullName: captureHandle.origin
              ? `${captureHandle.handle} (${captureHandle.origin})`
              : captureHandle.handle,
            needsName: false
          }
        : getReadableWindowName(trackLabel);
      const savedWindowName = customWindowNames[sourceKey];
      const statsKey = savedWindowName
        ? getNamedWindowKey(savedWindowName)
        : windowName.needsName
          ? sourceKey
          : getSourceWindowKey(windowName.fullName || windowName.displayName);
      const resolvedWindowName = savedWindowName
        ? {
            displayName: savedWindowName,
            fullName: `${savedWindowName} · ${windowName.fullName}`,
            needsName: false
          }
        : windowName;
      streamRef.current = stream;
      rewardTickRef.current = 0;
      setPreviewStream(stream);
      setActiveWindowKey(statsKey);
      setWindowOrder((current) => [statsKey, ...current.filter((key) => key !== statsKey)]);
      setWindowStats((current) => ({
        ...current,
        [statsKey]: current[statsKey] ?? {
          ...resolvedWindowName,
          sourceKey,
          seconds: 0,
          xp: 0
        }
      }));
      if (resolvedWindowName.needsName) {
        setEditingWindowKey(statsKey);
        setDraftWindowName("");
      }
      setIsRunning(true);
      setIsEligible(document.visibilityState === "visible" && document.hasFocus());

      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setIsRunning(false);
        setIsEligible(false);
        stopCaptureStream();
        setPreviewStream(null);
      });
    } catch (error) {
      const isUserCancel =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "AbortError");

      if (!isUserCancel) {
        throw error;
      }
    }
  }

  function startEditingWindowName(key: string, currentName: string) {
    setEditingWindowKey(key);
    setDraftWindowName(currentName);
  }

  function saveWindowName() {
    if (!editingWindowKey) {
      return;
    }

    const nextName = draftWindowName.trim();

    if (!nextName) {
      setWindowStats((current) => ({
        ...current,
        [editingWindowKey]: {
          ...current[editingWindowKey],
          displayName: "이름 없는 작업창",
          needsName: true
        }
      }));
      return;
    }

    const namedWindowKey = getNamedWindowKey(nextName);

    setWindowStats((current) => ({
      ...Object.fromEntries(
        Object.entries(current).filter(([key]) => key !== editingWindowKey && key !== namedWindowKey)
      ),
      [namedWindowKey]: {
        ...current[editingWindowKey],
        ...current[namedWindowKey],
        displayName: nextName,
        fullName: `${nextName} · ${
          current[editingWindowKey]?.fullName ?? current[namedWindowKey]?.fullName ?? editingWindowKey
        }`,
        needsName: false,
        sourceKey: current[editingWindowKey]?.sourceKey ?? current[namedWindowKey]?.sourceKey ?? editingWindowKey,
        seconds:
          (current[namedWindowKey]?.seconds ?? 0) +
          (namedWindowKey === editingWindowKey ? 0 : (current[editingWindowKey]?.seconds ?? 0)),
        xp:
          (current[namedWindowKey]?.xp ?? 0) +
          (namedWindowKey === editingWindowKey ? 0 : (current[editingWindowKey]?.xp ?? 0))
      }
    }));
    const sourceKey = windowStats[editingWindowKey]?.sourceKey ?? editingWindowKey;
    saveCustomWindowName(sourceKey, nextName);
    setCustomWindowNames((current) => ({
      ...current,
      [sourceKey]: nextName
    }));
    setWindowOrder((current) => [
      namedWindowKey,
      ...current.filter((key) => key !== editingWindowKey && key !== namedWindowKey)
    ]);
    setActiveWindowKey((current) => (current === editingWindowKey ? namedWindowKey : current));
    setEditingWindowKey(null);
  }

  function deleteWindowStats(key: string) {
    if (key === activeWindowKey) {
      stop();
      setActiveWindowKey("선택한 작업창");
    }

    if (editingWindowKey === key) {
      setEditingWindowKey(null);
      setDraftWindowName("");
    }

    setWindowStats((current) => {
      const nextStats = { ...current };
      delete nextStats[key];

      return nextStats;
    });
    setWindowOrder((current) => current.filter((windowKey) => windowKey !== key));
  }

  useEffect(() => {
    window.addEventListener("pagehide", stopCaptureStream);
    window.addEventListener("beforeunload", stopCaptureStream);

    return () => {
      window.removeEventListener("pagehide", stopCaptureStream);
      window.removeEventListener("beforeunload", stopCaptureStream);
      stopCaptureStream();
    };
  }, [stopCaptureStream]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    window.addEventListener("focus", checkEligibility);
    window.addEventListener("blur", checkEligibility);
    document.addEventListener("visibilitychange", checkEligibility);

    const interval = window.setInterval(async () => {
      if (eligibilityCheckInFlightRef.current) {
        return;
      }

      eligibilityCheckInFlightRef.current = true;

      try {
        const eligible = await readEligibility();

        if (!eligible) {
          setIsEligible(false);
          return;
        }

        rewardTickRef.current += 1;
        const shouldAwardXp = rewardTickRef.current >= 10;

        if (shouldAwardXp) {
          rewardTickRef.current = 0;
        }

        setIsEligible(true);
        setActiveSeconds((current) => current + 1);
        setWindowStats((current) => ({
          ...current,
          [activeWindowKey]: {
            displayName: current[activeWindowKey]?.displayName ?? activeWindowKey,
            fullName: current[activeWindowKey]?.fullName ?? activeWindowKey,
            needsName: current[activeWindowKey]?.needsName ?? false,
            sourceKey: current[activeWindowKey]?.sourceKey ?? activeWindowKey,
            seconds: (current[activeWindowKey]?.seconds ?? 0) + 1,
            xp: (current[activeWindowKey]?.xp ?? 0) + (shouldAwardXp ? 1 : 0)
          }
        }));

        if (shouldAwardXp) {
          const activeStats = windowStatsRef.current[activeWindowKey];
          setTodayXp((current) => current + 1);
          setFocusLogs((current) => {
            const existingLog = current.find(
              (log) => log.work_date === todayString && log.window_key === activeWindowKey
            );
            const nextLog: FocusWindowLogItem = {
              id: existingLog?.id ?? `temp-${activeWindowKey}`,
              work_date: todayString,
              window_key: activeWindowKey,
              display_name: activeStats?.displayName ?? activeWindowKey,
              full_name: activeStats?.fullName ?? activeWindowKey,
              seconds: (existingLog?.seconds ?? 0) + 10,
              xp: (existingLog?.xp ?? 0) + 1,
              updated_at: new Date().toISOString()
            };

            return [nextLog, ...current.filter((log) => log.id !== nextLog.id)];
          });
          startTransition(async () => {
            await recordFocusProgress({
              windowKey: activeWindowKey,
              displayName: activeStats?.displayName ?? activeWindowKey,
              fullName: activeStats?.fullName ?? activeWindowKey,
              secondsDelta: 10,
              xpDelta: 1,
              workDate: todayString
            });
          });
        }
      } finally {
        eligibilityCheckInFlightRef.current = false;
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", checkEligibility);
      window.removeEventListener("blur", checkEligibility);
      document.removeEventListener("visibilitychange", checkEligibility);
    };
  }, [activeWindowKey, checkEligibility, isRunning, readEligibility, startTransition, todayString]);

  const orderedWindowEntries = [
    ...windowOrder
      .filter((key) => windowStats[key])
      .map((key) => [key, windowStats[key]] as const),
    ...Object.entries(windowStats).filter(([key]) => !windowOrder.includes(key))
  ];
  const calendarDays = getCalendarDays(visibleMonth);
  const monthLabel = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long"
  }).format(visibleMonth);
  const selectedDateLabel = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(parseDate(selectedDate));
  const isViewingToday = selectedDate === todayString;

  return (
    <section className="panel focus-panel">
      <div className="focus-panel-header">
        <div className="todo-section-header">
          <button
            className="calendar-toggle"
            type="button"
            aria-label="작업시간 캘린더 열기"
            onClick={() => setIsCalendarOpen((current) => !current)}
          >
            <CalendarDays size={20} />
          </button>
          <h2>작업 시간</h2>
        </div>
        <div className="focus-summary-row">
          <span>{selectedDateLabel}</span>
          <strong>{isViewingToday ? `${todayXp} XP` : `${orderedWindowEntries.length}개 기록`}</strong>
        </div>
      </div>
      {isCalendarOpen ? (
        <div className="calendar-drawer open">
          <div className="calendar-card">
            <div className="calendar-card-header">
              <button
                className="ghost-button"
                type="button"
                onClick={() =>
                  setVisibleMonth(
                    (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                  )
                }
              >
                이전
              </button>
              <span className="calendar-month-trigger">{monthLabel}</span>
              <button
                className="ghost-button"
                type="button"
                onClick={() =>
                  setVisibleMonth(
                    (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                  )
                }
              >
                다음
              </button>
            </div>
            <div className="calendar-weekdays">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {calendarDays.map((date) => {
                const dateString = toDateString(date);
                const isSelected = dateString === selectedDate;
                const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();
                const dayLogs = focusLogs.filter((log) => log.work_date === dateString);
                const totalMinutes = Math.floor(
                  dayLogs.reduce((sum, log) => sum + log.seconds, 0) / 60
                );

                return (
                  <button
                    className={`${isSelected ? "selected" : ""} ${
                      isOutsideMonth ? "outside-month" : ""
                    }`}
                    key={dateString}
                    type="button"
                    onClick={() => showDate(dateString)}
                  >
                    <span>{date.getDate()}</span>
                    <span className="calendar-badges">
                      {dayLogs.length > 0 ? <em className="open-count">{dayLogs.length}</em> : null}
                      {totalMinutes > 0 ? (
                        <em className="completed-count">{totalMinutes}m</em>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      <div className="focus-program-list">
        {orderedWindowEntries.length > 0 ? (
          orderedWindowEntries.map(([key, stats]) => (
            <div className="focus-program-item" key={key}>
              <div className={`focus-program-row ${isRunning && activeWindowKey === key ? "active" : ""}`}>
                {editingWindowKey === key ? (
                  <div className="focus-window-edit">
                    <input
                      value={draftWindowName}
                      placeholder="예: 인프런"
                      maxLength={60}
                      aria-label="작업창 이름"
                      onChange={(event) => setDraftWindowName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          saveWindowName();
                        }

                        if (event.key === "Escape") {
                          setEditingWindowKey(null);
                        }
                      }}
                      autoFocus
                    />
                    <button type="button" onClick={saveWindowName} aria-label="작업창 이름 저장">
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingWindowKey(null)}
                      aria-label="작업창 이름 편집 취소"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="focus-window-name-wrap">
                    <button
                      className="focus-window-name-button"
                      type="button"
                      title={stats.fullName}
                      onClick={() => startEditingWindowName(key, stats.displayName)}
                    >
                      <span className="focus-window-name">
                        {stats.displayName || "작업창 이름 입력"}
                      </span>
                      <Pencil size={13} />
                    </button>
                    {isRunning && activeWindowKey === key && previewStream ? (
                      <FocusWindowPreview
                        name={stats.displayName || "작업창 미리보기"}
                        stream={previewStream}
                      />
                    ) : null}
                  </div>
                )}
                <strong>
                  {formatSeconds(stats.seconds)} · {stats.xp} XP
                </strong>
              </div>
              {isViewingToday ? (
                <button
                  className="focus-window-delete-button"
                  type="button"
                  aria-label={`${stats.displayName || "작업창"} 기록 삭제`}
                  title="기록 삭제"
                  onClick={() => deleteWindowStats(key)}
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <div className="focus-program-row muted">
            <span>선택한 작업창 없음</span>
            <strong>{formatSeconds(activeSeconds)}</strong>
          </div>
        )}
      </div>
      {isViewingToday ? (
        <div className="focus-panel-actions">
          <span className="subtle">
            {desktopErrorMessage ?? (isRunning && !isEligible ? "일시정지" : "")}
          </span>
          {isRunning ? (
            <button className="ghost-button" type="button" onClick={stop}>
              <Square size={16} /> 중지
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={start}>
              <MonitorPlay size={16} /> 작업창 선택
            </button>
          )}
        </div>
      ) : null}
      {isDesktopPickerOpen ? (
        <div className="modal-backdrop" onClick={() => setIsDesktopPickerOpen(false)}>
          <div
            className="confirm-modal desktop-window-picker"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>작업창 선택</h2>
            <div className="desktop-window-list">
              {desktopWindowOptions.map((windowInfo) => (
                <button
                  key={`${windowInfo.ownerName}:${windowInfo.id}`}
                  type="button"
                  onClick={() => void beginTrackingDesktopWindow(windowInfo)}
                >
                  <strong>{windowInfo.title}</strong>
                  <span>{windowInfo.ownerName || "데스크톱 창"}</span>
                </button>
              ))}
              {desktopWindowOptions.length === 0 ? (
                <div className="empty-state">선택할 수 있는 외부 작업창이 없어요.</div>
              ) : null}
            </div>
            <div className="form-actions">
              <button className="ghost-button" type="button" onClick={() => setIsDesktopPickerOpen(false)}>
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
