CREATE TABLE `product_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `product_feedback_owner_created_idx` ON `product_feedback` (`owner_email`,`created_at`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `all_day` integer DEFAULT false NOT NULL;