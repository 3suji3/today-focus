import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    title: text("title").notNull(),
    category: text("category", { enum: ["취업", "공부", "프로젝트", "일상", "기타"] }).notNull(),
    minutes: integer("minutes").notNull().default(20),
    allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
    reason: text("reason").notNull().default(""),
    priority: integer("priority").notNull().default(2),
    dueAt: integer("due_at"),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    completedAt: integer("completed_at"),
    recurrence: text("recurrence", { enum: ["once", "daily"] }).notNull().default("once"),
    scheduledDate: text("scheduled_date"),
    scheduledEndDate: text("scheduled_end_date"),
    archivedAt: integer("archived_at"),
    version: integer("version").notNull().default(1),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("tasks_owner_updated_idx").on(table.ownerEmail, table.updatedAt),
    index("tasks_owner_done_idx").on(table.ownerEmail, table.done),
    index("tasks_owner_schedule_idx").on(table.ownerEmail, table.archivedAt, table.scheduledDate),
  ],
);

export const taskSkips = sqliteTable(
  "task_skips",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull(),
    ownerEmail: text("owner_email").notNull(),
    dateKey: text("date_key").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("task_skips_owner_date_idx").on(table.ownerEmail, table.dateKey),
    index("task_skips_task_date_idx").on(table.taskId, table.dateKey),
  ],
);

export const taskCompletions = sqliteTable(
  "task_completions",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull(),
    ownerEmail: text("owner_email").notNull(),
    dateKey: text("date_key").notNull(),
    completedAt: integer("completed_at").notNull(),
    stoneVariant: integer("stone_variant").notNull(),
  },
  (table) => [
    index("completions_owner_date_idx").on(table.ownerEmail, table.dateKey),
    index("completions_task_date_idx").on(table.taskId, table.dateKey),
  ],
);

export const userSettings = sqliteTable("user_settings", {
  ownerEmail: text("owner_email").primaryKey(),
  energy: text("energy", { enum: ["낮음", "보통", "높음"] }).notNull().default("보통"),
  bearPersonality: text("bear_personality", { enum: ["warm", "cool", "driven", "lively"] }).notNull().default("warm"),
  recommendationMode: text("recommendation_mode", { enum: ["auto", "custom"] }).notNull().default("auto"),
  availableMinutes: integer("available_minutes").notNull().default(90),
  customTaskCount: integer("custom_task_count").notNull().default(3),
  recommendationStrategy: text("recommendation_strategy", { enum: ["balanced", "quick", "focus"] }).notNull().default("balanced"),
  preferredCategory: text("preferred_category", { enum: ["취업", "공부", "프로젝트", "일상", "기타"] }),
  selectedStoneStage: text("selected_stone_stage", { enum: ["auto", "first", "friends", "pile", "picnic", "basket", "greenhouse", "cart", "cafe", "garden", "village", "sparklePile", "bigBasket", "carriage", "starGarden", "moonIsland", "cloudLibrary", "candyFountain", "auroraStation", "whaleTheater", "galaxyBridge", "gemCamp", "constellationPark", "goldenPalace", "stoneKingdom"] }).notNull().default("auto"),
  preferredName: text("preferred_name"),
  leaderboardOptIn: integer("leaderboard_opt_in", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at").notNull(),
});

export const shareLinks = sqliteTable(
  "share_links",
  {
    token: text("token").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    taskIds: text("task_ids").notNull(),
    shareType: text("share_type", { enum: ["tasks", "stones"] }).notNull().default("tasks"),
    stoneCount: integer("stone_count").notNull().default(0),
    weeklyStoneCount: integer("weekly_stone_count").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    revokedAt: integer("revoked_at"),
  },
  (table) => [index("share_owner_idx").on(table.ownerEmail)],
);

export const categoryFeedback = sqliteTable(
  "category_feedback",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    category: text("category", { enum: ["취업", "공부", "프로젝트", "일상", "기타"] }).notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("feedback_owner_created_idx").on(table.ownerEmail, table.createdAt),
    index("feedback_owner_title_idx").on(table.ownerEmail, table.normalizedTitle),
  ],
);

export const productFeedback = sqliteTable(
  "product_feedback",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    kind: text("kind", { enum: ["bug", "feature"] }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: text("status", { enum: ["received", "reviewing", "planned", "done", "declined"] }).notNull().default("received"),
    adminReply: text("admin_reply"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull().default(0),
  },
  (table) => [index("product_feedback_owner_created_idx").on(table.ownerEmail, table.createdAt)],
);

export const stoneRewards = sqliteTable(
  "stone_rewards",
  {
    taskId: text("task_id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    variant: integer("variant").notNull(),
    earnedAt: integer("earned_at").notNull(),
  },
  (table) => [
    index("stones_owner_earned_idx").on(table.ownerEmail, table.earnedAt),
  ],
);
