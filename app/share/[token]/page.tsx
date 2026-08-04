/* eslint-disable @next/next/no-html-link-for-pages -- Vinext client navigation currently crashes in the deployed runtime. */
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { CSSProperties } from "react";
import { getDb } from "../../../db";
import { shareLinks, taskCompletions, tasks } from "../../../db/schema";
import { kstDateKey } from "../../../lib/task-schedule";
import StoneShareVisual from "../../stone-share-visual";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
const SHARE_LINK_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export default async function SharedProgress({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const [share] = await db.select().from(shareLinks).where(and(eq(shareLinks.token, token), isNull(shareLinks.revokedAt))).limit(1);

  // The page is force-dynamic, so checking the server clock here is intentional.
  // eslint-disable-next-line react-hooks/purity
  if (!share || Date.now() - share.createdAt > SHARE_LINK_LIFETIME_MS) return <SharedMissing />;
  if (share.shareType === "stones") return <SharedStones total={share.stoneCount} weekly={share.weeklyStoneCount} />;
  const ids = safeTaskIds(share.taskIds);
  const today = kstDateKey();
  const [items, completions] = await Promise.all([
    ids.length ? db.select({ id: tasks.id, title: tasks.title, category: tasks.category }).from(tasks).where(and(eq(tasks.ownerEmail, share.ownerEmail), inArray(tasks.id, ids))) : [],
    db.select({ taskId: taskCompletions.taskId }).from(taskCompletions).where(and(eq(taskCompletions.ownerEmail, share.ownerEmail), eq(taskCompletions.dateKey, today))),
  ]);
  const completedIds = new Set(completions.map((item) => item.taskId));
  const sharedItems = items.map((item) => ({ ...item, done: completedIds.has(item.id) }));
  const complete = sharedItems.filter((item) => item.done).length;
  const progress = sharedItems.length ? Math.min(100, Math.max(0, (complete / sharedItems.length) * 100)) : 0;

  return (
    <main className="share-page">
      <section className="share-card">
        <p className="eyebrow">오늘 뭐하지? · 공유된 진행 상황</p>
        <h1>오늘의 작은 약속</h1>
        <div
          className="share-progress"
          style={{ "--share-progress": `${progress}%` } as CSSProperties}
          role="img"
          aria-label={`전체 ${sharedItems.length}개 중 ${complete}개 완료`}
        >
          <strong>{complete} / {sharedItems.length}</strong>
          <span>완료</span>
        </div>
        <ul>
          {sharedItems.map((item) => (
            <li key={item.id} className={item.done ? "done" : ""}>
              <span className={`category category-${item.category}`}>{item.category}</span>
              <strong>{item.title}</strong>
              <span className="share-check">{item.done ? "✓" : "○"}</span>
            </li>
          ))}
        </ul>
        <p className="share-note">내용을 수정할 수 없고 30일 뒤 자동으로 닫히는 공유 화면이에요.</p>
        <SiteEntryCallToAction />
      </section>
    </main>
  );
}

function SharedStones({ total, weekly }: { total: number; weekly: number }) {
  return <main className="share-page"><section className="share-card stone-share-card">
    <p className="eyebrow">오늘 뭐하지? · 공유된 돌도감</p>
    <h1>차곡차곡 모은 성취와 돌 친구</h1>
    <StoneShareVisual total={total} weekly={weekly} />
    <SiteEntryCallToAction />
  </section></main>;
}

function safeTaskIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, 20) : [];
  } catch {
    return [];
  }
}

function SharedMissing() {
  return <main className="share-page"><section className="share-card"><p className="eyebrow">오늘 뭐하지?</p><h1>공유가 끝난 페이지야</h1><p>링크가 잘못됐거나 생성 후 30일이 지나 자동으로 닫혔어.</p><SiteEntryCallToAction /></section></main>;
}

function SiteEntryCallToAction() {
  return <div className="share-site-entry"><p><strong>나도 오늘의 작은 성취를 모아볼까?</strong><span>내 일정은 내 계정에만 따로 저장돼요.</span></p><a href="/">오늘 뭐하지? 시작하기 <span aria-hidden="true">→</span></a></div>;
}
