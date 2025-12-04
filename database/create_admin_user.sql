-- Script to create admin user if it doesn't exist
-- Run this after ensuring Super Admin role exists

-- First, ensure Super Admin role exists
INSERT INTO roles (id, name, description)
SELECT uuid_generate_v4(), 'Super Admin', 'Owner. Full access. Can manage all branches, confirm payments, view global P&L, and configure manufacturing recipes.'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Super Admin');

-- Then, create admin user if it doesn't exist
INSERT INTO users (id, email, password_hash, full_name, role_id, branch_id, is_active)
SELECT 
    uuid_generate_v4(),
    'admin@aify.com',
    '$2b$10$06Ua46dXi6qKmppVbtIEH.sCj8YsKXT7yCrMJmlBptjtJ7ru6eTLi', -- bcrypt hash for 'Admin@123'
    'Super Administrator',
    r.id,
    NULL, -- Super Admin has no branch restriction
    true
FROM roles r
WHERE r.name = 'Super Admin'
  AND NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@aify.com'
  );

