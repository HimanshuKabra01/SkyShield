import requests
import psycopg2
import json

API_KEY = "579b464db66ec23bdd000001f6ede61d6f8d4bf1760cd62b3366b8a0"
RESOURCE_ID = "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69" 
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

def clean_val(val):
  """Safely converts API strings to Float or None"""
  if val is None: return None
  s = str(val).strip().upper()
  if s in ["NA", "None", "", "-"]: return None
  try:
    return float(val)
  except:
    return None

def fetch_and_save():
  print("Connecting to CPCB API...")
  url = f"https://api.data.gov.in/resource/{RESOURCE_ID}?api-key={API_KEY}&format=json&limit=1000&filters[state]=Delhi"
  
  try:
    response = requests.get(url)
    records = response.json().get("records", [])
    print(f"📡 Fetched {len(records)} raw records.")
  except Exception as e:
    print(f"❌ API Request Failed: {e}")
    return

  station_map = {}
  
  POLLUTANT_MAP = {
    "PM2.5": "pm25", "PM 2.5": "pm25",
    "PM10": "pm10", "PM 10": "pm10",
    "NO2": "no2", "NITROGEN DIOXIDE": "no2",
    "SO2": "so2", "SULFUR DIOXIDE": "so2",
    "AQI": "aqi"
  }

  for row in records:
    station_name = row.get("station")
    if not station_name: continue

    clean_id = "DL_" + station_name.split(',')[0].replace(" ", "_").upper()[:10]
    
    if clean_id not in station_map:
      station_map[clean_id] = {
        "station_id": clean_id,
        "name": station_name,
        "timestamp": row.get("last_update"),
        "pm25": None, "pm10": None, "no2": None, "so2": None, "aqi": None
      }
    
    raw_p_id = row.get("pollutant_id", "").strip().upper()
    raw_val = row.get("avg_value")
    
    db_col = POLLUTANT_MAP.get(raw_p_id)
    if db_col:
      val = clean_val(raw_val)
      if val is not None:
        if db_col == "aqi": val = int(val)
        station_map[clean_id][db_col] = val

  if station_map:
    first_station = list(station_map.values())[0]
    print("\n🔎 DEBUG: Validating first station before save:")
    print(json.dumps(first_station, indent=4, default=str))
  else:
    print("❌ Error: No stations found in map!")
    return

  conn = get_db_connection()
  if not conn: return
  cur = conn.cursor()
  
  count = 0
  for s in station_map.values():
    try:
      cur.execute("""
        INSERT INTO stations (station_id, name, city, state, latitude, longitude, location)
        VALUES (%s, %s, 'Delhi', 'Delhi', 0, 0, ST_SetSRID(ST_MakePoint(0, 0), 4326))
        ON CONFLICT (station_id) DO NOTHING;
    """, (s['station_id'], s['name']))
      
      cur.execute("""
        INSERT INTO measurements (station_id, timestamp, pm25, pm10, no2, so2, aqi)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (station_id, timestamp) DO UPDATE
        SET 
            pm25 = COALESCE(EXCLUDED.pm25, measurements.pm25),
            pm10 = COALESCE(EXCLUDED.pm10, measurements.pm10),
            no2  = COALESCE(EXCLUDED.no2, measurements.no2),
            so2  = COALESCE(EXCLUDED.so2, measurements.so2),
            aqi  = COALESCE(EXCLUDED.aqi, measurements.aqi);
    """, (s['station_id'], s['timestamp'], s['pm25'], s['pm10'], s['no2'], s['so2'], s['aqi']))
      
      count += 1
    except Exception as e:
      print(f"❌ Error saving {s['name']}: {e}")
      conn.rollback()

  conn.commit()
  conn.close()
  print(f"\n🚀 SUCCESS: Updated {count} stations in database.")

if __name__ == "__main__":
  fetch_and_save()