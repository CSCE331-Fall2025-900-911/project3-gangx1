# Supabase Database Setup Instructions

## Overview
This guide will help you set up your Sharetea POS database schema in Supabase and load your CSV data.

## Prerequisites
- Access to your Supabase project
- Your database connection string: `psql -h db.csdcnqghrtyxwwkhnygz.supabase.co -p 5432 -d postgres -U postgres`
- CSV files in a `csv_output/` directory (or wherever your CSV files are located)

---

## Step 1: Create the Database Schema

You have **two options** to run the schema creation:

### Option A: Using Supabase SQL Editor (Recommended for beginners)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `supabase_setup.sql`
6. Click **Run** (or press Ctrl+Enter)
7. Verify that all tables were created successfully

### Option B: Using psql Command Line

```bash
psql -h db.csdcnqghrtyxwwkhnygz.supabase.co -p 5432 -d postgres -U postgres -f supabase_setup.sql
```

You'll be prompted for your database password.

---

## Step 2: Load CSV Data

After creating the schema, you need to load your CSV data. You have **three options**:

### Option A: Using psql with \copy (Recommended - Fastest)

If you have your CSV files locally and can use psql:

```bash
# Connect to your database
psql -h db.csdcnqghrtyxwwkhnygz.supabase.co -p 5432 -d postgres -U postgres

# Then run these commands (adjust paths as needed):
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
```

**Note:** If your CSV files are in a different location, update the file paths accordingly.

### Option B: Using Supabase Table Editor (Manual Import)

1. Go to **Table Editor** in Supabase Dashboard
2. For each table (in dependency order):
   - Click on the table name
   - Click **Insert** → **Import data from CSV**
   - Upload your CSV file
   - Map columns if needed
   - Click **Import**

**Load tables in this order:**
1. `roles`
2. `users`
3. `customers`
4. `inventory_items`
5. `menu_items`
6. `menu_item_ingredients`
7. `orders`
8. `order_items`
9. `payments`
10. `inventory_transactions`

### Option C: Using Supabase Storage + SQL Function (Advanced)

1. Upload CSV files to Supabase Storage
2. Create a function to read from storage and insert into tables
3. This method is more complex but allows for automation

---

## Step 3: Reset Sequences

After loading all CSV data, you need to reset the sequences to prevent primary key conflicts on future inserts.

Run this in the Supabase SQL Editor or via psql:

```sql
SELECT setval(pg_get_serial_sequence('users','user_id'), COALESCE(MAX(user_id), 0)) FROM users;
SELECT setval(pg_get_serial_sequence('customers','customer_id'), COALESCE(MAX(customer_id), 0)) FROM customers;
SELECT setval(pg_get_serial_sequence('inventory_items','inventory_item_id'), COALESCE(MAX(inventory_item_id), 0)) FROM inventory_items;
SELECT setval(pg_get_serial_sequence('menu_items','menu_item_id'), COALESCE(MAX(menu_item_id), 0)) FROM menu_items;
SELECT setval(pg_get_serial_sequence('orders','order_id'), COALESCE(MAX(order_id), 0)) FROM orders;
SELECT setval(pg_get_serial_sequence('order_items','order_item_id'), COALESCE(MAX(order_item_id), 0)) FROM order_items;
SELECT setval(pg_get_serial_sequence('payments','payment_id'), COALESCE(MAX(payment_id), 0)) FROM payments;
SELECT setval(pg_get_serial_sequence('inventory_transactions','inv_tx_id'), COALESCE(MAX(inv_tx_id), 0)) FROM inventory_transactions;
```

---

## Step 4: Verify Data Load

Run this query to verify all data was loaded correctly:

```sql
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
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'inventory_transactions', COUNT(*) FROM inventory_transactions;
```

You should see record counts for each table.

---

## Troubleshooting

### Issue: Foreign Key Constraint Errors
**Solution:** Make sure you're loading tables in the correct dependency order (roles → users → customers → inventory_items → menu_items → menu_item_ingredients → orders → order_items → payments → inventory_transactions)

### Issue: CSV Import Fails
**Solution:** 
- Check that CSV files have headers
- Verify column names match table columns exactly
- Check for NULL values in NOT NULL columns
- Ensure data types match (especially dates/timestamps)

### Issue: Sequence Errors on Insert
**Solution:** Make sure you ran Step 3 (Reset Sequences) after loading all data

### Issue: Connection Timeout
**Solution:** 
- Check your network connection
- Verify your Supabase project is active
- Try using the Supabase Dashboard instead of psql

---

## Quick Reference: Complete Setup Script

If you want to do everything in one go via psql (assuming CSV files are in `csv_output/`):

```bash
# 1. Create schema
psql -h db.csdcnqghrtyxwwkhnygz.supabase.co -p 5432 -d postgres -U postgres -f supabase_setup.sql

# 2. Load data (run these commands inside psql)
psql -h db.csdcnqghrtyxwwkhnygz.supabase.co -p 5432 -d postgres -U postgres
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

# 3. Reset sequences (run in SQL Editor or psql)
# Copy the sequence reset queries from Step 3 above
```

---

## Next Steps

After setup is complete:
1. Test your database connection from your application
2. Verify Row Level Security (RLS) policies if needed
3. Set up any required database functions or triggers
4. Configure API access in Supabase Dashboard



