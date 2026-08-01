CREATE TABLE `task_skips` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`date_key` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `task_skips_owner_date_idx` ON `task_skips` (`owner_email`,`date_key`);--> statement-breakpoint
CREATE INDEX `task_skips_task_date_idx` ON `task_skips` (`task_id`,`date_key`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `scheduled_end_date` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `archived_at` integer;