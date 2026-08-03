"use client";

import { useCallback, useEffect, useState } from "react";

type Ranking = { rank: number; name: string; score: number; isMe: boolean };

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
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isLoading, setIsLoading] = useState(signedIn);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [isNicknameOpen, setIsNicknameOpen] = useState(signedIn && !preferredName.trim());
  const [nicknameDraft, setNicknameDraft] = useState(preferredName);

  const load = useCallback(async () => {
    if (!signedIn) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/leaderboard?scope=${scope}`, { cache: "no-store" });
      const data = await response.json() as { rankings?: Ranking[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "랭킹을 불러오지 못했어.");
      setRankings(data.rankings ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "랭킹을 불러오지 못했어.");
    } finally {
      setIsLoading(false);
    }
  }, [scope, signedIn]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadKey, optIn]);

  async function changeOptIn() {
    if (!preferredName.trim()) {
      setError("추천 설정에서 곰이 불러줄 이름을 먼저 적어줘.");
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
    <header className="leaderboard-header">
      <div><p className="eyebrow">돌 친구 랭킹</p><h2 id="leaderboard-title">같이 꾸준히 쌓아볼까?</h2><p>참여에 동의한 사용자만 닉네임과 완료 개수가 보여.</p></div>
      <button className={optIn ? "leaderboard-optin active" : "leaderboard-optin"} disabled={isSaving} onClick={changeOptIn}>{isSaving ? "저장 중…" : optIn ? "랭킹 참여 중 ✓" : "랭킹 참여하기"}</button>
    </header>
    <div className="leaderboard-scopes" aria-label="랭킹 기간">
      <button className={scope === "weekly" ? "active" : ""} onClick={() => setScope("weekly")}>이번 주</button>
      <button className={scope === "total" ? "active" : ""} onClick={() => setScope("total")}>누적</button>
    </div>
    {isLoading ? <LeaderboardLoading /> : error ? <div className="leaderboard-empty" role="alert"><span>·﹏·</span><strong>{error}</strong><button onClick={() => setReloadKey((key) => key + 1)}>다시 불러오기</button></div> : rankings.length ? <ol className="leaderboard-list">{rankings.map((item) => <li key={`${item.rank}-${item.name}`} className={item.isMe ? "me" : ""}><b>{item.rank <= 3 ? ["🥇", "🥈", "🥉"][item.rank - 1] : item.rank}</b><div><strong>{item.name}{item.isMe ? " (나)" : ""}</strong><small>{scope === "weekly" ? "이번 주 완료" : "누적 완료"}</small></div><span>{item.score}<small>개</small></span></li>)}</ol> : <div className="leaderboard-empty"><span>○</span><strong>아직 이 기간의 랭킹이 비어 있어</strong><p>첫 번째 돌 친구가 되어봐!</p></div>}
    <p className="leaderboard-privacy">이메일과 할 일 내용은 공개되지 않으며, 언제든 참여를 끌 수 있어.</p>
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
