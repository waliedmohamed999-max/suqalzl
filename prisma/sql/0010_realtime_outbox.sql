-- P1-00 0004_realtime_outbox (SPEC 6.8 "عقد الـ Realtime"): NOTIFY + durable outbox.
-- publish_event() runs INSIDE the business transaction: the row is the outbox (replay via
-- Last-Event-ID) and pg_notify() is transactional (delivered on COMMIT only, dropped on ROLLBACK).
-- The runtime role has NO direct access to realtime_events (RLS on, no policy, no FORCE so the
-- SECURITY DEFINER owner functions can read/write).
SELECT app.secure_table('realtime_events', true, false);
DO $$
DECLARE r name;
BEGIN
  FOR r IN SELECT * FROM app.runtime_roles() LOOP
    EXECUTE format('REVOKE ALL ON "realtime_events" FROM %I', r);
    EXECUTE format('REVOKE ALL ON SEQUENCE "realtime_events_id_seq" FROM %I', r);
  END LOOP;
END $$;
DROP POLICY "realtime_events_staff" ON "realtime_events";

CREATE FUNCTION app.publish_event(p_topic text, p_type text, p_payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_id bigint;
  v_msg text;
BEGIN
  IF p_topic !~ '^(souq|pr:[0-9a-f-]{36}:customer|pr:[0-9a-f-]{36}:vendor:[0-9a-f-]{36}|vendor:[0-9a-f-]{36}:inbox|user:[0-9a-f-]{36})$' THEN
    RAISE EXCEPTION 'invalid realtime topic' USING ERRCODE = '22023';
  END IF;
  IF p_type !~ '^[a-z]+(\.[a-z]+)+$' THEN
    RAISE EXCEPTION 'invalid realtime event type' USING ERRCODE = '22023';
  END IF;
  INSERT INTO realtime_events (topic, type, payload) VALUES (p_topic, p_type, p_payload) RETURNING id INTO v_id;
  v_msg := json_build_object('id', v_id, 'topic', p_topic, 'type', p_type, 'payload', p_payload)::text;
  IF octet_length(v_msg) > 7000 THEN  -- NOTIFY hard limit is 8000 bytes
    RAISE EXCEPTION 'realtime payload too large (ids only, C1)' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_notify('realtime', v_msg);
  RETURN v_id;
END $$;

CREATE FUNCTION app.read_events(p_topics text[], p_after bigint, p_limit int DEFAULT 500)
RETURNS TABLE (id bigint, topic text, type text, payload jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT e.id, e.topic, e.type, e.payload
  FROM realtime_events e
  WHERE e.topic = ANY (p_topics) AND e.id > p_after
  ORDER BY e.id
  LIMIT least(p_limit, 1000)
$$;

-- Retention job (P5-03, every 24 h).
CREATE FUNCTION app.purge_realtime_events(p_older_than interval DEFAULT interval '24 hours')
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE n bigint;
BEGIN
  DELETE FROM realtime_events WHERE created_at < now() - p_older_than;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION app.publish_event(text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.read_events(text[], bigint, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.purge_realtime_events(interval) FROM PUBLIC;
DO $$
DECLARE r name;
BEGIN
  FOR r IN SELECT * FROM app.runtime_roles() LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION app.publish_event(text, text, jsonb) TO %I', r);
    EXECUTE format('GRANT EXECUTE ON FUNCTION app.read_events(text[], bigint, int) TO %I', r);
    EXECUTE format('GRANT EXECUTE ON FUNCTION app.purge_realtime_events(interval) TO %I', r);
  END LOOP;
END $$;
