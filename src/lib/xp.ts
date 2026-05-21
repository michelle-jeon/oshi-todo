import { LEVEL_THRESHOLDS } from "@/lib/game-config";

export function getLevelFromTotalXp(totalXp: number) {
  let level = 1;

  for (let index = 0; index < LEVEL_THRESHOLDS.length; index += 1) {
    if (totalXp >= LEVEL_THRESHOLDS[index]) {
      level = index + 1;
    }
  }

  return level;
}

export function getLevelProgress(totalXp: number) {
  const level = getLevelFromTotalXp(totalXp);
  const currentFloor = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextFloor = LEVEL_THRESHOLDS[level] ?? currentFloor + 500;
  const span = Math.max(nextFloor - currentFloor, 1);

  return {
    level,
    currentLevelXp: totalXp - currentFloor,
    xpForNextLevel: span,
    percent: Math.min(100, Math.round(((totalXp - currentFloor) / span) * 100))
  };
}
