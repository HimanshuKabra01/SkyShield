import requests
import psycopg2
import time
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    return psycopg2.connect(
        dbname="skyshield", user="postgres", password="Hkabra@2006",
        host="localhost", port="5432"
    )

def update_weather():    
    conn = get_db_connection()
    if not conn: return
    cur = conn.cursor()

    cur.execute("SELECT station_id, latitude, longitude FROM stations")
    stations = cur.fetchall()
    print(f"Syncing weather for {len(stations)} stations...")

    count = 0
    
    for station in stations:
        s_id, lat, lon = station

        time.sleep(0.2) 

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
            print(f"Weather Error {s_id}: {e}")

    conn.commit()
    conn.close()
    print(f"Weather synced for {count} stations.")

if __name__ == "__main__":
    update_weather()