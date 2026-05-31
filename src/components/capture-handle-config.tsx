"use client";

import { useEffect } from "react";

type CaptureHandleMediaDevices = MediaDevices & {
  setCaptureHandleConfig?(config: {
    exposeOrigin: boolean;
    handle: string;
    permittedOrigins: string[];
  }): void;
};

export function CaptureHandleConfig() {
  useEffect(() => {
    const mediaDevices = navigator.mediaDevices as CaptureHandleMediaDevices | undefined;

    mediaDevices?.setCaptureHandleConfig?.({
      exposeOrigin: true,
      handle: document.title || "OshiTodo",
      permittedOrigins: ["*"]
    });
  }, []);

  return null;
}
