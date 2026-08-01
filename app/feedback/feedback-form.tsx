"use client";

import { useEffect, useState } from "react";

type FeedbackStatus = "received" | "reviewing" | "planned" | "done" | "declined";
type Feedback = { id: string; kind: "bug" | "feature"; title: string; description: string; status: FeedbackStatus; adminReply: string | null; createdAt: number; updatedAt: number };
const statusCopy: Record<FeedbackStatus, { label: string; message: string }> = {
  received: { label: "접수됨", message: "의견을 안전하게 받았어. 아직 확인 전이야." },
  reviewing: { label: "확인 중", message: "같은 문제가 재현되는지와 필요한 범위를 확인하고 있어." },
  planned: { label: "수정 예정", message: "내용을 확인했고 다음 수정 작업에 반영할 예정이야." },
  done: { label: "반영 완료", message: "수정 또는 기능 반영을 완료했어. 다시 확인해줘!" },
  declined: { label: "반영하지 않음", message: "현재 서비스 방향이나 기술적인 이유로 이번에는 반영하지 않기로 했어." },
};

export default function FeedbackForm({ signedIn }: { signedIn: boolean }) {
  const [kind, setKind] = useState<"bug" | "feature">("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<Feedback[]>([]);
  const [historyLoading, setHistoryLoading] = useState(signedIn);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    void fetch("/api/feedback", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : { items: [] })
      .then((data) => setItems(data.items ?? []))
      .finally(() => setHistoryLoading(false));
    return () => controller.abort();
  }, [signedIn]);

  async function submit() {
    if (sending || title.trim().length < 2 || description.trim().length < 5) return;
    setSending(true);
    try {
      const response = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, title, description }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems((current) => [data.item, ...current]);
      setTitle(""); setDescription(""); setNotice("잘 받았어. 확인할 수 있도록 안전하게 저장했어!");
    } catch { setNotice("보내지 못했어. 잠시 후 다시 시도해줘."); }
    finally { setSending(false); }
  }

  if (!signedIn) return <div className="feedback-login"><span>🔐</span><h2>로그인하고 의견을 남겨줘</h2><p>신고 상태와 이전에 보낸 내용을 다시 확인할 수 있어.</p><a href="/signin-with-chatgpt?return_to=/feedback">로그인하기</a></div>;
  return <div className="feedback-layout">
    <section className="feedback-card">
      <p className="eyebrow">같이 다듬는 오늘 뭐하지</p><h1>불편한 점이나 아이디어를 알려줘</h1><p>버그는 어떤 행동 뒤에 생겼는지, 기능 제안은 어떤 순간에 필요한지 적어주면 더 빨리 이해할 수 있어.</p>
      <div className="feedback-kind"><button className={kind === "bug" ? "active" : ""} onClick={() => setKind("bug")}><b>🐞</b><span><strong>버그 신고</strong><small>오류·느림·화면 깨짐</small></span></button><button className={kind === "feature" ? "active" : ""} onClick={() => setKind("feature")}><b>✨</b><span><strong>기능 제안</strong><small>새 기능·사용성 개선</small></span></button></div>
      <label><span>한 줄 제목</span><input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "bug" ? "예: 일정 저장 후 캘린더에 바로 안 보여요" : "예: 일정에 알림 시간을 설정하고 싶어요"} /></label>
      <label><span>자세한 내용</span><textarea value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} placeholder={kind === "bug" ? "어떤 화면에서 무엇을 눌렀고, 실제로 어떻게 되었는지 적어줘." : "언제 필요했고, 어떻게 작동하면 좋을지 적어줘."} /></label>
      <button className="feedback-submit" disabled={sending || title.trim().length < 2 || description.trim().length < 5} onClick={submit}>{sending ? "안전하게 보내는 중…" : "의견 보내기"}</button>{notice && <p className="feedback-notice" role="status">{notice}</p>}
    </section>
    <aside className="feedback-history"><h2>내가 보낸 의견</h2>{historyLoading ? <div className="feedback-history-loading" role="status" aria-label="보낸 의견 불러오는 중"><span /><span /><span /><p>보낸 의견을 불러오는 중이야</p></div> : items.length ? <ul>{items.map((item) => <li key={item.id}><span className={`feedback-status ${item.status}`}>{statusCopy[item.status].label}</span><small>{item.kind === "bug" ? "버그" : "기능"}</small><strong>{item.title}</strong><p>{item.adminReply || statusCopy[item.status].message}</p><time>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(item.updatedAt || item.createdAt)}</time></li>)}</ul> : <p className="feedback-empty">아직 보낸 의견이 없어.<br />첫 의견을 남겨줘!</p>}</aside>
  </div>;
}
