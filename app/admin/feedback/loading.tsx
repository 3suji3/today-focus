export default function AdminFeedbackLoading() {
  return <main className="admin-feedback-page feedback-route-loading" aria-busy="true" aria-label="의견 관리 페이지 여는 중">
    <div className="feedback-loading-card"><div className="feedback-loading-bug">📮</div><strong>접수함을 정리하고 있어</strong><span>사용자 의견과 처리 상태를 불러오는 중이야.</span><div className="feedback-loading-dots"><i /><i /><i /></div></div>
  </main>;
}
