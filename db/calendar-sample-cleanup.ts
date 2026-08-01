import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from ".";
import { stoneRewards, taskCompletions, taskSkips, tasks } from "./schema";

export const CALENDAR_SAMPLE_REASON = "캘린더 모습을 확인하기 위한 완료 기록이야";
const LEGACY_SAMPLE_DATES = ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19"];
const LEGACY_SAMPLE_TITLES = [
  "프로젝트 목표와 성공 지표 정리",
  "해결할 사용자 문제 한 문장으로 정의",
  "핵심 사용자 페르소나 정리",
  "경쟁 서비스 3곳 장단점 비교",
  "MVP 기능 우선순위 정하기",
  "핵심 사용자 흐름 와이어프레임 그리기",
  "1차 일정과 리스크 정리",
];

export async function removeCalendarSamples(db: ReturnType<typeof getDb>, ownerEmail: string) {
  const sampleTasks = await db.select({ id: tasks.id }).from(tasks).where(and(
    eq(tasks.ownerEmail, ownerEmail),
    or(
      eq(tasks.reason, CALENDAR_SAMPLE_REASON),
      and(inArray(tasks.scheduledDate, LEGACY_SAMPLE_DATES), inArray(tasks.title, LEGACY_SAMPLE_TITLES)),
    ),
  ));
  const taskIds = sampleTasks.map(({ id }) => id);
  if (!taskIds.length) return 0;

  await db.delete(taskCompletions).where(and(
    eq(taskCompletions.ownerEmail, ownerEmail),
    inArray(taskCompletions.taskId, taskIds),
  ));
  await db.delete(stoneRewards).where(and(
    eq(stoneRewards.ownerEmail, ownerEmail),
    inArray(stoneRewards.taskId, taskIds),
  ));
  await db.delete(taskSkips).where(and(
    eq(taskSkips.ownerEmail, ownerEmail),
    inArray(taskSkips.taskId, taskIds),
  ));
  await db.delete(tasks).where(and(
    eq(tasks.ownerEmail, ownerEmail),
    inArray(tasks.id, taskIds),
  ));

  return taskIds.length;
}
