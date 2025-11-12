-- Add password authentication support to users table
-- This script adds password_hash column and ensures all required roles exist

-- Add password_hash column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash text;
  END IF;
END $$;

-- Ensure all required roles exist
-- Insert roles if they don't already exist (check by role_name since it's unique)
INSERT INTO roles (role_id, role_name) 
SELECT 1, 'Manager'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'Manager');

INSERT INTO roles (role_id, role_name) 
SELECT 2, 'Cashier'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'Cashier');

INSERT INTO roles (role_id, role_name) 
SELECT 3, 'Barista'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'Barista');

INSERT INTO roles (role_id, role_name) 
SELECT 4, 'Customer'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'Customer');

