"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SafeImage from "./safe-image";

type Ranking = { rank: number; name: string; score: number; isMe: boolean };
type LeaderboardResponse = {
  rankings?: Ranking[];
  myRanking?: Ranking | null;
  hasMore?: boolean;
  page?: number;
  totalParticipants?: number;
  weekOffset?: number;
  weekStartDate?: string;
  weekEndDate?: string;
  error?: string;
};

export default function Leaderboard({
  signedIn,
  preferredName,
  optIn,
  onSettingsChange,
}: {
  signedIn: boolean;
  preferredName: string;
  optIn: boolean;
  onSettingsChange: (preferredName: string, optIn: boolean) => void;
}) {
  const [scope, setScope] = useState<"weekly" | "total">("weekly");
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekRange, setWeekRange] = useState({ start: "", end: "" });
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [myRanking, setMyRanking] = useState<Ranking | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [isLoading, setIsLoading] = useState(signedIn);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [isNicknameOpen, setIsNicknameOpen] = useState(signedIn && !preferredName.trim());
  const [nicknameDraft, setNicknameDraft] = useState(preferredName);

  const loadPage = useCallback(async (nextPage: number, append: boolean) => {
    if (!signedIn) return;
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/leaderboard?scope=${scope}&page=${nextPage}&weekOffset=${weekOffset}`, { cache: "no-store" });
      const data = await response.json() as LeaderboardResponse;
      if (!response.ok) throw new Error(data.error ?? "랭킹을 불러오지 못했어.");
      setRankings((current) => append ? [...current, ...(data.rankings ?? [])] : data.rankings ?? []);
      setMyRanking(data.myRanking ?? null);
      setPage(data.page ?? nextPage);
      setHasMore(data.hasMore === true);
      setTotalParticipants(data.totalParticipants ?? 0);
      setWeekRange({ start: data.weekStartDate ?? "", end: data.weekEndDate ?? "" });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "랭킹을 불러오지 못했어.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [scope, signedIn, weekOffset]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadPage(1, false); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPage, reloadKey, optIn]);

  const podium = useMemo(() => {
    const top = rankings.filter((item) => item.rank <= 3);
    return [top.find((item) => item.rank === 2), top.find((item) => item.rank === 1), top.find((item) => item.rank === 3)]
      .filter((item): item is Ranking => Boolean(item));
  }, [rankings]);
  const listRankings = rankings.filter((item) => item.rank >= 4);

  async function changeOptIn() {
    if (!preferredName.trim()) {
      setIsNicknameOpen(true);
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leaderboardOptIn: !optIn }),
      });
      if (!response.ok) throw new Error("랭킹 공개 설정을 저장하지 못했어.");
      onSettingsChange(preferredName, !optIn);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "랭킹 공개 설정을 저장하지 못했어.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!signedIn) return <section className="leaderboard-card"><div className="leaderboard-empty"><span>🏆</span><strong>로그인하면 돌 친구들과 함께 달릴 수 있어</strong><p>랭킹 참여는 선택이며 이메일은 공개되지 않아.</p></div></section>;

  async function saveNickname() {
    const nickname = nicknameDraft.trim().slice(0, 20);
    if (!nickname || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preferredName: nickname, leaderboardOptIn: true }),
      });
      if (!response.ok) throw new Error("닉네임을 저장하지 못했어.");
      onSettingsChange(nickname, true);
      setIsNicknameOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "닉네임을 저장하지 못했어.");
    } finally {
      setIsSaving(false);
    }
  }

  return <><section className="leaderboard-card" aria-labelledby="leaderboard-title">
    <header className="leaderboard-hero">
      <div className="leaderboard-hero-copy"><p className="eyebrow">돌 친구 랭킹</p><h2 id="leaderboard-title">같이 꾸준히 쌓아볼까?</h2><p>참여한 <strong>{totalParticipants.toLocaleString("ko-KR")}명</strong>의 닉네임과 완료 개수만 보여.</p></div>
      <button className={optIn ? "leaderboard-optin active" : "leaderboard-optin"} disabled={isSaving} onClick={changeOptIn}>{isSaving ? "저장 중…" : optIn ? "랭킹 참여 중 ✓" : "랭킹 참여하기"}</button>
      <div className="leaderboard-bear" aria-label="돌곰이의 랭킹 안내">
        <div className="leaderboard-bear-speech">
          <strong>{scope === "weekly" ? "이번 주 랭킹은 이렇게 세어!" : "누적 랭킹은 이렇게 세어!"}</strong>
          <span>{scope === "weekly" ? "한국 시간 월요일 0시부터 일요일 23시 59분까지 완료한 일정 개수로 순위를 매겨." : "지금까지 완료한 일정 개수를 모두 더해서 순위를 매겨."}</span>
        </div>
        <SafeImage src="/bear-encouraging.webp" alt="랭킹 기준을 설명하는 돌곰이" eager />
      </div>
    </header>
    <div className="leaderboard-scopes" aria-label="랭킹 기간">
      <button className={scope === "weekly" ? "active" : ""} onClick={() => setScope("weekly")}>이번 주</button>
      <button className={scope === "total" ? "active" : ""} onClick={() => setScope("total")}>누적</button>
    </div>
    {scope === "weekly" && <section className="leaderboard-period" aria-label="주간 랭킹 집계 기간과 기준">
      <div><button type="button" aria-label="이전 주 보기" disabled={weekOffset <= -12} onClick={() => setWeekOffset((value) => Math.max(-12, value - 1))}>‹</button><strong>{weekRange.start && weekRange.end ? `${formatRankingDate(weekRange.start)} ~ ${formatRankingDate(weekRange.end)}` : "이번 주 날짜 확인 중"}</strong><button type="button" aria-label="다음 주 보기" disabled={weekOffset >= 0} onClick={() => setWeekOffset((value) => Math.min(0, value + 1))}>›</button></div>
      <p><b>{weekOffset === 0 ? "이번 주" : `${Math.abs(weekOffset)}주 전`}</b> · 최근 12주를 주별로 넘겨볼 수 있어.</p>
    </section>}
    {isLoading ? <LeaderboardLoading /> : error && rankings.length === 0 ? <div className="leaderboard-empty" role="alert"><span>·﹏·</span><strong>{error}</strong><button onClick={() => setReloadKey((key) => key + 1)}>다시 불러오기</button></div> : rankings.length ? <>
      {myRanking && <aside className="my-ranking-card" aria-label="내 현재 순위"><span>내 순위</span><strong>{myRanking.rank > 100 ? "100위 밖" : `${myRanking.rank}위`}</strong><p>{myRanking.score}<small>개 완료</small></p></aside>}
      <ol className="leaderboard-podium" aria-label="상위 3명">{podium.map((item) => <li key={`podium-${item.rank}-${item.name}`} className={`rank-${item.rank}${item.isMe ? " me" : ""}`}><span aria-hidden="true">{["🥇", "🥈", "🥉"][item.rank - 1]}</span><strong>{item.name}{item.isMe ? " (나)" : ""}</strong><b>{item.score}<small>개</small></b></li>)}</ol>
      {listRankings.length > 0 && <ol className="leaderboard-list" start={4}>{listRankings.map((item) => <li key={`${item.rank}-${item.name}`} className={item.isMe ? "me" : ""}><b>{item.rank}</b><div><strong>{item.name}{item.isMe ? " (나)" : ""}</strong><small>{scope === "weekly" ? "이번 주 완료" : "누적 완료"}</small></div><span>{item.score}<small>개</small></span></li>)}</ol>}
      {hasMore && <button className="leaderboard-more" disabled={isLoadingMore} onClick={() => { void loadPage(page + 1, true); }}>{isLoadingMore ? <><i aria-hidden="true" /> 다음 순위를 불러오는 중…</> : `다음 순위 보기 · ${Math.min(page * 20, 100)}위까지 확인`}</button>}
      {!hasMore && rankings.length >= 20 && <p className="leaderboard-end">여기까지 상위 {Math.min(rankings.length, 100)}명의 돌 친구야.</p>}
      {error && <p className="leaderboard-inline-error" role="alert">{error} <button onClick={() => { void loadPage(page + 1, true); }}>다시 시도</button></p>}
    </> : <div className="leaderboard-empty"><span>○</span><strong>아직 이 기간의 랭킹이 비어 있어</strong><p>첫 번째 돌 친구가 되어봐!</p></div>}
    <p className="leaderboard-privacy">이메일과 할 일 내용은 공개되지 않으며, 상위 100위까지만 보여.</p>
  </section>
  {isNicknameOpen && <div className="modal-backdrop" role="presentation">
    <section className="modal leaderboard-nickname-modal" role="dialog" aria-modal="true" aria-labelledby="ranking-nickname-title">
      <p className="eyebrow">첫 랭킹 입장</p>
      <h2 id="ranking-nickname-title">어떤 닉네임으로 활동할까?</h2>
      <p>저장하면 랭킹에 참여해. 이메일과 할 일 내용은 누구에게도 보이지 않아.</p>
      <label><span>랭킹 닉네임</span><input autoFocus maxLength={20} value={nicknameDraft} placeholder="예: 꾸준한 돌멩이" disabled={isSaving} onChange={(event) => setNicknameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveNickname(); }} /></label>
      {error && <p className="leaderboard-modal-error" role="alert">{error}</p>}
      <button className="modal-submit" disabled={isSaving || !nicknameDraft.trim()} onClick={saveNickname}>{isSaving ? "닉네임 저장 중…" : "이 닉네임으로 참여하기"}</button>
      <button className="leaderboard-later" disabled={isSaving} onClick={() => setIsNicknameOpen(false)}>나중에 할게</button>
    </section>
  </div>}</>;
}

function LeaderboardLoading() {
  return <div className="leaderboard-loading" role="status" aria-live="polite"><span className="ranking-stone">•ᴗ•</span><strong>돌 순위를 세는 중…</strong><p>필요할 때만 랭킹 데이터를 불러오고 있어</p><div><i /><i /><i /></div></div>;
}

function formatRankingDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return `${year}.${month}.${day}`;
}
