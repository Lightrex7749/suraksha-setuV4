"""
Database Table Inspector
Checks what tables exist in the Render PostgreSQL database
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check_database():
    # Get database URL
    database_url = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')
    
    if not database_url:
        print("❌ No DATABASE_URL found in .env file")
        return
    
    # Convert to standard PostgreSQL URL (remove +asyncpg if present)
    database_url = database_url.replace('postgresql+asyncpg://', 'postgresql://')
    
    print("🔍 Connecting to Render PostgreSQL database...")
    print(f"📍 Database: {database_url.split('@')[1] if '@' in database_url else 'Unknown'}\n")
    
    try:
        # Connect with SSL requirement
        conn = await asyncpg.connect(
            database_url,
            ssl='require',
            timeout=30
        )
        
        print("✅ Connected successfully!\n")
        
        # Get list of all tables
        print("📊 Checking tables in database...\n")
        tables = await conn.fetch("""
            SELECT 
                table_name,
                table_schema
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        if tables:
            print(f"✅ Found {len(tables)} table(s):\n")
            print("=" * 60)
            for table in tables:
                table_name = table['table_name']
                print(f"\n📋 Table: {table_name}")
                
                # Get column information
                columns = await conn.fetch(f"""
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default
                    FROM information_schema.columns
                    WHERE table_name = '{table_name}'
                    AND table_schema = 'public'
                    ORDER BY ordinal_position;
                """)
                
                print(f"   Columns ({len(columns)}):")
                for col in columns:
                    nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                    default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
                    print(f"   - {col['column_name']}: {col['data_type']} {nullable}{default}")
                
                # Get row count
                count = await conn.fetchval(f'SELECT COUNT(*) FROM "{table_name}"')
                print(f"   📈 Row count: {count}")
                print("-" * 60)
        else:
            print("⚠️  No tables found in database!")
            print("\nThis means the database exists but is empty.")
            print("Run the backend server to auto-create tables (if configured).")
        
        # Check if alembic migrations table exists
        alembic = await conn.fetch("""
            SELECT * FROM information_schema.tables
            WHERE table_name = 'alembic_version';
        """)
        
        if alembic:
            print("\n🔄 Database migrations:")
            versions = await conn.fetch("SELECT * FROM alembic_version")
            for v in versions:
                print(f"   Current version: {v['version_num']}")
        
        await conn.close()
        print("\n✅ Database inspection complete!")
        
    except asyncpg.exceptions.InvalidPasswordError:
        print("❌ Invalid database credentials")
        print("Check your DATABASE_URL username and password")
    except asyncio.TimeoutError:
        print("❌ Connection timeout!")
        print("\n💡 Possible issues:")
        print("   1. Your IP is not whitelisted on Render")
        print("   2. Database is paused or suspended")
        print("   3. Network/firewall blocking connection")
        print("\n🔧 Solutions:")
        print("   1. Go to Render Dashboard → Database → Settings → Connections")
        print("   2. Add your IP to allowed connections")
        print("   3. Or use: render psql dpg-d5uq87vfte5s73c80j5g-a")
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("  SURAKSHA SETU - DATABASE TABLE INSPECTOR")
    print("=" * 60)
    print()
    asyncio.run(check_database())
