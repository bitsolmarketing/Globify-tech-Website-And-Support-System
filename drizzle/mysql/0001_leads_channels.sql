ALTER TABLE `leads` MODIFY COLUMN `name` varchar(191);--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `phone` varchar(64);--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `email` varchar(191);--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `course_slug` varchar(191) NOT NULL DEFAULT 'not-sure';--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `course_title` varchar(255) NOT NULL DEFAULT 'Not sure yet';--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `message` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `channel` varchar(32) DEFAULT 'website' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `handle` varchar(191);--> statement-breakpoint
ALTER TABLE `leads` ADD `external_ref` varchar(191);--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_external_ref_key` UNIQUE(`external_ref`);--> statement-breakpoint
CREATE INDEX `leads_channel_idx` ON `leads` (`channel`);