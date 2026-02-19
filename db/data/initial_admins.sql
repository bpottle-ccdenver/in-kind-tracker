INSERT INTO "in_kind_tracker".user_account (username, name, status, role_id)
SELECT 'bpottle@ccdenver.org', 'Bill Pottle', 'active', r.role_id
FROM "in_kind_tracker".role r
WHERE r.role_name = 'admin'
ON CONFLICT (username) DO UPDATE
SET name = EXCLUDED.name,
    status = EXCLUDED.status,
    role_id = EXCLUDED.role_id;

INSERT INTO "in_kind_tracker".user_account (username, name, status, role_id)
SELECT 'nleon@ccdenver.org', 'Nancy Leon', 'active', r.role_id
FROM "in_kind_tracker".role r
WHERE r.role_name = 'admin'
ON CONFLICT (username) DO UPDATE
SET name = EXCLUDED.name,
    status = EXCLUDED.status,
    role_id = EXCLUDED.role_id;
