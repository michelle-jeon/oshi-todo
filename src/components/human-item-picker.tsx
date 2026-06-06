"use client";

/* eslint-disable @next/next/no-img-element */

import {
  getHumanCategory,
  getHumanItemStyleKey,
  type HumanLayerCategory,
  type HumanLayerItem
} from "@/lib/character-assets";

type HumanItemPickerProps = {
  category: HumanLayerCategory;
  items: HumanLayerItem[];
  selectedItemId: string;
  onSelect: (item: HumanLayerItem) => void;
  sourceLabel?: string;
};

export function HumanItemPicker({
  category,
  items,
  selectedItemId,
  onSelect,
  sourceLabel
}: HumanItemPickerProps) {
  const categoryDefinition = getHumanCategory(category);
  const groups = Array.from(
    items.reduce((map, item) => {
      const key = getHumanItemStyleKey(item);
      const group = map.get(key) ?? [];
      group.push(item);
      map.set(key, group);
      return map;
    }, new Map<string, HumanLayerItem[]>())
  );
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? items[0];
  const selectedStyleKey = selectedItem ? getHumanItemStyleKey(selectedItem) : "";
  const selectedStyleColors =
    category === "hair" || category === "eyes"
      ? groups.find(([styleKey]) => styleKey === selectedStyleKey)?.[1] ?? []
      : [];

  return (
    <>
      {selectedStyleColors.length > 1 ? (
        <div className="character-color-options" aria-label={`${categoryDefinition?.label ?? ""} 색상`}>
          {selectedStyleColors.map((item) => (
            <button
              className={selectedItemId === item.id ? "selected" : ""}
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              aria-label={`${item.label} ${item.colorLabel ?? ""}`}
              title={item.colorLabel}
            >
              <span style={{ background: item.color }} />
            </button>
          ))}
        </div>
      ) : null}

      <div className="wardrobe-grid character-item-grid">
        {groups.map(([styleKey, groupItems]) => {
          const selectedInGroup = groupItems.find((item) => item.id === selectedItemId);
          const displayItem = selectedInGroup ?? groupItems[0];
          const selected = styleKey === selectedStyleKey;

          return (
            <button
              className={`wardrobe-item character-item-card ${selected ? "selected" : ""}`}
              key={styleKey}
              type="button"
              onClick={() => onSelect(displayItem)}
            >
              <span className="character-item-image">
                {displayItem.src ? <img src={displayItem.src} alt="" /> : null}
              </span>
              <span>{displayItem.label}</span>
              {sourceLabel ? <small>{sourceLabel}</small> : null}
            </button>
          );
        })}
      </div>
    </>
  );
}
