import { isValidDateKey } from "./task-schedule.ts";

export const MAX_MULTI_DATES = 31;

export function normalizeSelectedDates(values: unknown, minDate: string, maxDates = MAX_MULTI_DATES) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values)]
    .filter((value): value is string => typeof value === "string" && isValidDateKey(value) && value >= minDate)
    .sort()
    .slice(0, maxDates);
}
