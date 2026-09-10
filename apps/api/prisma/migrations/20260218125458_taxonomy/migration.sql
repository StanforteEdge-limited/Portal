DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'unique_taxonomy_term_value'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER INDEX "unique_taxonomy_term_value" RENAME TO "sta_taxonomy_terms_taxonomy_id_value_key"';
  END IF;
END
$$;
