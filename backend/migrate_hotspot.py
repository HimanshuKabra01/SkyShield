import psycopg2
import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    else:
        return psycopg2.connect(
            dbname="skyshield",
            user="postgres",
            password="Hkabra@2006", 
            host="localhost",
            port="5432"
        )

def migrate_hotspots():
    conn = get_db_connection()
    cur = conn.cursor()

    print("🔥 Setting up Disease Hotspots & Seasonal Data...")

    try:

        cur.execute("""
            CREATE TABLE IF NOT EXISTS disease_reports (
                id SERIAL PRIMARY KEY,
                disease VARCHAR(100),
                latitude FLOAT,
                longitude FLOAT,
                risk_level VARCHAR(20), -- 'High', 'Moderate'
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        diseases = ['Asthma', 'Bronchitis', 'Viral Flu', 'Allergic Rhinitis']
        base_lat, base_lon = 28.6139, 77.2090 # Delhi
        
        reports = []
        for _ in range(50):
            lat = base_lat + random.uniform(-0.05, 0.05)
            lon = base_lon + random.uniform(-0.05, 0.05)
            disease = random.choices(diseases, weights=[40, 20, 20, 20])[0] # Asthma most common
            risk = 'High' if disease == 'Asthma' else 'Moderate'
            
            reports.append((disease, lat, lon, risk))

        cur.executemany("""
            INSERT INTO disease_reports (disease, latitude, longitude, risk_level)
            VALUES (%s, %s, %s, %s)
        """, reports)

        conn.commit()
        print(f"✅ Created 'disease_reports' table and added {len(reports)} mock reports.")

    except Exception as e:
        conn.rollback()
        print(f"❌ Migration Failed: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate_hotspots()