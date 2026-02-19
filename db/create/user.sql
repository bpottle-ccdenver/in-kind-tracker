CREATE TABLE IF NOT EXISTS "in_kind_tracker".user_account (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(250) NOT NULL UNIQUE,
    name VARCHAR(250),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    profile_image_url TEXT,
    role_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    CHECK (status IN ('pending', 'active', 'inactive')),
    FOREIGN KEY (role_id) REFERENCES "in_kind_tracker".role(role_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_account_status ON "in_kind_tracker".user_account(status);
CREATE INDEX IF NOT EXISTS idx_user_account_role_id ON "in_kind_tracker".user_account(role_id);
