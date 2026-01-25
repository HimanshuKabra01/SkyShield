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

GOOGLE_CLOUD_PROJECT = "api-contri"  # Ensure this matches your GEE Project ID

def fetch_satellite_data():
    try:
        print("🌍 Connecting to Google Earth Engine...")
        ee.Initialize(project=GOOGLE_CLOUD_PROJECT)
    except Exception as e:
        print(f"❌ Auth Error: {e}")
        print("💡 Tip: Run 'earthengine authenticate' in terminal first.")
        return

    conn = get_db_connection()
    if not conn: return
    cur = conn.cursor()
    
    cur.execute("SELECT station_id, latitude, longitude FROM stations")
    stations = cur.fetchall()

    # Look back 7 days to ensure we find a cloud-free pass
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    print("🛰️  Processing Sentinel-5P Mosaic (7-Day Aggregate)...")
    
    # Create a cleaner cloud-free mosaic using the mean of the last week
    no2_img = (ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_NO2')
                .select('tropospheric_NO2_column_number_density')
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                .mean()) # KEY FIX: Use Mean instead of First

    so2_img = (ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_SO2')
                .select('SO2_column_number_density')
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                .mean())

    updated_count = 0

    for station in stations:
        s_id, lat, lon = station
        
        # KEY FIX: Use a buffer (radius) to find data even if the exact pixel is null
        point = ee.Geometry.Point([float(lon), float(lat)]).buffer(2000) # 2km radius
        
        no2_val = 0.0
        try:
            data = no2_img.reduceRegion(reducer=ee.Reducer.mean(), geometry=point, scale=1113).getInfo()
            val = data.get('tropospheric_NO2_column_number_density')
            if val: no2_val = val * 1000000 # Convert to µmol/m²
        except: pass

        so2_val = 0.0
        try:
            data = so2_img.reduceRegion(reducer=ee.Reducer.mean(), geometry=point, scale=1113).getInfo()
            val = data.get('SO2_column_number_density')
            if val: so2_val = val * 1000000
        except: pass

        if no2_val > 0 or so2_val > 0:
            cur.execute("""
                UPDATE measurements 
                SET no2_sat = %s, so2_sat = %s
                WHERE station_id = %s 
                AND timestamp = (SELECT MAX(timestamp) FROM measurements WHERE station_id = %s)
            """, (no2_val, so2_val, s_id, s_id))
            updated_count += 1

    conn.commit()
    conn.close()
    print(f"🚀 Satellite Data Fused for {updated_count} stations.")

if __name__ == "__main__":
    fetch_satellite_data()