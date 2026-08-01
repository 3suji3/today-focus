ALTER TABLE `share_links` ADD `share_type` text DEFAULT 'tasks' NOT NULL;--> statement-breakpoint
ALTER TABLE `share_links` ADD `stone_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `share_links` ADD `weekly_stone_count` integer DEFAULT 0 NOT NULL;