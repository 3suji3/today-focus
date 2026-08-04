import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /viewport-fit=cover/i);
  assert.match(html, /추천/);
  assert.match(html, /aria-controls="mobile-category-nav"/);
  assert.match(html, /추천 기준과 곰 말투 바꾸기/);
  const dashboard = await readFile(new URL("../app/dashboard.tsx", import.meta.url), "utf8");
  assert.match(dashboard, /말풍선 성격/);
  assert.match(dashboard, /어떤 곰과 함께할까/);
});

test("keeps embedded tablet and mobile controls responsive and inside safe areas", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.app-shell \{[^}]*container-name: app-shell[^}]*container-type: inline-size/);
  assert.match(css, /@container app-shell \(max-width: 1240px\)[\s\S]*?grid-template-areas:[\s\S]*?"tabs tabs"/);
  assert.match(css, /@container app-shell \(max-width: 1240px\)[\s\S]*?\.workspace \{ grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /@container app-shell \(max-width: 820px\) and \(min-width: 641px\)/);
  assert.match(css, /@container app-shell \(max-width: 640px\)[\s\S]*?grid-template-areas: "brand actions"/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /100dvh/);
  assert.match(css, /\.mobile-nav/);
});

test("refreshes the visible calendar immediately after adding a signed-in task", async () => {
  const [dashboard, calendar] = await Promise.all([
    readFile(new URL("../app/dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/history-calendar.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(dashboard, /setHistoryRevision\(\(revision\) => revision \+ 1\)/);
  assert.match(dashboard, /refreshRevision=\{historyRevision\}/);
  assert.match(calendar, /cache: "no-store"/);
  assert.match(calendar, /\[month, signedIn, reloadKey, refreshRevision\]/);
});

test("defers calendar reads and batches the initial dashboard queries", async () => {
  const [dashboard, taskRoute] = await Promise.all([
    readFile(new URL("../app/dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/tasks/route.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(dashboard, /setTimeout\(\(\) => prefetchHistoryMonth/);
  assert.match(dashboard, /onPointerEnter=.*prefetchHistoryMonth/);
  assert.match(taskRoute, /await db\.batch\(\[/);
  assert.match(taskRoute, /notExists\(/);
});

test("lets signed-in users edit only their own past completion status", async () => {
  const [calendar, historyRoute] = await Promise.all([
    readFile(new URL("../app/history-calendar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/history/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(calendar, /method: "PATCH"/);
  assert.match(calendar, /변경 중…/);
  assert.match(historyRoute, /payload\.dateKey >= today/);
  assert.match(historyRoute, /eq\(tasks\.ownerEmail, user\.email\)/);
  assert.match(historyRoute, /onConflictDoNothing/);
});

test("keeps ranking opt-in, private, lazy, and visibly loading", async () => {
  const [dashboard, leaderboard, route] = await Promise.all([
    readFile(new URL("../app/dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/leaderboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/leaderboard/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(dashboard, /activeTab === "랭킹" \? <Leaderboard/);
  assert.match(leaderboard, /어떤 닉네임으로 활동할까/);
  assert.match(leaderboard, /돌 순위를 세는 중/);
  assert.match(leaderboard, /leaderboard-podium/);
  assert.match(leaderboard, /다음 순위 보기/);
  assert.match(leaderboard, /my-ranking-card/);
  assert.match(leaderboard, /최근 12주를 주별로 넘겨볼 수 있어/);
  assert.match(leaderboard, /랭킹 기준을 설명하는 돌곰이/);
  assert.match(leaderboard, /한국 시간 월요일 0시부터 일요일 23시 59분까지 완료한 일정 개수/);
  assert.match(dashboard, /activeTab !== "랭킹" && <div className="guide-row">/);
  assert.match(leaderboard, /weekOffset/);
  assert.match(route, /leaderboard_opt_in = 1/);
  assert.match(route, /tc\.completed_at < \$\{week\.endAt\}/);
  assert.match(route, /const PAGE_SIZE = 20/);
  assert.match(route, /const MAX_RANK = 100/);
  assert.doesNotMatch(route, /email: row\.ownerEmail/);
});

test("supports selecting separate dates and shows feedback navigation loading", async () => {
  const [dashboard, picker, route] = await Promise.all([
    readFile(new URL("../app/dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/cute-multi-date-picker.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/tasks/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(dashboard, /draftScheduledDates/);
  assert.match(dashboard, /feedback-opening-backdrop/);
  assert.match(picker, /다시 누르면 선택 해제/);
  assert.match(route, /normalizeSelectedDates/);
  assert.match(route, /scheduledDates/);
});

test("ships a localhost-only staged load test", async () => {
  const script = await readFile(new URL("../scripts/load-test.mjs", import.meta.url), "utf8");
  assert.match(script, /"100,300,500,1000"/);
  assert.match(script, /Promise\.all/);
  assert.match(script, /p95Seconds/);
  assert.match(script, /\["127\.0\.0\.1", "localhost"\]/);
});
