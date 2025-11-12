# Frontend Database Integration Setup Guide

This guide will help you complete the integration between your frontend and Supabase database.

## Prerequisites

✅ You have completed the Supabase database setup (ran `supabase_setup.sql`)
✅ Your database has data loaded (CSV files imported)
✅ You have a Supabase project with API access

## Step 1: Run Database Migration

Run the migration script to add missing columns and views:

```bash
# Using psql
psql -h db.csdcnqghrtyxwwkhnygz.supabase.co -p 5432 -d postgres -U postgres -f supabase_migration.sql

# OR using Supabase SQL Editor:
# 1. Go to Supabase Dashboard > SQL Editor
# 2. Copy and paste the contents of supabase_migration.sql
# 3. Click Run
```

This migration will:
- Add the `source` column to the `orders` table (if it doesn't exist)
- Create the `low_stock_items` view for inventory management

## Step 2: Configure Environment Variables

Create a `.env` file in the project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://csdcnqghrtyxwwkhnygz.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**To get your Supabase credentials:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** > **API**
4. Copy the **Project URL** → `VITE_SUPABASE_URL`
5. Copy the **anon public** key → `VITE_SUPABASE_ANON_KEY`

**Important:** The URL format should be `https://your-project-id.supabase.co` (not the database connection string)

## Step 3: Set Up Row Level Security (RLS) Policies

For the frontend to access your tables, you need to configure RLS policies in Supabase:

### Option A: Disable RLS (Development Only - NOT for production)

```sql
-- Run this in Supabase SQL Editor for development
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
```

### Option B: Create Proper RLS Policies (Recommended)

```sql
-- Allow public read access to menu items
CREATE POLICY "Allow public read access to menu items"
  ON menu_items FOR SELECT
  USING (true);

-- Allow authenticated users to create orders
CREATE POLICY "Allow authenticated users to create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to read their orders
CREATE POLICY "Allow authenticated users to read orders"
  ON orders FOR SELECT
  USING (true);

-- Allow authenticated users to update orders
CREATE POLICY "Allow authenticated users to update orders"
  ON orders FOR UPDATE
  USING (true);

-- Allow public read access to order items
CREATE POLICY "Allow public read access to order items"
  ON order_items FOR SELECT
  USING (true);

-- Allow authenticated users to insert order items
CREATE POLICY "Allow authenticated users to insert order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- Allow public read access to users (for login)
CREATE POLICY "Allow public read access to users"
  ON users FOR SELECT
  USING (true);

-- Allow public read access to roles
CREATE POLICY "Allow public read access to roles"
  ON roles FOR SELECT
  USING (true);

-- Allow public read access to inventory items
CREATE POLICY "Allow public read access to inventory items"
  ON inventory_items FOR SELECT
  USING (true);
```

**Run these policies in Supabase SQL Editor.**

## Step 4: Verify Database Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the login page
3. Try logging in with a username from your `users` table
4. Check the browser console for any errors

## Step 5: Test Each Feature

### Test Menu Loading
- Go to `/kiosk` - menu items should load from database
- Go to `/cashier` - menu items should load from database

### Test Order Creation
- Add items to cart in Kiosk or Cashier
- Complete checkout
- Verify order appears in database

### Test Kitchen Queue
- Go to `/kitchen`
- Orders should appear in the queue
- Try updating order status

### Test Manager Dashboard
- Login as a manager
- Go to `/manager`
- Low stock items should display
- Menu items table should show all items

## Troubleshooting

### Error: "Missing Supabase environment variables"
**Solution:** Make sure your `.env` file exists and has the correct variable names (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)

### Error: "Failed to fetch menu"
**Solution:** 
1. Check RLS policies are set correctly
2. Verify your Supabase URL and key are correct
3. Check browser console for detailed error messages

### Error: "User not found" on login
**Solution:**
1. Verify users exist in your `users` table
2. Check that usernames match exactly (case-sensitive)
3. Verify the `roles` table has data and foreign keys are correct

### Error: "Failed to create order"
**Solution:**
1. Check that `menu_items` table has data
2. Verify foreign key constraints are satisfied
3. Check RLS policies allow INSERT on `orders` and `order_items` tables

### Orders not appearing in Kitchen Queue
**Solution:**
1. Verify orders have status 'PLACED', 'PREPARING', or 'READY'
2. Check that `order_items` are properly linked to `orders`
3. Verify the join query in `api.getKitchenQueue()` is working

## Database Schema Notes

### Orders Table
- The `source` column is optional (added by migration)
- If migration fails, orders will still work but without source tracking

### Low Stock Items
- Uses a view `low_stock_items` if available
- Falls back to querying `inventory_items` directly if view doesn't exist

### Authentication
- Currently uses simple username-based login
- In production, implement proper password hashing
- Consider integrating with Supabase Auth for better security

## Next Steps

1. ✅ Run migration script
2. ✅ Set up environment variables
3. ✅ Configure RLS policies
4. ✅ Test all features
5. ⏭️ Add password authentication (if needed)
6. ⏭️ Set up proper error logging
7. ⏭️ Add loading indicators for better UX
8. ⏭️ Implement real-time updates for kitchen queue

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check Supabase logs in the dashboard
3. Verify all SQL scripts ran successfully
4. Ensure all tables have data loaded

