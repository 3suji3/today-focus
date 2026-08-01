export type Recurrence = "once" | "daily";

const KST_OFFSET = 9 * 60 * 60 * 1000;

export function kstDateKey(now = Date.now()) {
  return new Date(now + KST_OFFSET).toISOString().slice(0, 10);
}

export function dateKeyFromTimestamp(timestamp: number) {
  return kstDateKey(timestamp);
}

export function taskStartDate(task: { scheduledDate: string | null; createdAt: number }) {
  return task.scheduledDate ?? dateKeyFromTimestamp(task.createdAt);
}

export function isValidDateKey(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function isTaskVisibleOnDate(
  task: { recurrence: Recurrence; scheduledDate: string | null; scheduledEndDate?: string | null; createdAt: number },
  dateKey: string,
) {
  const startDate = taskStartDate(task);
  return task.recurrence === "daily"
    ? startDate <= dateKey && (!task.scheduledEndDate || dateKey <= task.scheduledEndDate)
    : startDate === dateKey;
}

export function isTaskUpcoming(
  task: { recurrence: Recurrence; scheduledDate: string | null; scheduledEndDate?: string | null; createdAt: number },
  dateKey: string,
) {
  return task.recurrence === "daily"
    ? !task.scheduledEndDate || task.scheduledEndDate >= dateKey
    : taskStartDate(task) >= dateKey;
}

export function completionId(taskId: string, dateKey: string) {
  return `${taskId}:${dateKey}`;
}

export function dateKeysInRange(start: string, endExclusive: string) {
  const result: string[] = [];
  let current = start;
  while (current < endExclusive) {
    result.push(current);
    const [year, month, day] = current.split("-").map(Number);
    current = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  }
  return result;
}

export function addDaysDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function monthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, rawMonth] = month.split("-").map(Number);
  if (rawMonth < 1 || rawMonth > 12) return null;
  const nextYear = rawMonth === 12 ? year + 1 : year;
  const nextMonth = rawMonth === 12 ? 1 : rawMonth + 1;
  return { start: `${month}-01`, end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01` };
}
