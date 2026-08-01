export function normalizeShareTaskIds(ids: string[]) {
  return [...new Set(ids)].sort();
}

export function hasSameSharedTasks(serializedIds: string, candidateIds: string[]) {
  try {
    const parsed = JSON.parse(serializedIds);
    if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== "string")) return false;
    const existing = normalizeShareTaskIds(parsed);
    const candidate = normalizeShareTaskIds(candidateIds);
    return existing.length === candidate.length && existing.every((id, index) => id === candidate[index]);
  } catch {
    return false;
  }
}
