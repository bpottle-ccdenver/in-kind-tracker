CREATE TABLE IF NOT EXISTS "in_kind_tracker".user_session (
    session_id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES "in_kind_tracker".user_account(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_session_user_id ON "in_kind_tracker".user_session(user_id);
