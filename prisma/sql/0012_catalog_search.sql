-- M1-02 / P2-01: Arabic-normalised catalogue search (SPEC 7.1: أ إ آ ← ا، ة ← ه، ى ← ي، no tashkeel).
-- One normaliser used for BOTH the stored vector and the query, so they can never disagree.

-- lower-case, Arabic-Indic digits -> Latin, alef forms -> ا, ة -> ه, ى -> ي, tatweel removed,
-- tashkeel (U+064B..U+065F, U+0670) removed, anything that is not a letter/digit -> space,
-- the definite article "ال" dropped at the start of words of 4+ letters ("البشت" = "بشت").
CREATE FUNCTION app.normalize_ar(p text) RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT btrim(regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 translate(lower(coalesce(p, '')), 'أإآٱةى٠١٢٣٤٥٦٧٨٩ـ', 'ااااهي0123456789'),
                 '[ً-ٰٟ]', '', 'g'),
               '[^0-9a-zء-ي]+', ' ', 'g'),
             '(^| )ال([^ ]{2})', '\1\2', 'g'),
           ' +', ' ', 'g'))
$$;

-- prefix query: every normalised token must match the start of a word ("بش" finds "بشت").
-- NULL when nothing searchable is left (the service returns no results).
CREATE FUNCTION app.search_query(p text) RETURNS tsquery LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE WHEN app.normalize_ar(p) = '' THEN NULL
    ELSE to_tsquery('simple', array_to_string(
      ARRAY(SELECT t || ':*' FROM unnest(string_to_array(app.normalize_ar(p), ' ')) AS t WHERE t <> '' LIMIT 8),
      ' & '))
  END
$$;

CREATE FUNCTION app.products_search_vector() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."search_vector" :=
       setweight(to_tsvector('simple', app.normalize_ar(NEW."name_ar")), 'A')
    || setweight(to_tsvector('simple', app.normalize_ar(NEW."name_en")), 'A')
    || setweight(to_tsvector('simple', app.normalize_ar(left(coalesce(NEW."description_ar", ''), 4000))), 'C')
    || setweight(to_tsvector('simple', app.normalize_ar(left(coalesce(NEW."description_en", ''), 4000))), 'C');
  RETURN NEW;
END $$;
CREATE TRIGGER "products_search_vector" BEFORE INSERT OR UPDATE OF "name_ar", "name_en", "description_ar", "description_en"
  ON "products" FOR EACH ROW EXECUTE FUNCTION app.products_search_vector();

-- backfill rows that already exist (the trigger fires on the touched columns; staff context for guards)
DO $$
BEGIN
  PERFORM set_config('app.role', 'system', true);
  UPDATE "products" SET "name_ar" = "name_ar";
END $$;
