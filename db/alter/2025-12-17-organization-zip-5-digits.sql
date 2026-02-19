-- Normalize organization.zip to 5-digit numeric ZIP codes.
-- If existing rows contain non-5-digit values, they are set to NULL to avoid migration failure.

ALTER TABLE in_kind_tracker.organization
  ALTER COLUMN zip TYPE VARCHAR(5)
  USING NULLIF(BTRIM(zip), '');

UPDATE in_kind_tracker.organization
SET zip = NULL
WHERE zip IS NOT NULL
  AND zip !~ '^[0-9]{5}$';

ALTER TABLE in_kind_tracker.organization
  DROP CONSTRAINT IF EXISTS organization_zip_digits;

ALTER TABLE in_kind_tracker.organization
  ADD CONSTRAINT organization_zip_digits CHECK (zip IS NULL OR zip ~ '^[0-9]{5}$');

