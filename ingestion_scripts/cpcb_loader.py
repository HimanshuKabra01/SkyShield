import requests
import psycopg2
import time
import os
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
# Get your free token from: https://aqicn.org/data-platform/token/
WAQI_TOKEN = os.environ.get("WAQI_API_TOKEN") 
WAQI_URL_TEMPLATE = "https://api.waqi.info/feed/geo:{};{}/?token={}"

def get_db_connection():
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    return psycopg2.connect(
        dbname="skyshield", user="postgres", password="Hkabra@2006",
        host="localhost", port="5432"
    )

def fetch_robust_data():
    if not WAQI_TOKEN:
        print("❌ Error: WAQI_API_TOKEN is missing in .env file.")
        print("   Get one here: https://aqicn.org/data-platform/token/")
        return

    conn = get_db_connection()
    if not conn: return
    cur = conn.cursor()

    # Get all stations (ensure you have run station_syncer.py first)
    cur.execute("SELECT station_id, name, latitude, longitude FROM stations")
    stations = cur.fetchall()
    
    updates = 0
    print(f"🔄 Syncing Real-Time AQI for {len(stations)} stations via WAQI...")

    for s in stations:
        s_id, name, lat, lon = s
        
        # Rate limiting: WAQI is generous, but let's be safe (approx 5-10 req/sec allowed)
        # We add a tiny sleep to avoid overwhelming the connection pool or API
        time.sleep(0.2) 

        url = WAQI_URL_TEMPLATE.format(lat, lon, WAQI_TOKEN)
        
        try:
            response = requests.get(url, timeout=10)
            data = response.json()
            
            if data.get("status") != "ok":
                print(f"⚠️ API Error for {name}: {data.get('data')}")
                continue

            result = data.get("data", {})
            iaqi = result.get("iaqi", {})
            
            # Extract Pollutants (WAQI uses distinct keys like 'pm25', 'pm10')
            # Values are usually valid numbers, but we safeguard against missing keys
            pm25 = iaqi.get("pm25", {}).get("v")
            pm10 = iaqi.get("pm10", {}).get("v")
            no2 = iaqi.get("no2", {}).get("v")
            so2 = iaqi.get("so2", {}).get("v")
            co = iaqi.get("co", {}).get("v")
            o3 = iaqi.get("o3", {}).get("v")
            
            # Use the overall AQI reported by the station as a fallback if calc is complex
            aqi = result.get("aqi")

            # Skip if we have absolutely no particulate data (likely a station offline)
            if pm25 is None and pm10 is None and aqi is None:
                continue

            # Insert into DB
            cur.execute("""
                INSERT INTO measurements (station_id, timestamp, pm25, pm10, no2, so2, co, o3, aqi)
                VALUES (%s, NOW(), %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (station_id, timestamp) DO UPDATE
                SET pm25 = EXCLUDED.pm25, 
                    pm10 = EXCLUDED.pm10, 
                    no2 = EXCLUDED.no2, 
                    so2 = EXCLUDED.so2,
                    co = EXCLUDED.co,
                    o3 = EXCLUDED.o3,
                    aqi = EXCLUDED.aqi;
            """, (s_id, pm25, pm10, no2, so2, co, o3, aqi))
            
            updates += 1
            # Optional: Print progress for first few to verify
            if updates % 5 == 0:
                print(f"   -> Updated {name}: AQI {aqi} | PM2.5 {pm25}")

        except Exception as e:
            print(f"❌ Network/DB Error for {name}: {e}")

    conn.commit()
    conn.close()
    print(f"✅ Sync Complete. Successfully updated {updates}/{len(stations)} stations with ground-truth data.")

if __name__ == "__main__":
    fetch_robust_data()