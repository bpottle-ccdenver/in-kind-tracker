CREATE TABLE IF NOT EXISTS "in_kind_tracker".wish_list (
    wishlist_id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    ministry_code VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Open Request',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT wish_list_ministry_fk FOREIGN KEY (ministry_code)
      REFERENCES "in_kind_tracker".ministry(ministry_code) ON DELETE RESTRICT,
    CONSTRAINT wish_list_type_valid CHECK (
      type IN ('Capital Item Over 10K', 'In-kind Item', 'Volunteer Needs', 'Monetary Donation', 'Monitary Donation')
    ),
    CONSTRAINT wish_list_status_valid CHECK (status IN ('Open Request', 'In Progress', 'Fulfilled'))
);

CREATE OR REPLACE FUNCTION "in_kind_tracker".wish_list_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wish_list_updated_at ON "in_kind_tracker".wish_list;
CREATE TRIGGER trg_wish_list_updated_at
BEFORE UPDATE ON "in_kind_tracker".wish_list
FOR EACH ROW
EXECUTE PROCEDURE "in_kind_tracker".wish_list_set_updated_at();

