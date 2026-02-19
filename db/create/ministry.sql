CREATE TABLE IF NOT EXISTS "in_kind_tracker".ministry (
    ministry_code VARCHAR(50) PRIMARY KEY,
    ministry_name VARCHAR(255) NOT NULL UNIQUE,
    has_scale BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION "in_kind_tracker".ministry_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ministry_updated_at ON "in_kind_tracker".ministry;
CREATE TRIGGER trg_ministry_updated_at
BEFORE UPDATE ON "in_kind_tracker".ministry
FOR EACH ROW
EXECUTE PROCEDURE "in_kind_tracker".ministry_set_updated_at();
