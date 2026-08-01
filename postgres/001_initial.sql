-- Prepared for a future managed PostgreSQL cutover.
-- Keep all database access server-side; never expose DATABASE_URL to the browser.

CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  owner_email text NOT NULL,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('취업', '공부', '프로젝트', '일상', '기타')),
  minutes integer NOT NULL DEFAULT 20 CHECK (minutes BETWEEN 5 AND 240),
  reason text NOT NULL DEFAULT '',
  priority integer NOT NULL DEFAULT 2,
  due_at bigint,
  done boolean NOT NULL DEFAULT false,
  completed_at bigint,
  version integer NOT NULL DEFAULT 1,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_owner_updated_idx ON tasks (owner_email, updated_at DESC);
CREATE INDEX IF NOT EXISTS tasks_owner_done_idx ON tasks (owner_email, done);

CREATE TABLE IF NOT EXISTS user_settings (
  owner_email text PRIMARY KEY,
  energy text NOT NULL DEFAULT '보통' CHECK (energy IN ('낮음', '보통', '높음')),
  recommendation_mode text NOT NULL DEFAULT 'auto' CHECK (recommendation_mode IN ('auto', 'custom')),
  available_minutes integer NOT NULL DEFAULT 90 CHECK (available_minutes BETWEEN 15 AND 480),
  custom_task_count integer NOT NULL DEFAULT 3 CHECK (custom_task_count BETWEEN 1 AND 5),
  preferred_name text,
  updated_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS category_feedback (
  id text PRIMARY KEY,
  owner_email text NOT NULL,
  title text NOT NULL,
  normalized_title text NOT NULL,
  category text NOT NULL CHECK (category IN ('취업', '공부', '프로젝트', '일상', '기타')),
  created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS feedback_owner_created_idx ON category_feedback (owner_email, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_owner_title_idx ON category_feedback (owner_email, normalized_title);

CREATE TABLE IF NOT EXISTS stone_rewards (
  task_id text PRIMARY KEY,
  owner_email text NOT NULL,
  variant integer NOT NULL CHECK (variant BETWEEN 0 AND 6),
  earned_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS stones_owner_earned_idx ON stone_rewards (owner_email, earned_at DESC);

CREATE TABLE IF NOT EXISTS share_links (
  token text PRIMARY KEY,
  owner_email text NOT NULL,
  task_ids text NOT NULL,
  created_at bigint NOT NULL,
  revoked_at bigint
);
CREATE INDEX IF NOT EXISTS share_owner_idx ON share_links (owner_email);
