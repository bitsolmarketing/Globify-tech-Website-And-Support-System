-- Restores `ON UPDATE CURRENT_TIMESTAMP` for Postgres.
--
-- Every table carries `updated_at`, and under MySQL the column definition kept
-- it current no matter who wrote the row. Postgres has no column-level
-- equivalent, and Drizzle's `$onUpdateFn` only covers updates Drizzle itself
-- issues — so without this, a row edited through the Supabase table editor,
-- psql, or any future service keeps its old `updated_at` and silently looks
-- older than it is. `updated_at` is what the admin sorts and audits by, so a
-- stale value is worse than no value.

CREATE OR REPLACE FUNCTION globify_site.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- Attached by lookup rather than by a list of 19 table names: the condition
-- that makes a table need this trigger is literally "it has an updated_at
-- column", so asking the catalogue cannot drift from the schema the way a
-- hand-maintained list would.
--
-- Scoped to `globify_site`. The AI assistant's Prisma tables in `public` have
-- their own `updatedAt` handling and are not this migration's business — an
-- unqualified sweep would attach triggers to another application's tables.
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
