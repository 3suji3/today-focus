export default function FeedbackLoading() {
  return <main className="feedback-page feedback-route-loading" aria-busy="true" aria-label="버그·기능 제안 페이지 여는 중">
    <header><div className="loading-brand" /><div className="loading-back" /></header>
    <div className="feedback-loading-card">
      <div className="feedback-loading-bug">🐞</div>
      <strong>의견함을 열고 있어</strong>
      <span>잠깐만 기다려줘. 신고 내용은 안전하게 불러올게.</span>
      <div className="feedback-loading-dots"><i /><i /><i /></div>
    </div>
  </main>;
}
