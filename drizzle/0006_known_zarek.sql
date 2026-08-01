ALTER TABLE `user_settings` ADD `recommendation_strategy` text DEFAULT 'balanced' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `preferred_category` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `selected_stone_stage` text DEFAULT 'auto' NOT NULL;
--> statement-breakpoint
-- Account-specific cleanup and sample task records were removed from the
-- public source export. Runtime data must be managed outside migrations.
