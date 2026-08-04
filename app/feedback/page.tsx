/* eslint-disable @next/next/no-html-link-for-pages -- Vinext client navigation currently crashes in the deployed runtime. */
import { getChatGPTUser } from "../chatgpt-auth";
import FeedbackForm from "./feedback-form";
import { isAdminEmail } from "../../lib/admin";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const user = await getChatGPTUser();
  return <main className="feedback-page"><header><a className="brand" href="/">오늘 뭐하지?<span className="brand-dot" /></a><nav>{isAdminEmail(user?.email) && <a className="feedback-admin-link" href="/admin/feedback">의견 관리</a>}<a className="feedback-back" href="/">← 일정으로 돌아가기</a></nav></header><FeedbackForm signedIn={Boolean(user)} /></main>;
}
