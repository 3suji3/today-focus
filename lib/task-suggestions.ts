import { normalizeTitle, type Category } from "./classification.ts";

export type TaskTemplate = {
  title: string;
  category: Category;
  minutes: number;
};

export function findTaskSuggestions(templates: TaskTemplate[], query: string, limit = 5) {
  const normalizedQuery = normalizeTitle(query);
  if (!normalizedQuery) return [];

  return templates
    .map((template, recentIndex) => {
      const normalizedTitle = normalizeTitle(template.title);
      const matchIndex = normalizedTitle.indexOf(normalizedQuery);
      return { template, recentIndex, matchIndex };
    })
    .filter((item) => item.matchIndex >= 0)
    .sort((a, b) =>
      Number(a.matchIndex > 0) - Number(b.matchIndex > 0)
      || a.matchIndex - b.matchIndex
      || a.recentIndex - b.recentIndex
    )
    .slice(0, limit)
    .map((item) => item.template);
}
