CREATE TABLE `category_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`title` text NOT NULL,
	`normalized_title` text NOT NULL,
	`category` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `feedback_owner_created_idx` ON `category_feedback` (`owner_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `feedback_owner_title_idx` ON `category_feedback` (`owner_email`,`normalized_title`);--> statement-breakpoint
CREATE TABLE `stone_rewards` (
	`task_id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`variant` integer NOT NULL,
	`earned_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `stones_owner_earned_idx` ON `stone_rewards` (`owner_email`,`earned_at`);