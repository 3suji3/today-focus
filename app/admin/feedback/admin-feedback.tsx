"use client";

import { useEffect, useMemo, useState } from "react";

type Status = "received" | "reviewing" | "planned" | "done" | "declined";
type Feedback = { id: string; ownerEmail: string; kind: "bug" | "feature"; title: string; description: string; status: Status; adminReply: string | null; createdAt: number; updatedAt: number };
const statusOptions: Array<{ value: Status; label: string }> = [
  { value: "received", label: "접수됨" }, { value: "reviewing", label: "확인 중" }, { value: "planned", label: "수정 예정" }, { value: "done", label: "반영 완료" }, { value: "declined", label: "반영하지 않음" },
];

export default function AdminFeedback() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [draft, setDraft] = useState({ status: "received" as Status, adminReply: "" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const filtered = useMemo(() => filter === "all" ? items : items.filter((item) => item.status === filter), [filter, items]);

  useEffect(() => {
    void fetch("/api/admin/feedback", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const nextItems = (data.items ?? []) as Feedback[];
        setItems(nextItems);
        if (nextItems[0]) {
          setSelectedId(nextItems[0].id);
          setDraft({ status: nextItems[0].status, adminReply: nextItems[0].adminReply ?? "" });
        }
      });
  }, []);

  function selectFeedback(item: Feedback) {
    setSelectedId(item.id);
    setDraft({ status: item.status, adminReply: item.adminReply ?? "" });
    setNotice("");
  }

  async function save() {
    if (!selected || saving) return;
    setSaving(true); setNotice("");
    try {
      const response = await fetch("/api/admin/feedback", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: selected.id, ...draft }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems((current) => current.map((item) => item.id === data.item.id ? data.item : item));
      setNotice("사용자에게 보이는 처리 상태와 답변을 저장했어.");
    } catch { setNotice("저장하지 못했어. 잠시 후 다시 시도해줘."); }
    finally { setSaving(false); }
  }

  return <div className="admin-feedback-layout">
    <aside className="admin-feedback-list">
      <div className="admin-feedback-list-head"><div><p className="eyebrow">운영자 전용</p><h1>의견 관리</h1></div><b>{items.length}</b></div>
      <div className="admin-feedback-filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>전체</button>{statusOptions.map((option) => <button className={filter === option.value ? "active" : ""} key={option.value} onClick={() => setFilter(option.value)}>{option.label}</button>)}</div>
      <ul>{filtered.map((item) => <li key={item.id}><button className={selectedId === item.id ? "active" : ""} onClick={() => selectFeedback(item)}><span><i className={`feedback-status ${item.status}`}>{statusOptions.find((option) => option.value === item.status)?.label}</i><small>{item.kind === "bug" ? "버그" : "기능"}</small></span><strong>{item.title}</strong><em>{item.ownerEmail}</em></button></li>)}</ul>
    </aside>
    <section className="admin-feedback-detail">
      {selected ? <>
        <header><div><span>{selected.kind === "bug" ? "🐞 버그 신고" : "✨ 기능 제안"}</span><h2>{selected.title}</h2></div><time>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Seoul" }).format(selected.createdAt)}</time></header>
        <div className="admin-feedback-user"><span>보낸 사용자</span><strong>{selected.ownerEmail}</strong></div>
        <article><h3>접수 내용</h3><p>{selected.description}</p></article>
        <div className="admin-feedback-status-field"><span>처리 상태</span><div>{statusOptions.map((option) => <button className={draft.status === option.value ? `active ${option.value}` : ""} key={option.value} onClick={() => setDraft((current) => ({ ...current, status: option.value }))}>{option.label}</button>)}</div></div>
        <label><span>사용자에게 보낼 답변</span><textarea value={draft.adminReply} maxLength={2000} onChange={(event) => setDraft((current) => ({ ...current, adminReply: event.target.value }))} placeholder="상태만 변경해도 기본 안내가 보여. 추가로 설명할 내용이 있을 때 적어줘." /><small>{draft.adminReply.length}/2000</small></label>
        <button className="admin-feedback-save" disabled={saving} onClick={save}>{saving ? "저장 중…" : "상태와 답변 저장"}</button>{notice && <p className="admin-feedback-notice" role="status">{notice}</p>}
      </> : <div className="admin-feedback-empty"><span>📮</span><h2>선택한 의견이 없어</h2><p>왼쪽 목록에서 확인할 신고나 제안을 골라줘.</p></div>}
    </section>
  </div>;
}
