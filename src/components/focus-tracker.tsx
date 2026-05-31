"use client";

import { Check, MonitorPlay, Pencil, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { awardFocusXp } from "@/app/focus-actions";

type FocusTrackerProps = {
  initialTodayXp: number;
};

type FocusWindowStats = {
  displayName: string;
  fullName: string;
  needsName: boolean;
  sourceKey: string;
  seconds: number;
  xp: number;
};

type CaptureHandleMediaStreamTrack = MediaStreamTrack & {
  getCaptureHandle?(): {
    handle?: string;
    origin?: string;
  } | null;
};

const FOCUS_WINDOW_NAME_STORAGE_KEY = "oshiTodo.focusWindowNames";

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}분 ${remainingSeconds}초`;
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

export function FocusTracker({ initialTodayXp }: FocusTrackerProps) {
  const streamRef = useRef<MediaStream | null>(null);
  const rewardTickRef = useRef(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [todayXp, setTodayXp] = useState(initialTodayXp);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [activeWindowKey, setActiveWindowKey] = useState("선택한 작업창");
  const [windowStats, setWindowStats] = useState<Record<string, FocusWindowStats>>({});
  const [windowOrder, setWindowOrder] = useState<string[]>([]);
  const [customWindowNames, setCustomWindowNames] =
    useState<Record<string, string>>(loadCustomWindowNames);
  const [editingWindowKey, setEditingWindowKey] = useState<string | null>(null);
  const [draftWindowName, setDraftWindowName] = useState("");
  const [, startTransition] = useTransition();

  const stopCaptureStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  function checkEligibility() {
    setIsEligible(
      Boolean(streamRef.current) && document.visibilityState === "visible" && document.hasFocus()
    );
  }

  async function start() {
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

  function stop() {
    stopCaptureStream();
    setPreviewStream(null);
    setIsRunning(false);
    setIsEligible(false);
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

    checkEligibility();
    window.addEventListener("focus", checkEligibility);
    window.addEventListener("blur", checkEligibility);
    document.addEventListener("visibilitychange", checkEligibility);

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible" || !document.hasFocus()) {
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
        setTodayXp((current) => current + 1);
        startTransition(async () => {
          await awardFocusXp(1);
        });
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", checkEligibility);
      window.removeEventListener("blur", checkEligibility);
      document.removeEventListener("visibilitychange", checkEligibility);
    };
  }, [activeWindowKey, isRunning, startTransition]);

  const orderedWindowEntries = [
    ...windowOrder
      .filter((key) => windowStats[key])
      .map((key) => [key, windowStats[key]] as const),
    ...Object.entries(windowStats).filter(([key]) => !windowOrder.includes(key))
  ];

  return (
    <section className="panel focus-panel">
      <div className="focus-panel-header">
        <h2>작업 시간</h2>
        <div className="focus-summary-row">
          <span>오늘 얻은 경험치</span>
          <strong>{todayXp} XP</strong>
        </div>
      </div>
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
              <button
                className="focus-window-delete-button"
                type="button"
                aria-label={`${stats.displayName || "작업창"} 기록 삭제`}
                title="기록 삭제"
                onClick={() => deleteWindowStats(key)}
              >
                <X size={15} />
              </button>
            </div>
          ))
        ) : (
          <div className="focus-program-row muted">
            <span>선택한 작업창 없음</span>
            <strong>{formatSeconds(activeSeconds)}</strong>
          </div>
        )}
      </div>
      <div className="focus-panel-actions">
        <span className="subtle">{isRunning && !isEligible ? "일시정지" : ""}</span>
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
    </section>
  );
}
