CREATE TABLE IF NOT EXISTS "in_kind_tracker".role (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    default_route VARCHAR(100)
);

INSERT INTO "in_kind_tracker".role (role_name, default_route)
VALUES
    ('admin', 'Dashboard'),
    ('front desk', 'RecordDonation')
ON CONFLICT (role_name) DO NOTHING;
