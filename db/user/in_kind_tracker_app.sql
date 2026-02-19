-- Ensure application schema exists
CREATE SCHEMA IF NOT EXISTS "in_kind_tracker";

-- Create role if it does not exist
DO
$$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'in_kind_tracker_app'
  ) THEN
    CREATE ROLE in_kind_tracker_app LOGIN;
    -- Optionally set a password externally if needed
  END IF;
END
$$;

-- Set a default DEV password (never commit real secrets; use only for local dev)
ALTER ROLE in_kind_tracker_app WITH PASSWORD 'password';

-- Set search_path for convenience
ALTER ROLE in_kind_tracker_app SET search_path = in_kind_tracker, public;

-- Grant schema usage (needed to access objects inside the schema)
GRANT USAGE ON SCHEMA "in_kind_tracker" TO in_kind_tracker_app;

-- Grant DML on existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "in_kind_tracker" TO in_kind_tracker_app;

-- Grant sequence usage on existing sequences (for SERIAL/IDENTITY columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "in_kind_tracker" TO in_kind_tracker_app;

-- Ensure future tables/sequences also get permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA "in_kind_tracker" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO in_kind_tracker_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "in_kind_tracker" GRANT USAGE, SELECT ON SEQUENCES TO in_kind_tracker_app;

