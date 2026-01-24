import requests
import psycopg2
import time
from datetime import datetime
DB_PARAMS = {
    "dbname": "skyshield",
    "user": "postgres",
    "password": "Hkabra@2006", 
    "host": "localhost",
    "port": "5432"
}

def get_db_connection():
    try:
        return psycopg2.connect(**DB_PARAMS)
    except Exception as e:
        print(f"❌ DB Connection Error: {e}")
        return None

def update_weather():
    print("🌤️ Starting Holistic Weather Loader...")
    
    conn = get_db_connection()
    if not conn: return
    cur = conn.cursor()

    cur.execute("SELECT station_id, latitude, longitude FROM stations")
    stations = cur.fetchall()
    print(f"📍 Found {len(stations)} stations. Syncing multi-layer atmospheric data...")

    count = 0
    
    for station in stations:
        s_id, lat, lon = station

        url = (
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_speed_80m"
            f"&hourly=boundary_layer_height&timezone=Asia%2FKolkata&forecast_days=1"
        )
        
        try:
            response = requests.get(url)
            data = response.json()
            
            if "current" in data:
                temp = data["current"]["temperature_2m"]
                wind_10m = data["current"]["wind_speed_10m"]
                wind_dir = data["current"]["wind_direction_10m"]
                wind_80m = data["current"]["wind_speed_80m"]
                pbl_height = data["hourly"]["boundary_layer_height"][0] if "hourly" in data else None

                query = """
                    UPDATE measurements 
                    SET temp_c = %s, 
                        wind_speed_10m = %s, 
                        wind_dir = %s, 
                        wind_speed_80m = %s,
                        pbl_height = %s
                    WHERE station_id = %s 
                    AND timestamp = (
                        SELECT MAX(timestamp) FROM measurements WHERE station_id = %s
                    )
                """
                cur.execute(query, (temp, wind_10m, wind_dir, wind_80m, pbl_height, s_id, s_id))
                count += 1
                  
        except Exception as e:
            print(f"⚠️ Error fetching weather for {s_id}: {e}")
            
        time.sleep(0.05)

    conn.commit()
    conn.close()
    print(f"✅ Success! Holistic weather updated for {count} stations.")

if __name__ == "__main__":
    update_weather()