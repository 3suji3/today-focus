/* eslint-disable @next/next/no-html-link-for-pages -- Vinext client navigation currently crashes in the deployed runtime. */
import { redirect } from "next/navigation";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { isAdminEmail } from "../../../lib/admin";
import AdminFeedback from "./admin-feedback";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const user = await requireChatGPTUser("/admin/feedback");
  if (!isAdminEmail(user.email)) redirect("/feedback");
  return <main className="admin-feedback-page"><header><a className="brand" href="/">오늘 뭐하지?<span className="brand-dot" /></a><nav><a href="/feedback">사용자 화면 보기</a><a href="/">일정으로 돌아가기</a></nav></header><AdminFeedback /></main>;
}
