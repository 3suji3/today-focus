CREATE TABLE `share_links` (
	`token` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`task_ids` text NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE INDEX `share_owner_idx` ON `share_links` (`owner_email`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`minutes` integer DEFAULT 20 NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`priority` integer DEFAULT 2 NOT NULL,
	`due_at` integer,
	`done` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tasks_owner_updated_idx` ON `tasks` (`owner_email`,`updated_at`);--> statement-breakpoint
CREATE INDEX `tasks_owner_done_idx` ON `tasks` (`owner_email`,`done`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`owner_email` text PRIMARY KEY NOT NULL,
	`energy` text DEFAULT '보통' NOT NULL,
	`updated_at` integer NOT NULL
);
