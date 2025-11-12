-- Setup script for Sharetea POS Database
-- This script will drop existing tables and recreate them with data

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_item_price_history CASCADE;
DROP TABLE IF EXISTS menu_item_ingredients CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Create tables (from databases.sql)
-- ============================================
-- Roles (thin RBAC)
-- ============================================
CREATE TABLE roles (
  role_id        smallint PRIMARY KEY,
  role_name      text NOT NULL UNIQUE
);

-- ============================================
-- Users (employees / system users)
-- ============================================
CREATE TABLE users (
  user_id        bigserial PRIMARY KEY,
  username       text NOT NULL UNIQUE,
  full_name      text NOT NULL,
  role_id        smallint NOT NULL REFERENCES roles(role_id),
  email          text,
  created_at     timestamptz DEFAULT now()
);

-- ============================================
-- Customers
-- ============================================
CREATE TABLE customers (
  customer_id    bigserial PRIMARY KEY,
  first_name     text,
  last_name      text,
  email          text UNIQUE,
  phone          text,
  loyalty_points integer DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

-- ============================================
-- Inventory items (real-world stock)
-- ============================================
CREATE TABLE inventory_items (
  inventory_item_id bigserial PRIMARY KEY,
  sku               text UNIQUE,
  name              text NOT NULL,
  unit              text NOT NULL,                  -- e.g., 'ml', 'g', 'each', 'bag'
  on_hand_quantity  numeric(12,3) NOT NULL DEFAULT 0, -- amount in unit
  servings_per_unit numeric(12,3) DEFAULT 1,        -- how many menu-item servings per inventory unit (helpful)
  reorder_point     numeric(12,3) DEFAULT 0,
  cost_per_unit     numeric(12,4) DEFAULT 0.00,     -- purchase cost per unit
  last_received_at  timestamptz,
  created_at        timestamptz DEFAULT now()
);

-- ============================================
-- Menu items (recipes offered to customers)
-- ============================================
CREATE TABLE menu_items (
  menu_item_id   bigserial PRIMARY KEY,
  name           text NOT NULL,
  category       text,
  active         boolean DEFAULT true,
  default_price  numeric(10,2) NOT NULL,
  description    text,
  created_at     timestamptz DEFAULT now()
);

-- ============================================
-- Menu item ingredient mapping: how much inventory is used per serving
-- ============================================
CREATE TABLE menu_item_ingredients (
  menu_item_id        bigint REFERENCES menu_items(menu_item_id) ON DELETE CASCADE,
  inventory_item_id   bigint REFERENCES inventory_items(inventory_item_id),
  quantity_per_serving numeric(12,4) NOT NULL, -- in inventory unit (ml, g, etc.)
  PRIMARY KEY (menu_item_id, inventory_item_id)
);

-- ============================================
-- Price history for menu items (temporal pricing)
-- ============================================
CREATE TABLE menu_item_price_history (
  price_history_id bigserial PRIMARY KEY,
  menu_item_id     bigint REFERENCES menu_items(menu_item_id) ON DELETE CASCADE,
  price            numeric(10,2) NOT NULL,
  valid_from       timestamptz NOT NULL DEFAULT now(),
  valid_to         timestamptz
);

-- ============================================
-- Orders (customer transactions)
-- ============================================
CREATE TABLE orders (
  order_id        bigserial PRIMARY KEY,
  customer_id     bigint REFERENCES customers(customer_id),
  created_by      bigint REFERENCES users(user_id), -- who took the order
  order_time      timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL DEFAULT 'PLACED',   -- e.g., PLACED, PAID, VOID, REFUNDED
  subtotal        numeric(12,2) NOT NULL DEFAULT 0.00,
  discounts       numeric(12,2) NOT NULL DEFAULT 0.00,
  tax             numeric(12,2) NOT NULL DEFAULT 0.00,
  total           numeric(12,2) NOT NULL DEFAULT 0.00,
  payment_method  text,                             -- CASH/CARD/MOBILE
  note            text
);
CREATE INDEX idx_orders_order_time ON orders (order_time);

-- ============================================
-- Order items (fix of original OrderItem entity: many useful attributes)
-- ============================================
CREATE TABLE order_items (
  order_item_id   bigserial PRIMARY KEY,
  order_id        bigint NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  menu_item_id    bigint NOT NULL REFERENCES menu_items(menu_item_id),
  quantity        integer NOT NULL CHECK (quantity > 0),
  unit_price      numeric(10,2) NOT NULL,          -- price per unit at time of purchase
  subtotal        numeric(12,2) NOT NULL,          -- unit_price * quantity - item-level-discounts
  options         jsonb,                           -- sweetness, ice, extra_toppings, size, etc
  prepared_by     bigint REFERENCES users(user_id), -- which employee fulfilled/prepared this item
  prepared_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);

-- ============================================
-- Payment table (optional split payments)
-- ============================================
CREATE TABLE payments (
  payment_id   bigserial PRIMARY KEY,
  order_id     bigint REFERENCES orders(order_id) ON DELETE CASCADE,
  amount       numeric(12,2) NOT NULL,
  method       text NOT NULL,
  paid_at      timestamptz NOT NULL DEFAULT now(),
  tx_reference text
);

-- ============================================
-- Inventory transactions (stock usage / receipts)
-- ============================================
CREATE TABLE inventory_transactions (
  inv_tx_id         bigserial PRIMARY KEY,
  inventory_item_id bigint REFERENCES inventory_items(inventory_item_id),
  quantity_changed  numeric(12,3) NOT NULL,
  reason            text NOT NULL,
  related_order_id  bigint REFERENCES orders(order_id),
  related_order_item_id bigint REFERENCES order_items(order_item_id),
  performed_by      bigint REFERENCES users(user_id),
  performed_at      timestamptz NOT NULL DEFAULT now()
);

-- Load data from CSV files
\copy roles FROM 'csv_output/roles.csv' WITH CSV HEADER;
\copy users FROM 'csv_output/users.csv' WITH CSV HEADER;
\copy customers FROM 'csv_output/customers.csv' WITH CSV HEADER;
\copy inventory_items FROM 'csv_output/inventory_items.csv' WITH CSV HEADER;
\copy menu_items FROM 'csv_output/menu_items.csv' WITH CSV HEADER;
\copy menu_item_ingredients FROM 'csv_output/menu_item_ingredients.csv' WITH CSV HEADER;
\copy orders FROM 'csv_output/orders.csv' WITH CSV HEADER;
\copy order_items FROM 'csv_output/order_items.csv' WITH CSV HEADER;
\copy payments FROM 'csv_output/payments.csv' WITH CSV HEADER;
\copy inventory_transactions FROM 'csv_output/inventory_transactions.csv' WITH CSV HEADER;

-- Reset sequences after bulk load to avoid primary key conflicts on inserts
SELECT setval(pg_get_serial_sequence('users','user_id'), COALESCE(MAX(user_id), 0)) FROM users;
SELECT setval(pg_get_serial_sequence('customers','customer_id'), COALESCE(MAX(customer_id), 0)) FROM customers;
SELECT setval(pg_get_serial_sequence('inventory_items','inventory_item_id'), COALESCE(MAX(inventory_item_id), 0)) FROM inventory_items;
SELECT setval(pg_get_serial_sequence('menu_items','menu_item_id'), COALESCE(MAX(menu_item_id), 0)) FROM menu_items;
SELECT setval(pg_get_serial_sequence('orders','order_id'), COALESCE(MAX(order_id), 0)) FROM orders;
SELECT setval(pg_get_serial_sequence('order_items','order_item_id'), COALESCE(MAX(order_item_id), 0)) FROM order_items;
SELECT setval(pg_get_serial_sequence('payments','payment_id'), COALESCE(MAX(payment_id), 0)) FROM payments;
SELECT setval(pg_get_serial_sequence('inventory_transactions','inv_tx_id'), COALESCE(MAX(inv_tx_id), 0)) FROM inventory_transactions;

-- Verify data was loaded
SELECT 'roles' as table_name, COUNT(*) as record_count FROM roles
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'inventory_items', COUNT(*) FROM inventory_items
UNION ALL
SELECT 'menu_items', COUNT(*) FROM menu_items
UNION ALL
SELECT 'menu_item_ingredients', COUNT(*) FROM menu_item_ingredients
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'payments', COUNT(*) FROM payments;

-- Show sample data
SELECT 'Sample orders:' as info;
SELECT order_id, customer_id, total, status, order_time FROM orders LIMIT 5;

SELECT 'Sample menu items:' as info;
SELECT menu_item_id, name, category, default_price FROM menu_items LIMIT 5;
