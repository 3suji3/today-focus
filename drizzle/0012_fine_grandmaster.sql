ALTER TABLE `product_feedback` ADD `admin_reply` text;--> statement-breakpoint
ALTER TABLE `product_feedback` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `product_feedback` SET `updated_at` = `created_at` WHERE `updated_at` = 0;
