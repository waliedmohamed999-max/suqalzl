-- P1-01d (D36). Hand-written part of 0011.

-- ---------------------------------------------------------------- cron leases (devops review P1-5/P1-6)
SELECT app.secure_table('cron_leases');
ALTER TABLE "cron_leases"
  ADD CONSTRAINT "cron_leases_slug" CHECK ("slug" ~ '^[a-z0-9-]{1,64}$'),
  ADD CONSTRAINT "cron_leases_counters" CHECK ("run_count" >= 0 AND "consecutive_failures" >= 0);

-- ---------------------------------------------------------------- session revocation (QA-B3, QA-B4)
-- Revocation must happen whatever code path changes the user (admin UI in P3, SQL by an operator,
-- a future service): it is enforced by triggers, not by the service only.
--   users:          blocked / deleted          -> revoke sessions + trusted devices (QA-B4)
--                   password changed           -> revoke sessions + trusted devices
--                   role or permissions changed-> revoke sessions (D36-1)
--   vendor_members: deactivated / permissions changed / removed -> revoke that user's sessions on
--                   that vendor
--   sessions:       revoked_at set             -> NOTIFY realtime_ctl {type:"session.revoked", ...}
--                   (delivered after COMMIT; the SSE hub closes every stream of that session, D36-1)
-- The revoking functions are SECURITY DEFINER (owner) because the caller may be a vendor owner
-- managing the team, whose RLS context cannot touch sessions. FORCE RLS applies to the owner too, so
-- the owner gets an explicit policy on the two auth tables; the runtime role can never become owner.

CREATE FUNCTION app.is_table_owner(p_table regclass) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner
     WHERE c.oid = p_table AND r.rolname = current_user)
$$;

CREATE POLICY sessions_owner_functions ON "sessions" FOR ALL
  USING (app.is_table_owner('sessions')) WITH CHECK (app.is_table_owner('sessions'));
CREATE POLICY trusted_devices_owner_functions ON "trusted_devices" FOR ALL
  USING (app.is_table_owner('trusted_devices')) WITH CHECK (app.is_table_owner('trusted_devices'));

CREATE FUNCTION app.revoke_user_access() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  lost_access boolean := (NEW."status" <> 'ACTIVE' AND NEW."status" IS DISTINCT FROM OLD."status")
                      OR (NEW."deleted_at" IS NOT NULL AND OLD."deleted_at" IS NULL);
  new_password boolean := NEW."password_hash" IS DISTINCT FROM OLD."password_hash";
  new_powers boolean := NEW."role" IS DISTINCT FROM OLD."role" OR NEW."permissions" IS DISTINCT FROM OLD."permissions";
BEGIN
  IF lost_access OR new_password OR new_powers THEN
    UPDATE "sessions" SET "revoked_at" = now()
     WHERE "user_id" = NEW."id" AND "revoked_at" IS NULL;
  END IF;
  IF lost_access OR new_password THEN
    UPDATE "trusted_devices" SET "revoked_at" = now()
     WHERE "user_id" = NEW."id" AND "revoked_at" IS NULL;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER "users_revoke_access" AFTER UPDATE OF "status", "deleted_at", "password_hash", "role", "permissions"
  ON "users" FOR EACH ROW EXECUTE FUNCTION app.revoke_user_access();

CREATE FUNCTION app.revoke_member_access() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'DELETE'
     OR (OLD."is_active" AND NOT NEW."is_active")
     OR NEW."permissions" IS DISTINCT FROM OLD."permissions"
     OR NEW."user_id" IS DISTINCT FROM OLD."user_id"
     OR NEW."vendor_id" IS DISTINCT FROM OLD."vendor_id" THEN
    UPDATE "sessions" SET "revoked_at" = now()
     WHERE "user_id" = OLD."user_id" AND "vendor_id" = OLD."vendor_id" AND "revoked_at" IS NULL;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER "vendor_members_revoke_access" AFTER UPDATE OR DELETE ON "vendor_members"
  FOR EACH ROW EXECUTE FUNCTION app.revoke_member_access();

-- ids only, never the token or its hash (D36-1)
CREATE FUNCTION app.notify_session_revoked() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('realtime_ctl',
    json_build_object('type', 'session.revoked', 'sessionId', NEW."id", 'userId', NEW."user_id")::text);
  RETURN NULL;
END $$;
CREATE TRIGGER "sessions_revoked_notify" AFTER UPDATE OF "revoked_at" ON "sessions"
  FOR EACH ROW WHEN (OLD."revoked_at" IS NULL AND NEW."revoked_at" IS NOT NULL)
  EXECUTE FUNCTION app.notify_session_revoked();

REVOKE ALL ON FUNCTION app.revoke_user_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.revoke_member_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.notify_session_revoked() FROM PUBLIC;

-- ---------------------------------------------------------------- realtime resync (devops review / D36-5)
-- A client whose Last-Event-ID is older than the retained outbox (purged after 24 h) cannot be
-- replayed: the stream sends `event: resync` and the client refetches its state. min_id = oldest
-- retained row; head_id = last id handed out by the sequence (rows may be purged, ids never reused).
CREATE FUNCTION app.event_bounds() RETURNS TABLE (min_id bigint, head_id bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT (SELECT min(e.id) FROM realtime_events e),
         (SELECT CASE WHEN s.is_called THEN s.last_value ELSE 0 END FROM realtime_events_id_seq s)
$$;
REVOKE ALL ON FUNCTION app.event_bounds() FROM PUBLIC;
DO $$
DECLARE r name;
BEGIN
  FOR r IN SELECT * FROM app.runtime_roles() LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION app.event_bounds() TO %I', r);
  END LOOP;
END $$;
