import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  const runtime = globalThis as typeof globalThis & {
    __TODAY_FOCUS_ENV__?: { DB: D1Database };
  };
  const d1 = runtime.__TODAY_FOCUS_ENV__?.DB;
  if (!d1) {
    throw new Error("Database binding is unavailable for this request.");
  }
  return drizzle(d1, { schema });
}
