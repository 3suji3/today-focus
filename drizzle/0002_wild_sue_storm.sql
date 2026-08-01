ALTER TABLE `user_settings` ADD `recommendation_mode` text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `available_minutes` integer DEFAULT 90 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `custom_task_count` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `preferred_name` text;