"use client";

import { MonitorPlay, Square } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { awardFocusXp } from "@/app/focus-actions";

export function FocusTracker() {
  const streamRef = useRef<MediaStream | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [, startTransition] = useTransition();

  function checkEligibility() {
    setIsEligible(
      Boolean(streamRef.current) && document.visibilityState === "visible" && document.hasFocus()
    );
  }

  async function start() {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    });
    streamRef.current = stream;
    setIsRunning(true);
    setIsEligible(document.visibilityState === "visible" && document.hasFocus());
    setSessionXp(0);

    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      setIsRunning(false);
      setIsEligible(false);
      streamRef.current = null;
    });
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
      setSessionXp((current) => current + 1);
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
        <h2>작업창 XP</h2>
        <p className="subtle">
          {isRunning
            ? isEligible
              ? "활성 상태 · 10초마다 1 XP"
              : "일시정지 · OshiTodo 탭이 비활성 상태예요"
            : "웹 MVP에서는 OshiTodo 탭이 활성일 때만 XP가 올라요"}
        </p>
      </div>
      <div className="focus-panel-actions">
        <strong>{sessionXp} XP</strong>
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
