"use client";

/* eslint-disable @next/next/no-img-element */

import {
  getHumanCategory,
  getHumanItemCardLabel,
  getHumanItemThumbnail,
  getHumanItemStyleKey,
  shouldGroupHumanItemColors,
  type HumanLayerCategory,
  type HumanLayerItem
} from "@/lib/character-assets";

type HumanItemPickerProps = {
  category: HumanLayerCategory;
  items: HumanLayerItem[];
  selectedItemId: string;
  onSelect: (item: HumanLayerItem) => void;
};

export function HumanItemPicker({
  category,
  items,
  selectedItemId,
  onSelect
}: HumanItemPickerProps) {
  const categoryDefinition = getHumanCategory(category);
  const groupsColors = shouldGroupHumanItemColors(category);
  const groups = Array.from(
    items.reduce((map, item) => {
      const key = groupsColors ? getHumanItemStyleKey(item) : item.id;
      const group = map.get(key) ?? [];
      group.push(item);
      map.set(key, group);
      return map;
    }, new Map<string, HumanLayerItem[]>())
  ).sort(([, a], [, b]) => Number(b[0]?.id === "none") - Number(a[0]?.id === "none"));
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? items[0];
  const selectedStyleKey = selectedItem
    ? groupsColors
      ? getHumanItemStyleKey(selectedItem)
      : selectedItem.id
    : "";
  const selectedStyleColors =
    groupsColors
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
                {getHumanItemThumbnail(displayItem) ? (
                  <img src={getHumanItemThumbnail(displayItem)} alt="" />
                ) : (
                  <span className="character-item-placeholder">상품 이미지 준비 중</span>
                )}
              </span>
              <span>{getHumanItemCardLabel(displayItem)}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
