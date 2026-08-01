export type TodayMood = "empty" | "ready" | "progress" | "complete";
export type MascotEnergy = "낮음" | "보통" | "높음";
export type MascotVariant = "celebrating" | "encouraging" | "default" | "focused";

export function getTodayMood(total: number, complete: number): TodayMood {
  if (total <= 0) return "empty";
  if (complete >= total) return "complete";
  if (complete > 0) return "progress";
  return "ready";
}

export function getMascotVariant(mood: TodayMood, energy: MascotEnergy): MascotVariant {
  if (mood === "complete") return "celebrating";
  if (energy === "낮음") return "encouraging";
  if (energy === "높음") return "focused";
  return "default";
}
