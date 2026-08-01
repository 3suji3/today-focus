import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { productFeedback } from "../../../../db/schema";
import { isAdminEmail } from "../../../../lib/admin";

const allowedStatuses = new Set(["received", "reviewing", "planned", "done", "declined"]);

async function requireAdmin() {
  const user = await getChatGPTUser();
  return user && isAdminEmail(user.email) ? user : null;
}

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: "관리자만 볼 수 있어요." }, { status: 403 });
  const items = await getDb().select().from(productFeedback).orderBy(desc(productFeedback.updatedAt)).limit(200);
  return Response.json({ items });
}

export async function PATCH(request: Request) {
  if (!await requireAdmin()) return Response.json({ error: "관리자만 변경할 수 있어요." }, { status: 403 });
  const payload = await request.json() as { id?: string; status?: string; adminReply?: string };
  if (!payload.id || !allowedStatuses.has(payload.status ?? "")) return Response.json({ error: "상태를 확인해줘." }, { status: 400 });
  const [item] = await getDb().update(productFeedback).set({
    status: payload.status as "received" | "reviewing" | "planned" | "done" | "declined",
    adminReply: payload.adminReply?.trim().slice(0, 2000) || null,
    updatedAt: Date.now(),
  }).where(eq(productFeedback.id, payload.id)).returning();
  if (!item) return Response.json({ error: "접수 내역을 찾지 못했어요." }, { status: 404 });
  return Response.json({ item });
}
