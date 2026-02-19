CREATE TABLE IF NOT EXISTS "in_kind_tracker".permission (
    permission_id SERIAL PRIMARY KEY,
    permission VARCHAR(150) NOT NULL UNIQUE
);

INSERT INTO "in_kind_tracker".permission (permission)
VALUES
    ('view locations'),
    ('manage locations'),
    ('view permissions'),
    ('manage permissions'),
    ('view roles'),
    ('manage roles'),
    ('view users'),
    ('manage users'),
    ('view ministries'),
    ('manage ministries'),
    ('view organization'),
    ('manage organization'),
    ('view individual'),
    ('manage individual'),
    ('view donation'),
    ('manage donation'),
    ('view wish list'),
    ('manage wish list')
ON CONFLICT (permission) DO NOTHING;
