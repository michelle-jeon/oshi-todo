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
      streamRef.current = stream;
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
  }, [isRunning, startTransition]);

  return (
    <section className="panel focus-panel">
      <div>
        <h2>작업 시간</h2>
        <p className="subtle">{isRunning && !isEligible ? "일시정지" : "오늘 얻은 경험치"}</p>
      </div>
      <div className="focus-panel-actions">
        <div className="focus-stats">
          <strong>{todayXp} XP</strong>
          <span>오늘 활성 시간 {formatSeconds(activeSeconds)}</span>
        </div>
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
