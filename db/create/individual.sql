CREATE TABLE IF NOT EXISTS "in_kind_tracker".individual (
    individual_id SERIAL PRIMARY KEY,
    individual_first_name VARCHAR(100) NOT NULL,
    individual_last_name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    city VARCHAR(120),
    state VARCHAR(50),
    zip VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION "in_kind_tracker".individual_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_individual_updated_at ON "in_kind_tracker".individual;
CREATE TRIGGER trg_individual_updated_at
BEFORE UPDATE ON "in_kind_tracker".individual
FOR EACH ROW
EXECUTE PROCEDURE "in_kind_tracker".individual_set_updated_at();
