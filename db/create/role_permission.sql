CREATE TABLE IF NOT EXISTS "in_kind_tracker".role_permission (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES "in_kind_tracker".role(role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES "in_kind_tracker".permission(permission_id) ON DELETE CASCADE
);

-- Admin gets all permissions
INSERT INTO "in_kind_tracker".role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM "in_kind_tracker".role r
CROSS JOIN "in_kind_tracker".permission p
WHERE r.role_name = 'admin'
ON CONFLICT DO NOTHING;

-- All non-admin roles can view ministries
INSERT INTO "in_kind_tracker".role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM "in_kind_tracker".role r
JOIN "in_kind_tracker".permission p ON p.permission = 'view ministries'
WHERE r.role_name <> 'admin'
ON CONFLICT DO NOTHING;

-- All non-admin roles can view organizations
INSERT INTO "in_kind_tracker".role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM "in_kind_tracker".role r
JOIN "in_kind_tracker".permission p ON p.permission = 'view organization'
WHERE r.role_name <> 'admin'
ON CONFLICT DO NOTHING;

-- All non-admin roles can view individuals
INSERT INTO "in_kind_tracker".role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM "in_kind_tracker".role r
JOIN "in_kind_tracker".permission p ON p.permission = 'view individual'
WHERE r.role_name <> 'admin'
ON CONFLICT DO NOTHING;

-- All non-admin roles can view donations
INSERT INTO "in_kind_tracker".role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM "in_kind_tracker".role r
JOIN "in_kind_tracker".permission p ON p.permission = 'view donation'
WHERE r.role_name <> 'admin'
ON CONFLICT DO NOTHING;

-- All non-admin roles can view wish lists
INSERT INTO "in_kind_tracker".role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM "in_kind_tracker".role r
JOIN "in_kind_tracker".permission p ON p.permission = 'view wish list'
WHERE r.role_name <> 'admin'
ON CONFLICT DO NOTHING;

-- Front desk permissions
INSERT INTO "in_kind_tracker".role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM "in_kind_tracker".role r
JOIN "in_kind_tracker".permission p ON p.permission IN (
    'view locations', 'manage locations'
)
WHERE r.role_name = 'front desk'
ON CONFLICT DO NOTHING;
