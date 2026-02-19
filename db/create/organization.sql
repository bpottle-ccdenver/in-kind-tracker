CREATE TABLE IF NOT EXISTS "in_kind_tracker".organization (
    organization_code VARCHAR(50) PRIMARY KEY,
    organization_name VARCHAR(255) NOT NULL,
    contact_first_name VARCHAR(100),
    contact_last_name VARCHAR(100),
    address VARCHAR(255),
    city VARCHAR(120),
    state VARCHAR(50),
    zip VARCHAR(5),
    contact_email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT organization_zip_digits CHECK (zip IS NULL OR zip ~ '^[0-9]{5}$')
);

CREATE OR REPLACE FUNCTION "in_kind_tracker".organization_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organization_updated_at ON "in_kind_tracker".organization;
CREATE TRIGGER trg_organization_updated_at
BEFORE UPDATE ON "in_kind_tracker".organization
FOR EACH ROW
EXECUTE PROCEDURE "in_kind_tracker".organization_set_updated_at();
