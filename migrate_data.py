#!/usr/bin/env python3
"""
Migration script to import data from PostgreSQL backup to Supabase
Run this after creating the schema in Supabase
"""

import psycopg2
from supabase import create_client
import os
import sys
from typing import List, Dict, Any

# PostgreSQL connection (your original database)
PG_CONFIG = {
    'host': 'csce-315-db.engr.tamu.edu',
    'port': 5432,
    'database': 'gang_x1_db',
    'user': 'gang_x1',
    'password': 'kx3oNcR9'
}

# Supabase connection (get from environment or set directly)
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY', '')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables")
    print("Example:")
    print("  export SUPABASE_URL='https://xxxxx.supabase.co'")
    print("  export SUPABASE_ANON_KEY='your-anon-key'")
    sys.exit(1)

def connect_postgres():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**PG_CONFIG)
        print("✓ Connected to PostgreSQL")
        return conn
    except Exception as e:
        print(f"✗ Failed to connect to PostgreSQL: {e}")
        sys.exit(1)

def connect_supabase():
    """Connect to Supabase"""
    try:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✓ Connected to Supabase")
        return client
    except Exception as e:
        print(f"✗ Failed to connect to Supabase: {e}")
        sys.exit(1)

def migrate_table(pg_conn, supabase, table_name: str, transform_fn=None):
    """Migrate a single table from PostgreSQL to Supabase"""
    print(f"\nMigrating {table_name}...")
    
    pg_cursor = pg_conn.cursor()
    
    # Get all data
    pg_cursor.execute(f"SELECT * FROM {table_name}")
    columns = [desc[0] for desc in pg_cursor.description]
    rows = pg_cursor.fetchall()
    
    if not rows:
        print(f"  No data in {table_name}")
        return
    
    # Transform rows to dictionaries
    data = []
    for row in rows:
        row_dict = dict(zip(columns, row))
        
        # Apply transformation if provided
        if transform_fn:
            row_dict = transform_fn(row_dict)
        
        data.append(row_dict)
    
    # Insert in batches
    batch_size = 100
    total = len(data)
    
    for i in range(0, total, batch_size):
        batch = data[i:i + batch_size]
        try:
            result = supabase.table(table_name).insert(batch).execute()
            print(f"  Inserted {min(i + batch_size, total)}/{total} rows")
        except Exception as e:
            print(f"  ✗ Error inserting batch: {e}")
            # Try inserting one by one to find the problematic row
            for item in batch:
                try:
                    supabase.table(table_name).insert(item).execute()
                except Exception as item_error:
                    print(f"    Failed to insert: {item.get('name', item)} - {item_error}")
    
    print(f"  ✓ Completed {table_name}")

def main():
    print("=" * 60)
    print("PostgreSQL to Supabase Migration")
    print("=" * 60)
    
    # Connect to databases
    pg_conn = connect_postgres()
    supabase = connect_supabase()
    
    # Migration order matters due to foreign keys
    tables_to_migrate = [
        'roles',
        'users',
        'customers',
        'inventory_items',
        'menu_items',
        'menu_item_ingredients',
        'orders',
        'order_items',
        'payments',
        'inventory_transactions',
    ]
    
    print(f"\nMigrating {len(tables_to_migrate)} tables...")
    
    for table in tables_to_migrate:
        try:
            migrate_table(pg_conn, supabase, table)
        except Exception as e:
            print(f"  ✗ Failed to migrate {table}: {e}")
            continue
    
    pg_conn.close()
    print("\n" + "=" * 60)
    print("Migration complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Verify data in Supabase dashboard")
    print("2. Test your application")
    print("3. Set up RLS policies if needed")

if __name__ == '__main__':
    main()

