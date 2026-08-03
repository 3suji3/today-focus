import { redirect } from "next/navigation";
import Link from "next/link";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { isAdminEmail } from "../../../lib/admin";
import AdminFeedback from "./admin-feedback";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const user = await requireChatGPTUser("/admin/feedback");
  if (!isAdminEmail(user.email)) redirect("/feedback");
  return <main className="admin-feedback-page"><header><Link className="brand" href="/">오늘 뭐하지?<span className="brand-dot" /></Link><nav><Link href="/feedback">사용자 화면 보기</Link><Link href="/">일정으로 돌아가기</Link></nav></header><AdminFeedback /></main>;
}
