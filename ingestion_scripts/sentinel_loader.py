import ee
import psycopg2
from datetime import datetime, timedelta
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

GOOGLE_CLOUD_PROJECT = "api-contri" 

def fetch_satellite_data():
    try:
        print("🌍 Connecting to Google Earth Engine...")
        ee.Initialize(project=GOOGLE_CLOUD_PROJECT)
    except Exception as e:
        print(f"❌ Auth Error: {e}"); return

    # Focus on Delhi Region
    REGION = ee.Geometry.Point([77.2090, 28.6139])

    conn = get_db_connection()
    if not conn: return
    cur = conn.cursor()
    
    cur.execute("SELECT station_id, latitude, longitude FROM stations")
    stations = cur.fetchall()
    print(f"📍 Targeting {len(stations)} stations for satellite data...")

    # Look back 5 days (Satellite passes over Delhi once every 1-2 days)
    now = datetime.now()
    start_date = (now - timedelta(days=5)).strftime('%Y-%m-%d')
    end_date = now.strftime('%Y-%m-%d')

    print("🛰️  Fetching Sentinel-5P Data...")
    
    no2_coll = (ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_NO2')
                .select('tropospheric_NO2_column_number_density')
                .filterDate(start_date, end_date)
                .filterBounds(REGION)
                .sort('system:time_start', False))

    so2_coll = (ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_SO2')
                .select('SO2_column_number_density')
                .filterDate(start_date, end_date)
                .filterBounds(REGION)
                .sort('system:time_start', False))

    no2_img = no2_coll.first() if no2_coll.size().getInfo() > 0 else None
    so2_img = so2_coll.first() if so2_coll.size().getInfo() > 0 else None

    if no2_img:
        ts = no2_img.get('system:time_start').getInfo()
        print(f"📸 Found Satellite Image from: {datetime.fromtimestamp(ts/1000)}")

    updated_count = 0

    for station in stations:
        # Force float conversion to prevent 'Invalid Geometry' error
        s_id = station[0]
        lat = float(station[1]) 
        lon = float(station[2])
        point = ee.Geometry.Point([lon, lat])
        
        no2_val = 0.0
        if no2_img:
            data = no2_img.reduceRegion(reducer=ee.Reducer.mean(), geometry=point, scale=1000).getInfo()
            val = data.get('tropospheric_NO2_column_number_density')
            if val is not None: no2_val = val * 1000000 

        so2_val = 0.0
        if so2_img:
            data = so2_img.reduceRegion(reducer=ee.Reducer.mean(), geometry=point, scale=1000).getInfo()
            val = data.get('SO2_column_number_density')
            if val is not None: so2_val = val * 1000000

        if no2_val > 0 or so2_val > 0:
            try:
                cur.execute("""
                    UPDATE measurements 
                    SET no2_sat = %s, so2_sat = %s
                    WHERE station_id = %s 
                    AND timestamp = (
                        SELECT MAX(timestamp) FROM measurements WHERE station_id = %s
                    )
                """, (no2_val, so2_val, s_id, s_id))
                
                if cur.rowcount > 0: updated_count += 1
            except Exception as e:
                pass

    conn.commit()
    conn.close()
    print(f"🚀 Satellite Data fused for {updated_count} stations.")

if __name__ == "__main__":
    fetch_satellite_data()