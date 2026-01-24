import ee
import psycopg2
from datetime import datetime, timedelta

GOOGLE_CLOUD_PROJECT = "api-contri" 

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
    print(f" DB Connection Error: {e}")
    return None

def fetch_satellite_data():
  try:
    print("🌍 Connecting to Google Earth Engine...")
    if GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_PROJECT != "YOUR_PROJECT_ID_HERE":
      ee.Initialize(project=GOOGLE_CLOUD_PROJECT)
    else:
      ee.Initialize()
  except Exception as e:
    print(f" Auth Error: {e}")
    print(" Tip: Put your 'Project ID' in line 6 of this script!")
    return

  print("🛰️ Connected! Searching for Sentinel-5P satellite stream...")

  conn = get_db_connection()
  if not conn: return
  cur = conn.cursor()
  
  cur.execute("SELECT station_id, latitude, longitude FROM stations")
  stations = cur.fetchall()
  print(f"📍 Targeting {len(stations)} ground stations...")

  now = datetime.now()
  start_date = (now - timedelta(days=30)).strftime('%Y-%m-%d')
  end_date = now.strftime('%Y-%m-%d')

  print(f"🔎 Searching imagery from {start_date} to {end_date}...")

  collection = (ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2')
                .select('tropospheric_NO2_column_number_density')
                .filterDate(start_date, end_date)
                .filterBounds(ee.Geometry.Point([77.10, 28.70]))) # Focus on Delhi

  count = collection.size().getInfo()
  if count == 0:
    print("⚠️ No satellite pass over Delhi in the last 48 hours (Try again later).")
    return

  image = collection.first()
  acq_date = ee.Date(image.get('system:time_start')).format('YYYY-MM-dd').getInfo()
  print(f"📸 Found Image from: {acq_date}")

  updated_count = 0
  
  for station in stations:
    s_id, lat, lon = station
    
    point = ee.Geometry.Point([lon, lat])
    
    data = image.reduceRegion(reducer=ee.Reducer.mean(), geometry=point, scale=1000).getInfo()
    
    raw_val = data.get('tropospheric_NO2_column_number_density')
    
    if raw_val:
      no2_sat = raw_val * 1000000  
      
      try:
        cur.execute("""
            UPDATE measurements 
            SET no2 = %s 
            WHERE station_id = %s AND timestamp::date = %s
        """, (no2_sat, s_id, acq_date))
        updated_count += 1
      except Exception as e:
        pass

  conn.commit()
  conn.close()
  print(f"🚀 Fusion Complete: Added satellite NO2 to {updated_count} stations.")

if __name__ == "__main__":
  fetch_satellite_data()