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
CREATE TABLE `announcements` (
	`id` varchar(100) NOT NULL,
	`batch_id` varchar(100),
	`author_id` varchar(100) NOT NULL,
	`author_name` varchar(191) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`pinned` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` varchar(100) NOT NULL,
	`batch_id` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`brief` text NOT NULL,
	`attachment_url` varchar(500),
	`due_at` datetime NOT NULL,
	`max_score` int NOT NULL DEFAULT 100,
	`weight` int NOT NULL DEFAULT 1,
	`allow_late` boolean NOT NULL DEFAULT true,
	`published_at` datetime,
	`created_by_id` varchar(100) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` varchar(100) NOT NULL,
	`session_id` varchar(100) NOT NULL,
	`batch_id` varchar(100) NOT NULL,
	`student_id` varchar(100) NOT NULL,
	`status` varchar(16) NOT NULL,
	`note` varchar(500),
	`marked_by_id` varchar(100),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_session_student_key` UNIQUE(`session_id`,`student_id`)
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
CREATE TABLE `batches` (
	`id` varchar(100) NOT NULL,
	`course_id` varchar(100) NOT NULL,
	`course_slug` varchar(191) NOT NULL,
	`course_title` varchar(255) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(191) NOT NULL,
	`instructor_id` varchar(100) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date,
	`schedule` varchar(255),
	`mode` varchar(64) NOT NULL DEFAULT 'On-campus',
	`capacity` int NOT NULL DEFAULT 0,
	`meeting_url` varchar(500),
	`status` varchar(16) NOT NULL DEFAULT 'upcoming',
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `batches_code_key` UNIQUE(`code`)
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
CREATE TABLE `broadcast_recipients` (
	`id` varchar(100) NOT NULL,
	`broadcast_id` varchar(100) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`name` varchar(191),
	`course_title` varchar(255),
	`lead_id` varchar(100),
	`status` varchar(16) NOT NULL DEFAULT 'queued',
	`attempts` smallint NOT NULL DEFAULT 0,
	`message_id` varchar(191),
	`delivery_status` varchar(16),
	`error` text,
	`sent_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `broadcast_recipients_id` PRIMARY KEY(`id`),
	CONSTRAINT `broadcast_recipients_broadcast_phone_key` UNIQUE(`broadcast_id`,`phone`)
);
--> statement-breakpoint
CREATE TABLE `broadcasts` (
	`id` varchar(100) NOT NULL,
	`name` varchar(160) NOT NULL,
	`status` varchar(24) NOT NULL DEFAULT 'draft',
	`kind` varchar(16) NOT NULL DEFAULT 'template',
	`template_name` varchar(191),
	`template_language` varchar(16) DEFAULT 'en_US',
	`template_variables` json NOT NULL DEFAULT ('[]'),
	`header_image_url` varchar(500),
	`header_parameter` varchar(500),
	`body` text,
	`audience` json,
	`scheduled_for` datetime,
	`started_at` datetime,
	`completed_at` datetime,
	`last_error` text,
	`created_by` varchar(191),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `broadcasts_id` PRIMARY KEY(`id`)
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
CREATE TABLE `certificates` (
	`id` varchar(100) NOT NULL,
	`enrollment_id` varchar(100) NOT NULL,
	`student_id` varchar(100) NOT NULL,
	`batch_id` varchar(100) NOT NULL,
	`serial` varchar(64) NOT NULL,
	`student_name` varchar(191) NOT NULL,
	`course_title` varchar(255) NOT NULL,
	`final_score` int,
	`grade` varchar(16),
	`issued_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`issued_by_id` varchar(100) NOT NULL,
	`revoked_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificates_serial_key` UNIQUE(`serial`),
	CONSTRAINT `certificates_enrollment_key` UNIQUE(`enrollment_id`)
);
--> statement-breakpoint
CREATE TABLE `class_sessions` (
	`id` varchar(100) NOT NULL,
	`batch_id` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`topic` text,
	`scheduled_at` datetime NOT NULL,
	`duration_minutes` int NOT NULL DEFAULT 120,
	`meeting_url` varchar(500),
	`recording_url` varchar(500),
	`status` varchar(16) NOT NULL DEFAULT 'scheduled',
	`attendance_marked_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `class_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_messages` (
	`id` varchar(100) NOT NULL,
	`conversation_id` varchar(100) NOT NULL,
	`role` varchar(16) NOT NULL,
	`content` text NOT NULL,
	`language` varchar(16),
	`external_id` varchar(191),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `conversation_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversation_messages_external_id_key` UNIQUE(`external_id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` varchar(100) NOT NULL,
	`reference` varchar(64) NOT NULL,
	`channel` varchar(32) NOT NULL,
	`contact_phone` varchar(64),
	`contact_handle` varchar(191),
	`contact_name` varchar(191),
	`language` varchar(16) NOT NULL DEFAULT 'en',
	`capture` json,
	`handed_off` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversations_reference_key` UNIQUE(`reference`)
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
CREATE TABLE `enrollments` (
	`id` varchar(100) NOT NULL,
	`batch_id` varchar(100) NOT NULL,
	`student_id` varchar(100) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`enrolled_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`completed_at` datetime,
	`lead_id` varchar(100),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `enrollments_batch_student_key` UNIQUE(`batch_id`,`student_id`)
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
	`name` varchar(191),
	`phone` varchar(64),
	`email` varchar(191),
	`course_slug` varchar(191) NOT NULL DEFAULT 'not-sure',
	`course_title` varchar(255) NOT NULL DEFAULT 'Not sure yet',
	`message` text,
	`status` varchar(32) NOT NULL DEFAULT 'new',
	`channel` varchar(32) NOT NULL DEFAULT 'website',
	`source` varchar(64) NOT NULL DEFAULT 'website-contact-form',
	`handle` varchar(191),
	`external_ref` varchar(191),
	`campaign` varchar(191),
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`),
	CONSTRAINT `leads_external_ref_key` UNIQUE(`external_ref`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` varchar(100) NOT NULL,
	`batch_id` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`type` varchar(16) NOT NULL DEFAULT 'link',
	`url` varchar(500),
	`body` text,
	`module_index` smallint,
	`uploaded_by_id` varchar(100) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`)
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
CREATE TABLE `module_progress` (
	`id` varchar(100) NOT NULL,
	`enrollment_id` varchar(100) NOT NULL,
	`module_index` smallint NOT NULL,
	`module_title` varchar(255) NOT NULL,
	`completed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `module_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `module_progress_enrollment_module_key` UNIQUE(`enrollment_id`,`module_index`)
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
CREATE TABLE `portal_users` (
	`id` varchar(100) NOT NULL,
	`email` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` varchar(16) NOT NULL,
	`phone` varchar(64),
	`avatar_url` varchar(500),
	`headline` varchar(255),
	`bio` text,
	`author_slug` varchar(191),
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`must_change_password` boolean NOT NULL DEFAULT false,
	`last_login_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `portal_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `portal_users_email_key` UNIQUE(`email`)
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
	`body` text NOT NULL,
	`published` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `posts_slug_key` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` varchar(100) NOT NULL,
	`quiz_id` varchar(100) NOT NULL,
	`batch_id` varchar(100) NOT NULL,
	`student_id` varchar(100) NOT NULL,
	`attempt_number` smallint NOT NULL DEFAULT 1,
	`answers` json NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`max_score` int NOT NULL DEFAULT 0,
	`started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`submitted_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `quiz_attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `quiz_attempts_quiz_student_attempt_key` UNIQUE(`quiz_id`,`student_id`,`attempt_number`)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` varchar(100) NOT NULL,
	`batch_id` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`questions` json NOT NULL,
	`time_limit_minutes` int NOT NULL DEFAULT 0,
	`max_attempts` int NOT NULL DEFAULT 1,
	`pass_score` int NOT NULL DEFAULT 60,
	`weight` int NOT NULL DEFAULT 1,
	`due_at` datetime,
	`published_at` datetime,
	`created_by_id` varchar(100) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `quizzes_id` PRIMARY KEY(`id`)
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
CREATE TABLE `submissions` (
	`id` varchar(100) NOT NULL,
	`assignment_id` varchar(100) NOT NULL,
	`batch_id` varchar(100) NOT NULL,
	`student_id` varchar(100) NOT NULL,
	`url` varchar(500),
	`notes` text,
	`status` varchar(16) NOT NULL DEFAULT 'submitted',
	`submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`late` boolean NOT NULL DEFAULT false,
	`score` int,
	`feedback` text,
	`graded_by_id` varchar(100),
	`graded_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `submissions_assignment_student_key` UNIQUE(`assignment_id`,`student_id`)
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
	`rating` smallint NOT NULL DEFAULT 5,
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
CREATE TABLE `whatsapp_opt_outs` (
	`id` varchar(100) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`reason` varchar(191),
	`source` varchar(32) NOT NULL DEFAULT 'inbound-stop',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_opt_outs_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsapp_opt_outs_phone_key` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE INDEX `announcements_batch_idx` ON `announcements` (`batch_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `announcements_author_idx` ON `announcements` (`author_id`);--> statement-breakpoint
CREATE INDEX `assignments_batch_idx` ON `assignments` (`batch_id`,`due_at`);--> statement-breakpoint
CREATE INDEX `assignments_published_idx` ON `assignments` (`published_at`);--> statement-breakpoint
CREATE INDEX `attendance_student_idx` ON `attendance` (`student_id`,`batch_id`);--> statement-breakpoint
CREATE INDEX `attendance_batch_idx` ON `attendance` (`batch_id`,`status`);--> statement-breakpoint
CREATE INDEX `batches_instructor_idx` ON `batches` (`instructor_id`,`status`);--> statement-breakpoint
CREATE INDEX `batches_course_idx` ON `batches` (`course_id`);--> statement-breakpoint
CREATE INDEX `batches_status_idx` ON `batches` (`status`,`start_date`);--> statement-breakpoint
CREATE INDEX `broadcast_recipients_broadcast_status_idx` ON `broadcast_recipients` (`broadcast_id`,`status`);--> statement-breakpoint
CREATE INDEX `broadcast_recipients_message_id_idx` ON `broadcast_recipients` (`message_id`);--> statement-breakpoint
CREATE INDEX `broadcasts_status_idx` ON `broadcasts` (`status`);--> statement-breakpoint
CREATE INDEX `broadcasts_created_at_idx` ON `broadcasts` (`created_at`);--> statement-breakpoint
CREATE INDEX `broadcasts_scheduled_for_idx` ON `broadcasts` (`scheduled_for`);--> statement-breakpoint
CREATE INDEX `certificates_student_idx` ON `certificates` (`student_id`);--> statement-breakpoint
CREATE INDEX `class_sessions_batch_idx` ON `class_sessions` (`batch_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `class_sessions_scheduled_idx` ON `class_sessions` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `conversation_messages_conversation_idx` ON `conversation_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `conversations_channel_phone_idx` ON `conversations` (`channel`,`contact_phone`);--> statement-breakpoint
CREATE INDEX `conversations_channel_handle_idx` ON `conversations` (`channel`,`contact_handle`);--> statement-breakpoint
CREATE INDEX `conversations_updated_at_idx` ON `conversations` (`updated_at`);--> statement-breakpoint
CREATE INDEX `courses_category_idx` ON `courses` (`category`);--> statement-breakpoint
CREATE INDEX `courses_featured_idx` ON `courses` (`featured`);--> statement-breakpoint
CREATE INDEX `courses_sort_order_idx` ON `courses` (`sort_order`);--> statement-breakpoint
CREATE INDEX `enrollments_student_idx` ON `enrollments` (`student_id`,`status`);--> statement-breakpoint
CREATE INDEX `enrollments_batch_idx` ON `enrollments` (`batch_id`,`status`);--> statement-breakpoint
CREATE INDEX `faqs_category_idx` ON `faqs` (`category`);--> statement-breakpoint
CREATE INDEX `faqs_homepage_idx` ON `faqs` (`show_on_homepage`);--> statement-breakpoint
CREATE INDEX `gallery_items_category_idx` ON `gallery_items` (`category`);--> statement-breakpoint
CREATE INDEX `leads_created_at_idx` ON `leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE INDEX `leads_course_slug_idx` ON `leads` (`course_slug`);--> statement-breakpoint
CREATE INDEX `leads_email_idx` ON `leads` (`email`);--> statement-breakpoint
CREATE INDEX `leads_channel_idx` ON `leads` (`channel`);--> statement-breakpoint
CREATE INDEX `materials_batch_idx` ON `materials` (`batch_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `nav_links_location_idx` ON `nav_links` (`location`);--> statement-breakpoint
CREATE INDEX `nav_links_parent_idx` ON `nav_links` (`parent_id`);--> statement-breakpoint
CREATE INDEX `portal_users_role_idx` ON `portal_users` (`role`,`status`);--> statement-breakpoint
CREATE INDEX `portal_users_author_slug_idx` ON `portal_users` (`author_slug`);--> statement-breakpoint
CREATE INDEX `posts_date_idx` ON `posts` (`date`);--> statement-breakpoint
CREATE INDEX `posts_author_idx` ON `posts` (`author`);--> statement-breakpoint
CREATE INDEX `posts_category_idx` ON `posts` (`category`);--> statement-breakpoint
CREATE INDEX `posts_published_idx` ON `posts` (`published`);--> statement-breakpoint
CREATE INDEX `quiz_attempts_student_idx` ON `quiz_attempts` (`student_id`,`batch_id`);--> statement-breakpoint
CREATE INDEX `quizzes_batch_idx` ON `quizzes` (`batch_id`,`due_at`);--> statement-breakpoint
CREATE INDEX `quizzes_published_idx` ON `quizzes` (`published_at`);--> statement-breakpoint
CREATE INDEX `submissions_student_idx` ON `submissions` (`student_id`,`batch_id`);--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`batch_id`,`status`);--> statement-breakpoint
CREATE INDEX `testimonials_course_slug_idx` ON `testimonials` (`course_slug`);--> statement-breakpoint
CREATE INDEX `testimonials_featured_idx` ON `testimonials` (`featured`);