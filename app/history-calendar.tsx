"use client";

import { useEffect, useMemo, useState } from "react";
import { categories, type Category } from "../lib/classification";
import { unlockedStoneIndex } from "./stone-catalog";
import StoneFace from "./stone-face";
import CuteSelect from "./cute-select";
import type { StoneStats } from "./stone-growth";
import SafeImage from "./safe-image";

export type HistoryEntry = {
  id: string;
  title: string;
  category: Category;
  minutes: number;
  recurrence: "once" | "daily";
  scheduledEndDate: string | null;
  dateKey: string;
  done: boolean;
  stoneVariant: number;
};

type HistoryResponse = { entries: HistoryEntry[] };
type HistoryCacheValue = HistoryResponse & { fetchedAt: number };

const HISTORY_CACHE_TTL = 30_000;
const historyCache = new Map<string, HistoryCacheValue>();
const historyRequests = new Map<string, Promise<HistoryResponse>>();
const historyGenerations = new Map<string, number>();

async function requestHistoryMonth(month: string, force = false) {
  if (force) historyGenerations.set(month, (historyGenerations.get(month) ?? 0) + 1);
  const generation = historyGenerations.get(month) ?? 0;
  const pending = force ? undefined : historyRequests.get(month);
  if (pending) return pending;
  const request = fetch(`/api/history?month=${month}`, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("history failed");
      const data = await response.json() as HistoryResponse;
      if ((historyGenerations.get(month) ?? 0) === generation) {
        historyCache.set(month, { ...data, fetchedAt: Date.now() });
      }
      return data;
    })
    .finally(() => {
      if (historyRequests.get(month) === request) historyRequests.delete(month);
    });
  historyRequests.set(month, request);
  return request;
}

export function prefetchHistoryMonth(month: string) {
  const cached = historyCache.get(month);
  if (cached && Date.now() - cached.fetchedAt < HISTORY_CACHE_TTL) return;
  void requestHistoryMonth(month).catch(() => undefined);
}

function kstToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function moveMonth(month: string, delta: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function demoEntries(month: string): HistoryEntry[] {
  const day = kstToday();
  if (!day.startsWith(month)) return [];
  return [
    { id: "demo-2", title: "Playwright 강의 1개 듣기", category: "공부", minutes: 25, recurrence: "once", scheduledEndDate: null, dateKey: day, done: true, stoneVariant: 2 },
    { id: "demo-1", title: "보이저엑스 예상 질문 정리", category: "취업", minutes: 40, recurrence: "once", scheduledEndDate: null, dateKey: day, done: false, stoneVariant: 7 },
  ];
}

export default function HistoryCalendar({
  signedIn,
  stoneTotal,
  refreshRevision,
  onStoneStatsChange,
}: {
  signedIn: boolean;
  stoneTotal: number;
  refreshRevision: number;
  onStoneStatsChange?: (stats: StoneStats, awarded: boolean) => void;
}) {
  const today = kstToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [filter, setFilter] = useState<"전체" | Category>("전체");
  const [entries, setEntries] = useState<HistoryEntry[]>(() => historyCache.get(today.slice(0, 7))?.entries ?? []);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(signedIn && !historyCache.has(today.slice(0, 7)));
  const [showLoading, setShowLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingEntryKey, setUpdatingEntryKey] = useState("");
  const [recordDraft, setRecordDraft] = useState({ title: "", category: "프로젝트" as Category, minutes: 30, done: true });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    const cached = historyCache.get(month);
    const startTimer = window.setTimeout(() => {
      if (!active) return;
      setEntries(cached?.entries ?? []);
      setLoadError("");
      setIsLoading(!cached);
      setIsRefreshing(Boolean(cached));
    }, 0);
    const revealTimer = cached ? undefined : window.setTimeout(() => {
      if (active) setShowLoading(true);
    }, 180);

    void requestHistoryMonth(month, refreshRevision > 0)
      .then((data) => {
        if (active) setEntries(data.entries);
      })
      .catch(() => {
        if (active) setLoadError("기록장을 불러오지 못했어. 한 번만 다시 펼쳐볼까?");
      })
      .finally(() => {
        if (!active) return;
        if (revealTimer) window.clearTimeout(revealTimer);
        setIsLoading(false);
        setIsRefreshing(false);
        setShowLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(startTimer);
      if (revealTimer) window.clearTimeout(revealTimer);
    };
  }, [month, signedIn, reloadKey, refreshRevision]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const visibleEntries = signedIn ? entries : demoEntries(month);
  const filtered = useMemo(() => filter === "전체" ? visibleEntries : visibleEntries.filter((entry) => entry.category === filter), [visibleEntries, filter]);
  const byDate = useMemo(() => {
    const result = new Map<string, HistoryEntry[]>();
    for (const entry of filtered) result.set(entry.dateKey, [...(result.get(entry.dateKey) ?? []), entry]);
    return result;
  }, [filtered]);
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const mondayOffset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const cells = [...Array(mondayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const selectedEntries = byDate.get(selectedDate) ?? [];

  function dayPresentation(dateKey: string) {
    const dayEntries = byDate.get(dateKey) ?? [];
    const completed = dayEntries.filter((entry) => entry.done).length;
    const completionRate = dayEntries.length ? Math.round((completed / dayEntries.length) * 100) : 0;
    const progressLevel = completionRate === 100 ? 4 : completionRate >= 67 ? 3 : completionRate >= 34 ? 2 : 1;
    const progressFace = ["", "·﹏·", "•︵•", "•ᴗ•", "ᵔᴗᵔ"][progressLevel];
    const completedEntry = dayEntries.find((entry) => entry.done);
    const calendarStone = completedEntry ? unlockedStoneIndex(`${completedEntry.id}:${dateKey}`, stoneTotal) : null;
    return { dayEntries, completed, completionRate, progressLevel, progressFace, calendarStone };
  }

  function changeMonth(delta: number) {
    const next = moveMonth(month, delta);
    const cached = historyCache.get(next);
    setEntries(cached?.entries ?? []);
    setIsLoading(!cached);
    setIsRefreshing(Boolean(cached));
    setShowLoading(false);
    setLoadError("");
    setMonth(next);
    setSelectedDate(`${next}-01`);
  }

  async function addPastRecord() {
    if (!recordDraft.title.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/history", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...recordDraft, dateKey: selectedDate }),
      });
      const data = await response.json() as {
        error?: string;
        entry?: HistoryEntry;
        stoneStats?: StoneStats;
        stoneAwarded?: boolean;
      };
      if (!response.ok) throw new Error(data.error ?? "기록을 저장하지 못했어.");
      if (data.entry) {
        setEntries((current) => {
          const next = [...current, data.entry as HistoryEntry]
            .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || Number(b.done) - Number(a.done));
          historyCache.set(month, { entries: next, fetchedAt: Date.now() });
          return next;
        });
      }
      if (data.stoneStats) {
        onStoneStatsChange?.(data.stoneStats, data.stoneAwarded === true);
      }
      setRecordDraft({ title: "", category: "프로젝트", minutes: 30, done: true });
      setIsRecordOpen(false);
      setNotice(recordDraft.done ? "지난 기록을 남기고 누적 성취도 1개 늘렸어." : "그날의 미완료 일정으로 기록했어.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "기록을 저장하지 못했어.");
    } finally {
      setIsSaving(false);
    }
  }

  async function changePastStatus(entry: HistoryEntry) {
    const key = `${entry.id}:${entry.dateKey}`;
    if (updatingEntryKey) return;
    setUpdatingEntryKey(key);
    try {
      const response = await fetch("/api/history", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: entry.id, dateKey: entry.dateKey, done: !entry.done }),
      });
      const data = await response.json() as { error?: string; done?: boolean; stoneStats?: StoneStats; stoneAwarded?: boolean };
      if (!response.ok) throw new Error(data.error ?? "상태를 바꾸지 못했어.");
      setEntries((current) => {
        const next = current.map((item) => item.id === entry.id && item.dateKey === entry.dateKey ? { ...item, done: data.done === true } : item);
        historyCache.set(month, { entries: next, fetchedAt: Date.now() });
        return next;
      });
      if (data.stoneStats) onStoneStatsChange?.(data.stoneStats, data.stoneAwarded === true);
      setNotice(data.done ? "이 날의 일정을 완료로 바꿨어." : "이 날의 일정을 미완료로 바꿨어.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "상태를 바꾸지 못했어.");
    } finally {
      setUpdatingEntryKey("");
    }
  }

  return (
    <><section className="history-card" aria-label="일정 기록 달력">
      <div className="calendar-toolbar">
        <button onClick={() => changeMonth(-1)} aria-label="이전 달">‹</button>
        <h2>{year}년 {monthNumber}월 {isRefreshing && <span className="calendar-refreshing" aria-label="최신 기록 확인 중">돌 정리 중</span>}</h2>
        <button onClick={() => changeMonth(1)} aria-label="다음 달">›</button>
      </div>
      <div className="calendar-filters" aria-label="분류 필터">
        {(["전체", ...categories] as const).map((category) => (
          <button key={category} className={filter === category ? "active" : ""} onClick={() => setFilter(category)}>{category}</button>
        ))}
      </div>
      {loadError && <div className="history-load-error" role="alert"><span>·﹏·</span><p>{loadError}</p><button onClick={() => { setIsLoading(true); setLoadError(""); setReloadKey((key) => key + 1); }}>다시 불러오기</button></div>}
      <div className="calendar-weekdays" aria-hidden="true">{["월", "화", "수", "목", "금", "토", "일"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">
        {cells.map((day, index) => {
          if (!day) return <span className="calendar-empty" key={`empty-${index}`} />;
          const dateKey = `${month}-${String(day).padStart(2, "0")}`;
          const { dayEntries, completionRate, progressLevel, progressFace, calendarStone } = dayPresentation(dateKey);
          return (
            <button key={dateKey} className={`${dateKey === selectedDate ? "selected " : ""}${dateKey === today ? "today" : ""}`} onClick={() => setSelectedDate(dateKey)}>
              <span>{day}</span>
              <span className="calendar-stones">{dayEntries.length > 0 && (calendarStone === null
                ? <i className={`calendar-pebble day-progress-${progressLevel}`} aria-label={`완료율 ${completionRate}%`}>{progressFace}</i>
                : <StoneFace index={calendarStone} className={`calendar-pebble day-progress-${progressLevel}`} innerClassName={`day-progress-${progressLevel}`} ariaLabel={`완료율 ${completionRate}%`} />)}</span>
            </button>
          );
        })}
      </div>
      <div className="mobile-calendar-strip" aria-label={`${year}년 ${monthNumber}월 날짜 선택`}>
        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
          const dateKey = `${month}-${String(day).padStart(2, "0")}`;
          const { dayEntries, completed, completionRate, progressLevel, progressFace, calendarStone } = dayPresentation(dateKey);
          const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "UTC" }).format(new Date(`${dateKey}T00:00:00Z`));
          return <button key={dateKey} className={`${dateKey === selectedDate ? "selected " : ""}${dateKey === today ? "today" : ""}`} onClick={() => setSelectedDate(dateKey)} aria-label={`${monthNumber}월 ${day}일 ${weekday}, 일정 ${dayEntries.length}개, ${completed}개 완료`}>
            <small>{weekday}</small>
            <strong>{day}</strong>
            <span>{dayEntries.length > 0 ? `${completed}/${dayEntries.length}` : "–"}</span>
            {dayEntries.length > 0 && (calendarStone === null
              ? <i className={`mobile-calendar-pebble day-progress-${progressLevel}`} aria-label={`완료율 ${completionRate}%`}>{progressFace}</i>
              : <StoneFace index={calendarStone} className={`mobile-calendar-pebble day-progress-${progressLevel}`} innerClassName={`day-progress-${progressLevel}`} ariaLabel={`완료율 ${completionRate}%`} />)}
          </button>;
        })}
      </div>
      <div className="day-record">
        <div><strong>{Number(selectedDate.slice(5, 7))}월 {Number(selectedDate.slice(8))}일 일정과 기록</strong><span>{selectedEntries.filter((entry) => entry.done).length}/{selectedEntries.length} 완료</span></div>
        {selectedEntries.length ? (
          <ul>{selectedEntries.map((entry) => { const entryKey = `${entry.id}:${entry.dateKey}`; const isUpdating = updatingEntryKey === entryKey; const stoneIndex = entry.done ? unlockedStoneIndex(entryKey, stoneTotal) : null; return <li key={`${entry.id}-${entry.dateKey}`}>{stoneIndex === null ? <span className="record-pebble" aria-hidden="true">·﹏·</span> : <StoneFace index={stoneIndex} className="record-pebble" ariaHidden />}<div><span className={`category category-${entry.category}`}>{entry.category}</span><strong>{entry.title}</strong><small>{entry.recurrence === "daily" ? entry.scheduledEndDate ? "기간 반복 · " : "매일 반복 · " : ""}{entry.minutes}분</small></div>{signedIn && selectedDate < today ? <button className={`record-status-button${entry.done ? " done" : ""}`} disabled={Boolean(updatingEntryKey)} onClick={() => changePastStatus(entry)}>{isUpdating ? "변경 중…" : entry.done ? "완료 ✓" : "미완료"}</button> : <b className={entry.done ? "done" : ""}>{entry.done ? "완료" : "미완료"}</b>}</li>; })}</ul>
        ) : <p className="record-empty"><span>○</span> 이 날짜에는 표시할 일정이 없어.</p>}
        {signedIn && selectedDate < today && <button className="past-record-button" onClick={() => setIsRecordOpen(true)}>＋ 지난 기록 추가</button>}
      </div>
    </section>
    {showLoading && isLoading && <HistoryLoadingOverlay />}
    {isRecordOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => { if (!isSaving) setIsRecordOpen(false); }}>
      <section className="modal past-record-modal" role="dialog" aria-modal="true" aria-labelledby="past-record-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" aria-label="닫기" disabled={isSaving} onClick={() => setIsRecordOpen(false)}>×</button>
        <p className="eyebrow">기억을 조약돌로 남기기</p>
        <h2 id="past-record-title">{Number(selectedDate.slice(5, 7))}월 {Number(selectedDate.slice(8))}일 기록</h2>
        <p>과거 기록에만 저장되고 오늘 추천에는 나타나지 않아.</p>
        <div className="edit-fields">
          <label><span>했던 일</span><input autoFocus disabled={isSaving} value={recordDraft.title} maxLength={160} placeholder="예: 프로젝트 요구사항 정리" onChange={(event) => setRecordDraft((draft) => ({ ...draft, title: event.target.value }))} /></label>
          <div className="edit-field-row">
            <div className="edit-field"><span>분류</span><CuteSelect ariaLabel="분류" disabled={isSaving} value={recordDraft.category} onChange={(category) => setRecordDraft((draft) => ({ ...draft, category }))} options={categories.map((category) => ({ value: category, label: category }))} /></div>
            <div className="edit-field"><span>걸린 시간</span><CuteSelect ariaLabel="걸린 시간" disabled={isSaving} value={recordDraft.minutes} onChange={(minutes) => setRecordDraft((draft) => ({ ...draft, minutes }))} options={[5,10,15,20,30,40,60,90,120,150,180,240].map((minutes) => ({ value: minutes, label: minutes >= 60 ? `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ""}` : `${minutes}분` }))} /></div>
          </div>
          <fieldset className="past-status-field"><legend>그날 완료했어?</legend><div><button type="button" className={recordDraft.done ? "active" : ""} onClick={() => setRecordDraft((draft) => ({ ...draft, done: true }))}>완료했어</button><button type="button" className={!recordDraft.done ? "active" : ""} onClick={() => setRecordDraft((draft) => ({ ...draft, done: false }))}>못 했어</button></div></fieldset>
        </div>
        <button className="modal-submit" disabled={isSaving || !recordDraft.title.trim()} onClick={addPastRecord}>{isSaving ? "기록을 줍는 중…" : "이 날의 기록으로 남기기"}</button>
      </section>
    </div>}
    {notice && <p className="notice-toast" role="status">{notice}</p>}
    </>
  );
}

function HistoryLoadingOverlay() {
  return <div className="history-loading-backdrop" role="status" aria-live="polite">
    <div className="history-loading-card">
      <div className="history-loading-scene">
        <SafeImage src="/chubby-bear-transparent-v3.webp" alt="" eager />
        <div className="history-book" aria-hidden="true"><span>7</span><span>14</span><span>21</span></div>
        <div className="history-loading-stones" aria-hidden="true"><i>•‿•</i><i>•ᴗ•</i><i>˙ᵕ˙</i></div>
      </div>
      <strong>곰이 기록장을 펼치는 중…</strong>
      <p>이번 달 돌 친구들을 날짜에 맞춰 놓고 있어</p>
      <span className="history-loading-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  </div>;
}
