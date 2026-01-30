import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    else:
        # Fallback to local config if env var is missing
        return psycopg2.connect(
            dbname="skyshield",
            user="postgres",
            password="Hkabra@2006", 
            host="localhost",
            port="5432"
        )

def migrate_database():
    conn = get_db_connection()
    cur = conn.cursor()

    print("🔄 Starting Safe Migration (No Data Deletion)...")

    try:
        # ==========================================
        # 1. FIX MEASUREMENTS TABLE (Add missing columns)
        # ==========================================
        # We check if columns exist before adding them to avoid errors
        weather_columns = [
            ("temp_c", "FLOAT"),
            ("wind_speed_10m", "FLOAT"),
            ("wind_speed_80m", "FLOAT"),
            ("wind_dir", "FLOAT"),
            ("pbl_height", "FLOAT"),
            ("no2_sat", "FLOAT"),
            ("so2_sat", "FLOAT")
        ]

        for col, dtype in weather_columns:
            cur.execute(f"""
                ALTER TABLE measurements 
                ADD COLUMN IF NOT EXISTS {col} {dtype};
            """)
            print(f"   - Checked/Added column: measurements.{col}")

        # ==========================================
        # 2. CREATE PREDICTIONS TABLE (If not exists)
        # ==========================================
        cur.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id SERIAL PRIMARY KEY,
                station_id VARCHAR(50) REFERENCES stations(station_id),
                forecast_timestamp TIMESTAMP,
                predicted_pm25 FLOAT,
                UNIQUE(station_id, forecast_timestamp)
            );
        """)
        print("   - Checked/Created table: predictions")

        # ==========================================
        # 3. FIX STATIONS TABLE (Ensure columns exist)
        # ==========================================
        # Ensure stations has the standard columns we expect
        station_columns = [
            ("latitude", "FLOAT"),
            ("longitude", "FLOAT"),
            ("name", "VARCHAR(100)")
        ]
        for col, dtype in station_columns:
            cur.execute(f"""
                ALTER TABLE stations 
                ADD COLUMN IF NOT EXISTS {col} {dtype};
            """)

        conn.commit()
        print("✅ Database Migration Complete! No data was deleted.")

    except Exception as e:
        conn.rollback()
        print(f"❌ Migration Failed: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate_database()