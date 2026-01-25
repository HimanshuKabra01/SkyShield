import requests
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

RESOURCE_ID = "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
BASE_URL = f"https://api.data.gov.in/resource/{RESOURCE_ID}"

TARGET_CITIES = [
  "Delhi", "Gurugram", "Noida", "Ghaziabad", "Faridabad", 
  "Greater Noida", "Sonipat", "Bahadurgarh", "Meerut", "Panipat"
]

def get_db_connection():
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    return psycopg2.connect(
        dbname="skyshield", user="postgres", password="Hkabra@2006",
        host="localhost", port="5432"
    )

def sync_stations():
    api_key = os.environ.get("DATA_GOV_API_KEY")
    if not api_key:
      print("Error: DATA_GOV_API_KEY is missing in .env file!")
      return

    print(" Connecting to data.gov.in to discover stations...")
    
    params = {
      "api-key": api_key,
      "format": "json",
      "limit": "1000",
      "filters[country]": "India"
    }

    try:
        response = requests.get(BASE_URL, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f" API Error: {e}")
        return

    records = data.get("records", [])
    print(f"Scanned {len(records)} active sensors across India.")

    new_stations = []
    seen_ids = set()

    for rec in records:
        city = rec.get("city", "")
        if city in TARGET_CITIES:
            station_name = rec.get("station", "Unknown")
            
            s_id = f"{city[:2].upper()}-{station_name.split(',')[0].replace(' ', '_')}"[:50]
            
            if s_id in seen_ids: continue
            seen_ids.add(s_id)

            lat = rec.get("latitude")
            lon = rec.get("longitude")
            
            if lat and lon and lat != "NA" and lon != "NA":
                new_stations.append((s_id, station_name, float(lat), float(lon), city))

    print(f"📍 Found {len(new_stations)} stations in Delhi-NCR.")

    if not new_stations:
        print(" No stations found. Check if the API Key is valid or Resource ID changed.")
        return

    conn = get_db_connection()
    cur = conn.cursor()
    
    count = 0
    for s in new_stations:
        try:
            cur.execute("""
                INSERT INTO stations (station_id, name, latitude, longitude, region)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (station_id) DO NOTHING
            """, s)
            if cur.rowcount > 0: count += 1
        except Exception as e:
            print(f"DB Error for {s[1]}: {e}")
            conn.rollback()

    conn.commit()
    cur.close()
    conn.close()
    print(f" Sync Complete! Added {count} new stations. (Total tracked: {len(new_stations)})")

if __name__ == "__main__":
    sync_stations()