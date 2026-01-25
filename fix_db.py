import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def fix_database():
    print("🔧 Repairing Database Schema...")
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        # Fallback to localhost if no ENV set
        conn = psycopg2.connect(dbname="skyshield", user="postgres", password="Hkabra@2006", host="localhost", port="5432")
    else:
        conn = psycopg2.connect(DATABASE_URL)
        
    cur = conn.cursor()
    try:
        # 1. Remove Duplicate Data first
        print("🧹 Cleaning duplicates...")
        cur.execute("""
            DELETE FROM measurements a USING measurements b
            WHERE a.id < b.id AND a.station_id = b.station_id AND a.timestamp = b.timestamp;
        """)
        
        # 2. Add the "Upsert" Rule
        print("🛡️ Adding constraint...")
        cur.execute("ALTER TABLE measurements DROP CONSTRAINT IF EXISTS unique_station_timestamp;")
        cur.execute("ALTER TABLE measurements ADD CONSTRAINT unique_station_timestamp UNIQUE (station_id, timestamp);")
        
        conn.commit()
        print("✅ Database Fixed! You can now run the loaders.")
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_database()