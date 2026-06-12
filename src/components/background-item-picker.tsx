"use client";

/* eslint-disable @next/next/no-img-element */

import {
  getBackgroundPayload,
  type CharacterBackgroundItem
} from "@/lib/character-backgrounds";

type BackgroundItemPickerProps = {
  items: CharacterBackgroundItem[];
  selectedId: string;
  onSelect(payload: Record<string, string>): void;
};

export function BackgroundItemPicker({ items, selectedId, onSelect }: BackgroundItemPickerProps) {
  const sortedItems = [...items].sort(
    (a, b) => Number(b.id === "none") - Number(a.id === "none")
  );

  return (
    <div className="wardrobe-grid character-item-grid">
      {sortedItems.map((item) => (
        <button
          className={`wardrobe-item character-item-card ${selectedId === item.id ? "selected" : ""}`}
          key={item.id}
          type="button"
          onClick={() => onSelect(getBackgroundPayload(item))}
        >
          <span className="character-item-image">
            {item.thumbnailUrl ? (
              <img src={item.thumbnailUrl} alt="" />
            ) : (
              <span
                className="background-item-thumbnail"
                style={{
                  backgroundColor: item.color,
                  backgroundImage: item.imageUrl ? `url("${item.imageUrl}")` : undefined
                }}
              />
            )}
          </span>
          <span>{item.id === "none" ? item.label : `${item.label} 배경`}</span>
        </button>
      ))}
    </div>
  );
}
