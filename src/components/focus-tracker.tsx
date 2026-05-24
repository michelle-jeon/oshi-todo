"use client";

import { MonitorPlay, Square } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { awardFocusXp } from "@/app/focus-actions";

type FocusTrackerProps = {
  initialTodayXp: number;
};

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}분 ${remainingSeconds}초`;
}

export function FocusTracker({ initialTodayXp }: FocusTrackerProps) {
  const streamRef = useRef<MediaStream | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [todayXp, setTodayXp] = useState(initialTodayXp);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [activeWindowName, setActiveWindowName] = useState("선택한 작업창");
  const [windowStats, setWindowStats] = useState<Record<string, { seconds: number; xp: number }>>({});
  const [, startTransition] = useTransition();

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
      const trackLabel = stream.getVideoTracks()[0]?.label || "선택한 작업창";
      streamRef.current = stream;
      setActiveWindowName(trackLabel);
      setWindowStats((current) => ({
        ...current,
        [trackLabel]: current[trackLabel] ?? { seconds: 0, xp: 0 }
      }));
      setIsRunning(true);
      setIsEligible(document.visibilityState === "visible" && document.hasFocus());

      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setIsRunning(false);
        setIsEligible(false);
        streamRef.current = null;
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
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsRunning(false);
    setIsEligible(false);
  }

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

      setIsEligible(true);
      setTodayXp((current) => current + 1);
      setActiveSeconds((current) => current + 10);
      setWindowStats((current) => ({
        ...current,
        [activeWindowName]: {
          seconds: (current[activeWindowName]?.seconds ?? 0) + 10,
          xp: (current[activeWindowName]?.xp ?? 0) + 1
        }
      }));
      startTransition(async () => {
        await awardFocusXp(1);
      });
    }, 10000);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", checkEligibility);
      window.removeEventListener("blur", checkEligibility);
      document.removeEventListener("visibilitychange", checkEligibility);
    };
  }, [activeWindowName, isRunning, startTransition]);

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
        {Object.entries(windowStats).length > 0 ? (
          Object.entries(windowStats).map(([name, stats]) => (
            <div className="focus-program-row" key={name}>
              <span>{name}</span>
              <strong>
                {formatSeconds(stats.seconds)} · {stats.xp} XP
              </strong>
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
