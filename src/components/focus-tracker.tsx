"use client";

import { MonitorPlay, Square } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { awardFocusXp } from "@/app/focus-actions";

export function FocusTracker() {
  const streamRef = useRef<MediaStream | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [, startTransition] = useTransition();

  async function start() {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    });
    streamRef.current = stream;
    setIsRunning(true);
    setSessionXp(0);

    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      setIsRunning(false);
      streamRef.current = null;
    });
  }

  function stop() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsRunning(false);
  }

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setSessionXp((current) => current + 1);
      startTransition(async () => {
        await awardFocusXp(1);
      });
    }, 10000);

    return () => window.clearInterval(interval);
  }, [isRunning, startTransition]);

  return (
    <section className="panel focus-panel">
      <div>
        <h2>작업창 XP</h2>
        <p className="subtle">10초마다 1 XP</p>
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
