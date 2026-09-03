-- =============================================================================
--  0003 — WhatsApp broadcasts (and the portal tables that had not been migrated)
-- =============================================================================
--
--  `broadcasts`, `broadcast_recipients` and `whatsapp_opt_outs` are what this
--  migration was generated for. Everything else in it — `portal_users`,
--  `batches`, `enrollments`, `assignments`, `submissions`, `quizzes`,
--  `attendance`, `materials`, `certificates`, `announcements`, `class_sessions`,
--  `module_progress`, `quiz_attempts` — was already declared in `schema.ts`
--  with no migration behind it, so drizzle-kit correctly diffed it in as
--  missing. Splitting them back out is not possible without desynchronising the
--  snapshot chain, and leaving them out would be worse: the snapshot would
--  claim they exist and no later `generate` would ever emit them again.
--
--  EVERY statement is therefore `IF NOT EXISTS`, which the generator does not
--  emit on its own. That is what makes this safe to run against a database
--  where the portal tables were already created with `drizzle-kit push`: those
--  become no-ops, and only the three broadcast tables are actually created.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "globify_site"."announcements" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"batch_id" varchar(100),
	"author_id" varchar(100) NOT NULL,
	"author_name" varchar(191) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."assignments" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"batch_id" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"brief" text NOT NULL,
	"attachment_url" varchar(500),
	"due_at" timestamp with time zone NOT NULL,
	"max_score" integer DEFAULT 100 NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"allow_late" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone,
	"created_by_id" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."attendance" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"batch_id" varchar(100) NOT NULL,
	"student_id" varchar(100) NOT NULL,
	"status" varchar(16) NOT NULL,
	"note" varchar(500),
	"marked_by_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."batches" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"course_id" varchar(100) NOT NULL,
	"course_slug" varchar(191) NOT NULL,
	"course_title" varchar(255) NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(191) NOT NULL,
	"instructor_id" varchar(100) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"schedule" varchar(255),
	"mode" varchar(64) DEFAULT 'On-campus' NOT NULL,
	"capacity" integer DEFAULT 0 NOT NULL,
	"meeting_url" varchar(500),
	"status" varchar(16) DEFAULT 'upcoming' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."broadcast_recipients" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"broadcast_id" varchar(100) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"name" varchar(191),
	"course_title" varchar(255),
	"lead_id" varchar(100),
	"status" varchar(16) DEFAULT 'queued' NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"message_id" varchar(191),
	"delivery_status" varchar(16),
	"error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."broadcasts" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"kind" varchar(16) DEFAULT 'template' NOT NULL,
	"template_name" varchar(191),
	"template_language" varchar(16) DEFAULT 'en_US',
	"template_variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"header_image_url" varchar(500),
	"header_parameter" varchar(500),
	"body" text,
	"audience" jsonb,
	"scheduled_for" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_error" text,
	"created_by" varchar(191),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."certificates" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"enrollment_id" varchar(100) NOT NULL,
	"student_id" varchar(100) NOT NULL,
	"batch_id" varchar(100) NOT NULL,
	"serial" varchar(64) NOT NULL,
	"student_name" varchar(191) NOT NULL,
	"course_title" varchar(255) NOT NULL,
	"final_score" integer,
	"grade" varchar(16),
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"issued_by_id" varchar(100) NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."class_sessions" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"batch_id" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"topic" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 120 NOT NULL,
	"meeting_url" varchar(500),
	"recording_url" varchar(500),
	"status" varchar(16) DEFAULT 'scheduled' NOT NULL,
	"attendance_marked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."enrollments" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"batch_id" varchar(100) NOT NULL,
	"student_id" varchar(100) NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"lead_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."materials" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"batch_id" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(16) DEFAULT 'link' NOT NULL,
	"url" varchar(500),
	"body" text,
	"module_index" smallint,
	"uploaded_by_id" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."module_progress" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"enrollment_id" varchar(100) NOT NULL,
	"module_index" smallint NOT NULL,
	"module_title" varchar(255) NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."portal_users" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"email" varchar(191) NOT NULL,
	"name" varchar(191) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(16) NOT NULL,
	"phone" varchar(64),
	"avatar_url" varchar(500),
	"headline" varchar(255),
	"bio" text,
	"author_slug" varchar(191),
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."quiz_attempts" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"quiz_id" varchar(100) NOT NULL,
	"batch_id" varchar(100) NOT NULL,
	"student_id" varchar(100) NOT NULL,
	"attempt_number" smallint DEFAULT 1 NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"max_score" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."quizzes" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"batch_id" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"questions" jsonb NOT NULL,
	"time_limit_minutes" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"pass_score" integer DEFAULT 60 NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"due_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_by_id" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."submissions" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"assignment_id" varchar(100) NOT NULL,
	"batch_id" varchar(100) NOT NULL,
	"student_id" varchar(100) NOT NULL,
	"url" varchar(500),
	"notes" text,
	"status" varchar(16) DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"late" boolean DEFAULT false NOT NULL,
	"score" integer,
	"feedback" text,
	"graded_by_id" varchar(100),
	"graded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "globify_site"."whatsapp_opt_outs" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"phone" varchar(32) NOT NULL,
	"reason" varchar(191),
	"source" varchar(32) DEFAULT 'inbound-stop' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_batch_idx" ON "globify_site"."announcements" USING btree ("batch_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_author_idx" ON "globify_site"."announcements" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_batch_idx" ON "globify_site"."assignments" USING btree ("batch_id","due_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_published_idx" ON "globify_site"."assignments" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_session_student_key" ON "globify_site"."attendance" USING btree ("session_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_student_idx" ON "globify_site"."attendance" USING btree ("student_id","batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_batch_idx" ON "globify_site"."attendance" USING btree ("batch_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "batches_code_key" ON "globify_site"."batches" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_instructor_idx" ON "globify_site"."batches" USING btree ("instructor_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_course_idx" ON "globify_site"."batches" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_status_idx" ON "globify_site"."batches" USING btree ("status","start_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "broadcast_recipients_broadcast_phone_key" ON "globify_site"."broadcast_recipients" USING btree ("broadcast_id","phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcast_recipients_broadcast_status_idx" ON "globify_site"."broadcast_recipients" USING btree ("broadcast_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcast_recipients_message_id_idx" ON "globify_site"."broadcast_recipients" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcasts_status_idx" ON "globify_site"."broadcasts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcasts_created_at_idx" ON "globify_site"."broadcasts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcasts_scheduled_for_idx" ON "globify_site"."broadcasts" USING btree ("scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_serial_key" ON "globify_site"."certificates" USING btree ("serial");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_enrollment_key" ON "globify_site"."certificates" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificates_student_idx" ON "globify_site"."certificates" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "class_sessions_batch_idx" ON "globify_site"."class_sessions" USING btree ("batch_id","scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "class_sessions_scheduled_idx" ON "globify_site"."class_sessions" USING btree ("scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "enrollments_batch_student_key" ON "globify_site"."enrollments" USING btree ("batch_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_student_idx" ON "globify_site"."enrollments" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_batch_idx" ON "globify_site"."enrollments" USING btree ("batch_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "materials_batch_idx" ON "globify_site"."materials" USING btree ("batch_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "module_progress_enrollment_module_key" ON "globify_site"."module_progress" USING btree ("enrollment_id","module_index");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portal_users_email_key" ON "globify_site"."portal_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_users_role_idx" ON "globify_site"."portal_users" USING btree ("role","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_users_author_slug_idx" ON "globify_site"."portal_users" USING btree ("author_slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "quiz_attempts_quiz_student_attempt_key" ON "globify_site"."quiz_attempts" USING btree ("quiz_id","student_id","attempt_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_attempts_student_idx" ON "globify_site"."quiz_attempts" USING btree ("student_id","batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quizzes_batch_idx" ON "globify_site"."quizzes" USING btree ("batch_id","due_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quizzes_published_idx" ON "globify_site"."quizzes" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "submissions_assignment_student_key" ON "globify_site"."submissions" USING btree ("assignment_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_student_idx" ON "globify_site"."submissions" USING btree ("student_id","batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_status_idx" ON "globify_site"."submissions" USING btree ("batch_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_opt_outs_phone_key" ON "globify_site"."whatsapp_opt_outs" USING btree ("phone");
--> statement-breakpoint

-- Re-run the `updated_at` trigger sweep from 0001, for the same reason 0002 did.
--
-- That migration attaches the trigger by asking the catalogue which tables have
-- an `updated_at` column rather than from a hand-written list, which is what
-- makes it correct to simply run it again now that new tables exist. It drops
-- before it creates, so tables that already carry the trigger are unaffected.
--
-- It matters here specifically: the broadcast detail screen polls progress and
-- the list sorts by recency, and both read `updated_at`. A recipient row
-- flipped to `sent` by anything other than Drizzle — a psql session, a Supabase
-- table-editor fix — would otherwise keep a stale timestamp and the send would
-- look stalled while it was in fact running.
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
