CREATE TABLE `admin_users` (
	`id` varchar(100) NOT NULL,
	`email` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`last_login_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_email_key` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `authors` (
	`id` varchar(100) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`role` varchar(191) NOT NULL,
	`credentials` varchar(500) NOT NULL,
	`bio` text NOT NULL,
	`long_bio` json NOT NULL,
	`avatar` varchar(500) NOT NULL,
	`expertise` json NOT NULL,
	`years_experience` int NOT NULL,
	`social` json NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `authors_id` PRIMARY KEY(`id`),
	CONSTRAINT `authors_slug_key` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `benefits` (
	`id` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`icon` varchar(64) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `benefits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_settings` (
	`id` varchar(100) NOT NULL,
	`name` varchar(191) NOT NULL,
	`emoji` varchar(32) NOT NULL,
	`discount_percent` int NOT NULL,
	`headline` varchar(500) NOT NULL,
	`subheadline` text NOT NULL,
	`coupon_code` varchar(64) NOT NULL,
	`timezone_offset` varchar(16) NOT NULL,
	`seats_total` int NOT NULL,
	`seats_remaining` int NOT NULL,
	`deadline` datetime,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `course_categories` (
	`id` varchar(100) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`description` varchar(500) NOT NULL DEFAULT '',
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `course_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `course_categories_slug_key` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` varchar(100) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`title` varchar(255) NOT NULL,
	`short_title` varchar(255) NOT NULL,
	`category` varchar(64) NOT NULL,
	`tagline` varchar(500) NOT NULL,
	`description` text NOT NULL,
	`overview` json NOT NULL,
	`image` varchar(500) NOT NULL,
	`icon` varchar(64) NOT NULL,
	`duration` varchar(64) NOT NULL,
	`duration_weeks` int NOT NULL,
	`hours_per_week` int NOT NULL,
	`level` varchar(64) NOT NULL,
	`original_fee` int NOT NULL,
	`mode` json NOT NULL,
	`language` varchar(64) NOT NULL,
	`skills` json NOT NULL,
	`tools` json NOT NULL,
	`outcomes` json NOT NULL,
	`curriculum` json NOT NULL,
	`careers` json NOT NULL,
	`projects` json NOT NULL,
	`instructor_slug` varchar(191) NOT NULL,
	`rating` double NOT NULL DEFAULT 0,
	`reviews` int NOT NULL DEFAULT 0,
	`enrolled` int NOT NULL DEFAULT 0,
	`featured` boolean NOT NULL DEFAULT false,
	`badge` varchar(64),
	`faqs` json NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `courses_slug_key` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `differentiators` (
	`id` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`proof` varchar(191) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `differentiators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faqs` (
	`id` varchar(100) NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`category` varchar(191) NOT NULL,
	`show_on_homepage` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `faqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gallery_items` (
	`id` varchar(100) NOT NULL,
	`src` varchar(500) NOT NULL,
	`alt` varchar(500) NOT NULL,
	`caption` varchar(500) NOT NULL,
	`category` varchar(64) NOT NULL,
	`width` int NOT NULL,
	`height` int NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `gallery_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` varchar(100) NOT NULL,
	`name` varchar(191) NOT NULL,
	`phone` varchar(64) NOT NULL,
	`email` varchar(191) NOT NULL,
	`course_slug` varchar(191) NOT NULL,
	`course_title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'new',
	`source` varchar(64) NOT NULL DEFAULT 'website-contact-form',
	`campaign` varchar(191),
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` varchar(100) NOT NULL,
	`year` varchar(16) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nav_links` (
	`id` varchar(100) NOT NULL,
	`location` varchar(64) NOT NULL,
	`parent_id` varchar(100),
	`label` varchar(191) NOT NULL,
	`href` varchar(500) NOT NULL,
	`description` varchar(500),
	`cta_label` varchar(191),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `nav_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `newsletter_subscribers` (
	`id` varchar(100) NOT NULL,
	`email` varchar(191) NOT NULL,
	`source` varchar(64) NOT NULL DEFAULT 'website-footer',
	`status` varchar(32) NOT NULL DEFAULT 'subscribed',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `newsletter_subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletter_subscribers_email_key` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` varchar(100) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`date` date NOT NULL,
	`updated` date,
	`author` varchar(191) NOT NULL,
	`category` varchar(191) NOT NULL,
	`tags` json NOT NULL,
	`image` varchar(500) NOT NULL,
	`image_alt` varchar(500) NOT NULL,
	`featured` boolean NOT NULL DEFAULT false,
	`faqs` json NOT NULL,
	`body` longtext NOT NULL,
	`published` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `posts_slug_key` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` varchar(100) NOT NULL,
	`name` varchar(191) NOT NULL,
	`short_name` varchar(191) NOT NULL,
	`legal_name` varchar(191) NOT NULL,
	`tagline` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`founded` varchar(16) NOT NULL,
	`logo` varchar(500) NOT NULL,
	`keywords` json NOT NULL,
	`phone` varchar(64) NOT NULL,
	`phone_href` varchar(64) NOT NULL,
	`whatsapp` varchar(64) NOT NULL,
	`whatsapp_display` varchar(64) NOT NULL,
	`courses_phone` varchar(64) NOT NULL,
	`courses_phone_href` varchar(64) NOT NULL,
	`email` varchar(191) NOT NULL,
	`admissions_email` varchar(191) NOT NULL,
	`address_street` varchar(255) NOT NULL,
	`address_locality` varchar(128) NOT NULL,
	`address_region` varchar(128) NOT NULL,
	`address_postal_code` varchar(32) NOT NULL,
	`address_country` varchar(8) NOT NULL,
	`address_country_name` varchar(128) NOT NULL,
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`map_embed_url` varchar(1000) NOT NULL,
	`office_url` varchar(1000) NOT NULL,
	`opening_hours` json NOT NULL,
	`opening_hours_spec` json NOT NULL,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_links` (
	`id` varchar(100) NOT NULL,
	`name` varchar(64) NOT NULL,
	`href` varchar(500) NOT NULL,
	`icon` varchar(64) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `social_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stats` (
	`id` varchar(100) NOT NULL,
	`value` double NOT NULL,
	`suffix` varchar(16) NOT NULL DEFAULT '',
	`label` varchar(191) NOT NULL,
	`description` varchar(500) NOT NULL,
	`icon` varchar(64) NOT NULL,
	`derived_from` varchar(64),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` varchar(100) NOT NULL,
	`name` varchar(191) NOT NULL,
	`role` varchar(191) NOT NULL,
	`course` varchar(255) NOT NULL,
	`course_slug` varchar(191) NOT NULL,
	`city` varchar(191) NOT NULL,
	`avatar` varchar(500) NOT NULL,
	`rating` tinyint NOT NULL DEFAULT 5,
	`quote` text NOT NULL,
	`story` text,
	`outcome` varchar(255) NOT NULL,
	`featured` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trust_badges` (
	`id` varchar(100) NOT NULL,
	`label` varchar(191) NOT NULL,
	`icon` varchar(64) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `trust_badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `courses_category_idx` ON `courses` (`category`);--> statement-breakpoint
CREATE INDEX `courses_featured_idx` ON `courses` (`featured`);--> statement-breakpoint
CREATE INDEX `courses_sort_order_idx` ON `courses` (`sort_order`);--> statement-breakpoint
CREATE INDEX `faqs_category_idx` ON `faqs` (`category`);--> statement-breakpoint
CREATE INDEX `faqs_homepage_idx` ON `faqs` (`show_on_homepage`);--> statement-breakpoint
CREATE INDEX `gallery_items_category_idx` ON `gallery_items` (`category`);--> statement-breakpoint
CREATE INDEX `leads_created_at_idx` ON `leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE INDEX `leads_course_slug_idx` ON `leads` (`course_slug`);--> statement-breakpoint
CREATE INDEX `leads_email_idx` ON `leads` (`email`);--> statement-breakpoint
CREATE INDEX `nav_links_location_idx` ON `nav_links` (`location`);--> statement-breakpoint
CREATE INDEX `nav_links_parent_idx` ON `nav_links` (`parent_id`);--> statement-breakpoint
CREATE INDEX `posts_date_idx` ON `posts` (`date`);--> statement-breakpoint
CREATE INDEX `posts_author_idx` ON `posts` (`author`);--> statement-breakpoint
CREATE INDEX `posts_category_idx` ON `posts` (`category`);--> statement-breakpoint
CREATE INDEX `posts_published_idx` ON `posts` (`published`);--> statement-breakpoint
CREATE INDEX `testimonials_course_slug_idx` ON `testimonials` (`course_slug`);--> statement-breakpoint
CREATE INDEX `testimonials_featured_idx` ON `testimonials` (`featured`);