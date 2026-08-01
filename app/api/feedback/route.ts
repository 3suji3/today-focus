import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { productFeedback } from "../../../db/schema";
import { checkWriteRateLimit } from "../../../lib/rate-limit";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
  const items = await getDb().select().from(productFeedback).where(eq(productFeedback.ownerEmail, user.email)).orderBy(desc(productFeedback.createdAt)).limit(20);
  return Response.json({ items });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
  const limit = checkWriteRateLimit(`feedback:${user.email}`);
  if (!limit.allowed) return Response.json({ error: "잠시 후 다시 보내줘." }, { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } });
  const payload = await request.json() as { kind?: string; title?: string; description?: string };
  const kind = payload.kind === "feature" ? "feature" as const : "bug" as const;
  const title = payload.title?.trim().slice(0, 100) ?? "";
  const description = payload.description?.trim().slice(0, 2000) ?? "";
  if (title.length < 2 || description.length < 5) return Response.json({ error: "제목과 내용을 조금 더 적어줘." }, { status: 400 });
  const now = Date.now();
  const [item] = await getDb().insert(productFeedback).values({ id: crypto.randomUUID(), ownerEmail: user.email, kind, title, description, status: "received", adminReply: null, createdAt: now, updatedAt: now }).returning();
  return Response.json({ item }, { status: 201 });
}
