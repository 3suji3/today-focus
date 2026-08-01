import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { shareLinks, stoneRewards, taskCompletions, taskSkips, tasks, userSettings } from "../../../db/schema";

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
  const payload = (await request.json()) as { confirmation?: string };
  if (payload.confirmation !== "RESET_MY_TASKS") return Response.json({ error: "초기화 확인이 필요해요." }, { status: 400 });

  const db = getDb();
  await db.delete(shareLinks).where(eq(shareLinks.ownerEmail, user.email));
  await db.delete(stoneRewards).where(eq(stoneRewards.ownerEmail, user.email));
  await db.delete(taskCompletions).where(eq(taskCompletions.ownerEmail, user.email));
  await db.delete(taskSkips).where(eq(taskSkips.ownerEmail, user.email));
  await db.delete(tasks).where(eq(tasks.ownerEmail, user.email));
  await db.update(userSettings).set({ selectedStoneStage: "auto", updatedAt: Date.now() }).where(eq(userSettings.ownerEmail, user.email));

  return Response.json({ reset: true, samples: 0 });
}
