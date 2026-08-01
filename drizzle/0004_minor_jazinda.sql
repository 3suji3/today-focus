CREATE TABLE `task_completions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`date_key` text NOT NULL,
	`completed_at` integer NOT NULL,
	`stone_variant` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `completions_owner_date_idx` ON `task_completions` (`owner_email`,`date_key`);--> statement-breakpoint
CREATE INDEX `completions_task_date_idx` ON `task_completions` (`task_id`,`date_key`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `recurrence` text DEFAULT 'once' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `scheduled_date` text;
--> statement-breakpoint
UPDATE `tasks`
SET `scheduled_date` = strftime('%Y-%m-%d', (`created_at` / 1000) + (9 * 60 * 60), 'unixepoch')
WHERE `scheduled_date` IS NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `task_completions` (`id`, `task_id`, `owner_email`, `date_key`, `completed_at`, `stone_variant`)
SELECT
	`id` || ':' || strftime('%Y-%m-%d', (`completed_at` / 1000) + (9 * 60 * 60), 'unixepoch'),
	`id`,
	`owner_email`,
	strftime('%Y-%m-%d', (`completed_at` / 1000) + (9 * 60 * 60), 'unixepoch'),
	`completed_at`,
	0
FROM `tasks`
WHERE `done` = 1 AND `completed_at` IS NOT NULL;
