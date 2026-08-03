export type RecommendationSettings = {
  mode: "auto" | "custom";
  availableMinutes: number;
  customTaskCount: number;
  preferredName: string;
  leaderboardOptIn: boolean;
  strategy: "balanced" | "quick" | "focus";
  preferredCategory: "" | "취업" | "공부" | "프로젝트" | "일상" | "기타";
};
export type RecommendationEnergy = "낮음" | "보통" | "높음";

export function recommendTasks<T extends { minutes: number; category?: string }>(tasks: T[], settings: RecommendationSettings, offset = 0, energy: RecommendationEnergy = "보통") {
  const energyOrdered = energy === "낮음" ? [...tasks].sort((a, b) => a.minutes - b.minutes) : energy === "높음" ? [...tasks].sort((a, b) => b.minutes - a.minutes) : [...tasks];
  const preferred = orderByPreference(energyOrdered, settings);
  const start = preferred.length ? offset % preferred.length : 0;
  const ordered = [...preferred.slice(start), ...preferred.slice(0, start)];
  if (settings.mode === "custom") return ordered.slice(0, settings.customTaskCount);

  const selected: T[] = [];
  let usedMinutes = 0;
  for (const task of ordered) {
    if (selected.length >= 5) break;
    if (selected.length === 0 || usedMinutes + task.minutes <= settings.availableMinutes) {
      selected.push(task);
      usedMinutes += task.minutes;
    }
  }
  return selected;
}

export function orderTodayTasks<T extends { id: string; done: boolean; minutes: number; category?: string }>(tasks: T[], settings: RecommendationSettings, offset = 0, energy: RecommendationEnergy = "보통") {
  const pending = tasks.filter((task) => !task.done);
  const completed = tasks.filter((task) => task.done);
  const recommended = recommendTasks(pending, settings, offset, energy);
  const recommendedIds = new Set(recommended.map((task) => task.id));
  return {
    recommended,
    ordered: [...recommended, ...pending.filter((task) => !recommendedIds.has(task.id)), ...completed],
  };
}

function orderByPreference<T extends { minutes: number; category?: string }>(tasks: T[], settings: RecommendationSettings) {
  if (settings.strategy === "quick") return [...tasks].sort((a, b) => a.minutes - b.minutes);
  if (settings.strategy === "focus" && settings.preferredCategory) {
    return [...tasks].sort((a, b) => Number(b.category === settings.preferredCategory) - Number(a.category === settings.preferredCategory));
  }
  if (settings.strategy !== "balanced") return [...tasks];
  const groups = new Map<string, T[]>();
  for (const task of tasks) groups.set(task.category ?? "기타", [...(groups.get(task.category ?? "기타") ?? []), task]);
  const result: T[] = [];
  while (result.length < tasks.length) {
    for (const group of groups.values()) {
      const next = group.shift();
      if (next) result.push(next);
    }
  }
  return result;
}
