ALTER TABLE sta_request_types ADD COLUMN taxonomy_keys JSONB DEFAULT '[]'::jsonb;

UPDATE sta_request_types SET taxonomy_keys = CASE
  WHEN category_key IS NOT NULL AND category_key != '' THEN to_jsonb(ARRAY[category_key])
  ELSE '[]'::jsonb
END;

ALTER TABLE sta_request_types DROP COLUMN category_key;
