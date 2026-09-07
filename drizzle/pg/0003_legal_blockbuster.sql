CREATE TABLE "globify_site"."enrollments" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"student_id" varchar(100) NOT NULL,
	"course_slug" varchar(191) NOT NULL,
	"course_title" varchar(255) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"source" varchar(16) DEFAULT 'course' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"activated_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."payments" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"reference" varchar(64) NOT NULL,
	"student_id" varchar(100) NOT NULL,
	"purpose" varchar(16) NOT NULL,
	"enrollment_id" varchar(100),
	"subscription_id" varchar(100),
	"amount" integer NOT NULL,
	"method" varchar(32) NOT NULL,
	"sender_reference" varchar(191),
	"sender_name" varchar(191),
	"proof_path" varchar(500),
	"status" varchar(32) DEFAULT 'submitted' NOT NULL,
	"note" text,
	"review_note" text,
	"reviewed_by" varchar(191),
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."plans" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"slug" varchar(191) NOT NULL,
	"name" varchar(191) NOT NULL,
	"tagline" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"compare_at_price" integer,
	"interval" varchar(16) NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"badge" varchar(64),
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."students" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"email" varchar(191) NOT NULL,
	"name" varchar(191) NOT NULL,
	"phone" varchar(64),
	"password_hash" varchar(255) NOT NULL,
	"city" varchar(120),
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."subscriptions" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"student_id" varchar(100) NOT NULL,
	"plan_id" varchar(100) NOT NULL,
	"plan_slug" varchar(191) NOT NULL,
	"plan_name" varchar(191) NOT NULL,
	"interval" varchar(16) NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_student_course_key" ON "globify_site"."enrollments" USING btree ("student_id","course_slug");--> statement-breakpoint
CREATE INDEX "enrollments_student_idx" ON "globify_site"."enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollments_status_idx" ON "globify_site"."enrollments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "enrollments_course_idx" ON "globify_site"."enrollments" USING btree ("course_slug");--> statement-breakpoint
CREATE INDEX "enrollments_created_at_idx" ON "globify_site"."enrollments" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_reference_key" ON "globify_site"."payments" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "payments_student_idx" ON "globify_site"."payments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "globify_site"."payments" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "payments_enrollment_idx" ON "globify_site"."payments" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "payments_subscription_idx" ON "globify_site"."payments" USING btree ("subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_slug_key" ON "globify_site"."plans" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "plans_active_idx" ON "globify_site"."plans" USING btree ("active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "students_email_key" ON "globify_site"."students" USING btree ("email");--> statement-breakpoint
CREATE INDEX "students_created_at_idx" ON "globify_site"."students" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "students_status_idx" ON "globify_site"."students" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_student_idx" ON "globify_site"."subscriptions" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "subscriptions_expires_at_idx" ON "globify_site"."subscriptions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "subscriptions_created_at_idx" ON "globify_site"."subscriptions" USING btree ("created_at");--> statement-breakpoint

-- Re-attach the `updated_at` trigger, now that five more tables have the
-- column. Same catalogue sweep as 0001_updated_at_triggers.sql, repeated
-- rather than extended with a list of new names: the condition is still
-- "the table has an updated_at column", so re-running the lookup cannot drift
-- from the schema the way a hand-maintained list would. `DROP TRIGGER IF
-- EXISTS` before each create keeps it idempotent over the tables 0001 already
-- covered.
DO $$
DECLARE
  target text;
BEGIN
  FOR target IN
    SELECT c.table_name
    FROM information_schema.columns AS c
    JOIN information_schema.tables AS t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'globify_site'
      AND c.column_name = 'updated_at'
      AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON globify_site.%I', target);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON globify_site.%I '
      'FOR EACH ROW EXECUTE FUNCTION globify_site.set_updated_at()',
      target
    );
  END LOOP;
END;
$$;
