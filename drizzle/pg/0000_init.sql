CREATE SCHEMA "globify_site";
--> statement-breakpoint
CREATE TABLE "globify_site"."admin_users" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"email" varchar(191) NOT NULL,
	"name" varchar(191) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."authors" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"slug" varchar(191) NOT NULL,
	"name" varchar(191) NOT NULL,
	"role" varchar(191) NOT NULL,
	"credentials" varchar(500) NOT NULL,
	"bio" text NOT NULL,
	"long_bio" jsonb NOT NULL,
	"avatar" varchar(500) NOT NULL,
	"expertise" jsonb NOT NULL,
	"years_experience" integer NOT NULL,
	"social" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."benefits" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"icon" varchar(64) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."campaign_settings" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(191) NOT NULL,
	"emoji" varchar(32) NOT NULL,
	"discount_percent" integer NOT NULL,
	"headline" varchar(500) NOT NULL,
	"subheadline" text NOT NULL,
	"coupon_code" varchar(64) NOT NULL,
	"timezone_offset" varchar(16) NOT NULL,
	"seats_total" integer NOT NULL,
	"seats_remaining" integer NOT NULL,
	"deadline" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."course_categories" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"slug" varchar(191) NOT NULL,
	"name" varchar(191) NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."courses" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"slug" varchar(191) NOT NULL,
	"title" varchar(255) NOT NULL,
	"short_title" varchar(255) NOT NULL,
	"category" varchar(64) NOT NULL,
	"tagline" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"overview" jsonb NOT NULL,
	"image" varchar(500) NOT NULL,
	"icon" varchar(64) NOT NULL,
	"duration" varchar(64) NOT NULL,
	"duration_weeks" integer NOT NULL,
	"hours_per_week" integer NOT NULL,
	"level" varchar(64) NOT NULL,
	"original_fee" integer NOT NULL,
	"mode" jsonb NOT NULL,
	"language" varchar(64) NOT NULL,
	"skills" jsonb NOT NULL,
	"tools" jsonb NOT NULL,
	"outcomes" jsonb NOT NULL,
	"curriculum" jsonb NOT NULL,
	"careers" jsonb NOT NULL,
	"projects" jsonb NOT NULL,
	"instructor_slug" varchar(191) NOT NULL,
	"rating" double precision DEFAULT 0 NOT NULL,
	"reviews" integer DEFAULT 0 NOT NULL,
	"enrolled" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"badge" varchar(64),
	"faqs" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."differentiators" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"proof" varchar(191) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."faqs" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" varchar(191) NOT NULL,
	"show_on_homepage" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."gallery_items" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"src" varchar(500) NOT NULL,
	"alt" varchar(500) NOT NULL,
	"caption" varchar(500) NOT NULL,
	"category" varchar(64) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."leads" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(191),
	"phone" varchar(64),
	"email" varchar(191),
	"course_slug" varchar(191) DEFAULT 'not-sure' NOT NULL,
	"course_title" varchar(255) DEFAULT 'Not sure yet' NOT NULL,
	"message" text,
	"status" varchar(32) DEFAULT 'new' NOT NULL,
	"channel" varchar(32) DEFAULT 'website' NOT NULL,
	"source" varchar(64) DEFAULT 'website-contact-form' NOT NULL,
	"handle" varchar(191),
	"external_ref" varchar(191),
	"campaign" varchar(191),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."milestones" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"year" varchar(16) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."nav_links" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"location" varchar(64) NOT NULL,
	"parent_id" varchar(100),
	"label" varchar(191) NOT NULL,
	"href" varchar(500) NOT NULL,
	"description" varchar(500),
	"cta_label" varchar(191),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."newsletter_subscribers" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"email" varchar(191) NOT NULL,
	"source" varchar(64) DEFAULT 'website-footer' NOT NULL,
	"status" varchar(32) DEFAULT 'subscribed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."posts" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"slug" varchar(191) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"date" date NOT NULL,
	"updated" date,
	"author" varchar(191) NOT NULL,
	"category" varchar(191) NOT NULL,
	"tags" jsonb NOT NULL,
	"image" varchar(500) NOT NULL,
	"image_alt" varchar(500) NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"faqs" jsonb NOT NULL,
	"body" text NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."site_settings" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(191) NOT NULL,
	"short_name" varchar(191) NOT NULL,
	"legal_name" varchar(191) NOT NULL,
	"tagline" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"founded" varchar(16) NOT NULL,
	"logo" varchar(500) NOT NULL,
	"keywords" jsonb NOT NULL,
	"phone" varchar(64) NOT NULL,
	"phone_href" varchar(64) NOT NULL,
	"whatsapp" varchar(64) NOT NULL,
	"whatsapp_display" varchar(64) NOT NULL,
	"courses_phone" varchar(64) NOT NULL,
	"courses_phone_href" varchar(64) NOT NULL,
	"email" varchar(191) NOT NULL,
	"admissions_email" varchar(191) NOT NULL,
	"address_street" varchar(255) NOT NULL,
	"address_locality" varchar(128) NOT NULL,
	"address_region" varchar(128) NOT NULL,
	"address_postal_code" varchar(32) NOT NULL,
	"address_country" varchar(8) NOT NULL,
	"address_country_name" varchar(128) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"map_embed_url" varchar(1000) NOT NULL,
	"office_url" varchar(1000) NOT NULL,
	"opening_hours" jsonb NOT NULL,
	"opening_hours_spec" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."social_links" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"href" varchar(500) NOT NULL,
	"icon" varchar(64) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."stats" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"value" double precision NOT NULL,
	"suffix" varchar(16) DEFAULT '' NOT NULL,
	"label" varchar(191) NOT NULL,
	"description" varchar(500) NOT NULL,
	"icon" varchar(64) NOT NULL,
	"derived_from" varchar(64),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."testimonials" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(191) NOT NULL,
	"role" varchar(191) NOT NULL,
	"course" varchar(255) NOT NULL,
	"course_slug" varchar(191) NOT NULL,
	"city" varchar(191) NOT NULL,
	"avatar" varchar(500) NOT NULL,
	"rating" smallint DEFAULT 5 NOT NULL,
	"quote" text NOT NULL,
	"story" text,
	"outcome" varchar(255) NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."trust_badges" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"label" varchar(191) NOT NULL,
	"icon" varchar(64) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_key" ON "globify_site"."admin_users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "authors_slug_key" ON "globify_site"."authors" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "course_categories_slug_key" ON "globify_site"."course_categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_slug_key" ON "globify_site"."courses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "courses_category_idx" ON "globify_site"."courses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "courses_featured_idx" ON "globify_site"."courses" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "courses_sort_order_idx" ON "globify_site"."courses" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "faqs_category_idx" ON "globify_site"."faqs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "faqs_homepage_idx" ON "globify_site"."faqs" USING btree ("show_on_homepage");--> statement-breakpoint
CREATE INDEX "gallery_items_category_idx" ON "globify_site"."gallery_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "globify_site"."leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "globify_site"."leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_course_slug_idx" ON "globify_site"."leads" USING btree ("course_slug");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "globify_site"."leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_channel_idx" ON "globify_site"."leads" USING btree ("channel");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_external_ref_key" ON "globify_site"."leads" USING btree ("external_ref");--> statement-breakpoint
CREATE INDEX "nav_links_location_idx" ON "globify_site"."nav_links" USING btree ("location");--> statement-breakpoint
CREATE INDEX "nav_links_parent_idx" ON "globify_site"."nav_links" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "globify_site"."newsletter_subscribers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_key" ON "globify_site"."posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "posts_date_idx" ON "globify_site"."posts" USING btree ("date");--> statement-breakpoint
CREATE INDEX "posts_author_idx" ON "globify_site"."posts" USING btree ("author");--> statement-breakpoint
CREATE INDEX "posts_category_idx" ON "globify_site"."posts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "posts_published_idx" ON "globify_site"."posts" USING btree ("published");--> statement-breakpoint
CREATE INDEX "testimonials_course_slug_idx" ON "globify_site"."testimonials" USING btree ("course_slug");--> statement-breakpoint
CREATE INDEX "testimonials_featured_idx" ON "globify_site"."testimonials" USING btree ("featured");