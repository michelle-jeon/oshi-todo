"use client";

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
  return (
    <div className="wardrobe-grid character-item-grid">
      {items.map((item) => (
        <button
          className={`wardrobe-item character-item-card ${selectedId === item.id ? "selected" : ""}`}
          key={item.id}
          type="button"
          onClick={() => onSelect(getBackgroundPayload(item))}
        >
          <span className="character-item-image">
            <span
              className="background-item-thumbnail"
              style={{
                backgroundColor: item.color,
                backgroundImage: item.imageUrl ? `url("${item.imageUrl}")` : undefined
              }}
            />
          </span>
          <span>{item.label} 배경</span>
        </button>
      ))}
    </div>
  );
}
