CREATE TABLE IF NOT EXISTS "in_kind_tracker".donation (
    donation_id SERIAL PRIMARY KEY,
    date_received DATE NOT NULL DEFAULT CURRENT_DATE,
    gl_acct VARCHAR(10) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    description TEXT,
    ministry_code VARCHAR(50),
    organization_code VARCHAR(50),
    individual_id INTEGER,
    user_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (ministry_code) REFERENCES "in_kind_tracker".ministry(ministry_code) ON DELETE SET NULL,
    FOREIGN KEY (organization_code) REFERENCES "in_kind_tracker".organization(organization_code) ON DELETE SET NULL,
    FOREIGN KEY (individual_id) REFERENCES "in_kind_tracker".individual(individual_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES "in_kind_tracker".user_account(user_id) ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION "in_kind_tracker".donation_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_donation_updated_at ON "in_kind_tracker".donation;
CREATE TRIGGER trg_donation_updated_at
BEFORE UPDATE ON "in_kind_tracker".donation
FOR EACH ROW
EXECUTE PROCEDURE "in_kind_tracker".donation_set_updated_at();
