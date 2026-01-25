import requests
import psycopg2
import random
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
DATA_GOV_URL = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
OPEN_METEO_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

def get_db_connection():
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    return psycopg2.connect(
        dbname="skyshield", user="postgres", password="Hkabra@2006",
        host="localhost", port="5432"
    )

def fetch_open_meteo_fallback(lat, lon):
    """Fetches real-time estimated air quality if sensors are offline"""
    try:
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
            "timezone": "auto"
        }
        response = requests.get(OPEN_METEO_URL, params=params, timeout=5)
        data = response.json().get("current", {})
        
        return {
            "pm10": data.get("pm10"),
            "pm25": data.get("pm2_5"),
            "no2": data.get("nitrogen_dioxide"),
            "so2": data.get("sulphur_dioxide"),
            "co": data.get("carbon_monoxide"),
            "o3": data.get("ozone")
        }
    except Exception as e:
        print(f"⚠️ Open-Meteo Fallback failed for {lat}, {lon}: {e}")
        return None

def fetch_robust_data():
    conn = get_db_connection()
    if not conn: return
    cur = conn.cursor()

    cur.execute("SELECT station_id, name, latitude, longitude FROM stations")
    stations = cur.fetchall()
    
    api_key = os.environ.get("DATA_GOV_API_KEY")
    cpcb_data_map = {}

    if api_key:
        print("🔌 Attempting CPCB API Connection...")
        try:
            params = {"api-key": api_key, "format": "json", "limit": "2000", "filters[city]": "Delhi"}
            response = requests.get(DATA_GOV_URL, params=params, timeout=10)
            if response.status_code == 200:
                records = response.json().get("records", [])
                for rec in records:
                    name = rec.get("station", "").strip().lower()
                    pollutant = rec.get("pollutant_id")
                    value = rec.get("pollutant_avg")
                    
                    if name not in cpcb_data_map: cpcb_data_map[name] = {}
                    cpcb_data_map[name][pollutant] = value
                print(f"✅ CPCB Data Received: {len(records)} records")
            else:
                print("⚠️ CPCB API Error (Non-200). Switching to Fallback.")
        except Exception as e:
            print(f"⚠️ CPCB API Failed: {e}")

    updates = 0
    print(f"🔄 Syncing {len(stations)} stations...")

    for s in stations:
        s_id, name, lat, lon = s
        
        p_vals = {"pm25": None, "pm10": None, "no2": None, "so2": None, "co": None, "o3": None}
        source = "None"

        station_key = name.strip().lower()
        if station_key in cpcb_data_map:
            raw = cpcb_data_map[station_key]
            p_vals["pm25"] = raw.get("PM2.5") or raw.get("PM 2.5")
            p_vals["pm10"] = raw.get("PM10") or raw.get("PM 10")
            p_vals["no2"] = raw.get("NO2")
            p_vals["so2"] = raw.get("SO2")
            p_vals["co"] = raw.get("CO")
            p_vals["o3"] = raw.get("OZONE")
            source = "CPCB_Gov"

        if p_vals["pm25"] is None or str(p_vals["pm25"]) == "NA":
            fallback = fetch_open_meteo_fallback(lat, lon)
            if fallback:
                p_vals = fallback
                source = "Open-Meteo_Model"

        def clean(val):
            try:
                return float(val) if val is not None and str(val) != "NA" else None
            except:
                return None

        final_data = {k: clean(v) for k, v in p_vals.items()}

        if all(v is None for v in final_data.values()):
            continue

        try:
            cur.execute("""
                INSERT INTO measurements (station_id, timestamp, pm25, pm10, no2, so2, co, aqi)
                VALUES (%s, NOW(), %s, %s, %s, %s, %s, %s)
                ON CONFLICT (station_id, timestamp) DO UPDATE
                SET pm25 = EXCLUDED.pm25, pm10 = EXCLUDED.pm10, 
                    no2 = EXCLUDED.no2, so2 = EXCLUDED.so2;
            """, (
                s_id, final_data["pm25"], final_data["pm10"], 
                final_data["no2"], final_data["so2"], final_data["co"], 
                final_data["pm25"]
            ))
            updates += 1
        except Exception as e:
            print(f"Error updating {name}: {e}")

    conn.commit()
    conn.close()
    print(f"✅ Sync Complete. Updated {updates} stations using mixed sources.")

if __name__ == "__main__":
    fetch_robust_data()