CREATE TABLE "globify_site"."conversation_messages" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"conversation_id" varchar(100) NOT NULL,
	"role" varchar(16) NOT NULL,
	"content" text NOT NULL,
	"language" varchar(16),
	"external_id" varchar(191),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "globify_site"."conversations" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"reference" varchar(64) NOT NULL,
	"channel" varchar(32) NOT NULL,
	"contact_phone" varchar(64),
	"contact_handle" varchar(191),
	"contact_name" varchar(191),
	"language" varchar(16) DEFAULT 'en' NOT NULL,
	"capture" jsonb,
	"handed_off" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "conversation_messages_conversation_idx" ON "globify_site"."conversation_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_messages_external_id_key" ON "globify_site"."conversation_messages" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_reference_key" ON "globify_site"."conversations" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "conversations_channel_phone_idx" ON "globify_site"."conversations" USING btree ("channel","contact_phone");--> statement-breakpoint
CREATE INDEX "conversations_channel_handle_idx" ON "globify_site"."conversations" USING btree ("channel","contact_handle");--> statement-breakpoint
CREATE INDEX "conversations_updated_at_idx" ON "globify_site"."conversations" USING btree ("updated_at");--> statement-breakpoint

-- Re-run the `updated_at` trigger sweep from 0001.
--
-- That migration attaches the trigger by asking the catalogue which tables have
-- an `updated_at` column, rather than from a hand-written list — which is what
-- makes it correct to simply run it again now that `conversations` exists. It
-- drops before it creates, so tables that already have the trigger are
-- unaffected.
--
-- Without this, a conversation edited outside Drizzle keeps a stale
-- `updated_at`, and the admin inbox sorts by exactly that column: an active
-- thread would sink to the bottom of the list.
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
