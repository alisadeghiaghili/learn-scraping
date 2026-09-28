import type { Level } from "../engine/types";
import { WORLD1_LEVELS } from "./world1";
import { WORLD2_LEVELS } from "./world2";
import { WORLD3_LEVELS } from "./world3";
import { WORLD4_LEVELS } from "./world4";
import { WORLD5_LEVELS } from "./world5";
import { WORLD6_LEVELS } from "./world6";
import { WORLD7_LEVELS } from "./world7";
import { WORLD8_LEVELS } from "./world8";

export const ALL_LEVELS: Level[] = [
  ...WORLD1_LEVELS,
  ...WORLD2_LEVELS,
  ...WORLD3_LEVELS,
  ...WORLD4_LEVELS,
  ...WORLD5_LEVELS,
  ...WORLD6_LEVELS,
  ...WORLD7_LEVELS,
  ...WORLD8_LEVELS,
];

export function findLevel(id: string): Level | undefined {
  return ALL_LEVELS.find((l) => l.id === id);
}

export function levelIds(): string[] {
  return ALL_LEVELS.map((l) => l.id);
}

export function worlds(): { id: string; title: string; levels: Level[] }[] {
  const map = new Map<string, { id: string; title: string; levels: Level[] }>();
  for (const l of ALL_LEVELS) {
    if (!map.has(l.world)) {
      map.set(l.world, { id: l.world, title: l.worldTitle, levels: [] });
    }
    map.get(l.world)!.levels.push(l);
  }
  return [...map.values()];
}
