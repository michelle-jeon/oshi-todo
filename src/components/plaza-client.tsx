"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PlazaClientProps = {
  roomId: string;
  userId: string;
  displayName: string;
  avatarLabel: string;
};

type PlazaAvatar = {
  userId: string;
  displayName: string;
  avatarLabel: string;
  x: number;
  y: number;
  color: string;
};

const colors = ["#2f6f73", "#d85f45", "#d8a333", "#6f5fb8", "#4f7fc7", "#9b5c2d"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function PlazaClient({ roomId, userId, displayName, avatarLabel }: PlazaClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [avatars, setAvatars] = useState<Record<string, PlazaAvatar>>({});
  const [self, setSelf] = useState<PlazaAvatar>(() => ({
    userId,
    displayName,
    avatarLabel,
    x: 48,
    y: 54,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));
  const initialSelfRef = useRef(self);

  useEffect(() => {
    const channel = supabase.channel(`plaza:${roomId}`, {
      config: {
        presence: { key: userId }
      }
    });

    channelRef.current = channel;
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PlazaAvatar>();
      const nextAvatars: Record<string, PlazaAvatar> = {};

      Object.entries(state).forEach(([key, presences]) => {
        const latest = presences.at(-1);

        if (latest) {
          nextAvatars[key] = latest;
        }
      });

      setAvatars(nextAvatars);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track(initialSelfRef.current);
      }
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomId, supabase, userId]);

  useEffect(() => {
    channelRef.current?.track(self);
  }, [self]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const delta = 5;
      const next = { x: 0, y: 0 };

      if (key === "arrowup" || key === "w") {
        next.y = -delta;
      } else if (key === "arrowdown" || key === "s") {
        next.y = delta;
      } else if (key === "arrowleft" || key === "a") {
        next.x = -delta;
      } else if (key === "arrowright" || key === "d") {
        next.x = delta;
      } else {
        return;
      }

      event.preventDefault();
      setSelf((current) => ({
        ...current,
        x: clamp(current.x + next.x, 5, 92),
        y: clamp(current.y + next.y, 10, 86)
      }));
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const visibleAvatars = { ...avatars, [userId]: self };

  return (
    <section className="plaza-stage" tabIndex={0} aria-label="광장">
      <div className="plaza-path" />
      <div className="plaza-fountain" />
      <div className="plaza-tree left" />
      <div className="plaza-tree right" />
      {Object.values(visibleAvatars).map((avatar) => (
        <div
          className="plaza-avatar"
          key={avatar.userId}
          style={{
            left: `${avatar.x}%`,
            top: `${avatar.y}%`,
            borderColor: avatar.color
          }}
        >
          <span>{avatar.avatarLabel}</span>
          <strong>{avatar.displayName}</strong>
        </div>
      ))}
    </section>
  );
}
