import ee
import psycopg2
from datetime import datetime, timedelta

# --- CONFIGURATION ---
GOOGLE_CLOUD_PROJECT = "api-contri" 
DB_PARAMS = {
    "dbname": "skyshield", "user": "postgres", "password": "Hkabra@2006",
    "host": "localhost", "port": "5432"
}

def get_db_connection():
    try: return psycopg2.connect(**DB_PARAMS)
    except Exception as e: print(f"❌ DB Connection Error: {e}"); return None

def fetch_satellite_data():
    try:
        print("🌍 Connecting to Google Earth Engine...")
        ee.Initialize(project=GOOGLE_CLOUD_PROJECT)
    except Exception as e:
        print(f"❌ Auth Error: {e}"); return

    # Delhi Region
    REGION = ee.Geometry.Point([77.2090, 28.6139])

    conn = get_db_connection()
    if not conn: return
    cur = conn.cursor()
    
    cur.execute("SELECT station_id, latitude, longitude FROM stations")
    stations = cur.fetchall()
    print(f"📍 Targeting {len(stations)} ground stations...")

    # Look back 5 days
    now = datetime.now()
    start_date = (now - timedelta(days=5)).strftime('%Y-%m-%d')
    end_date = now.strftime('%Y-%m-%d')

    # Switch to NRTI (Near Real Time) for fresher data
    print("🛰️  Fetching Sentinel-5P NRTI (Real-Time) Data...")
    
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
        print(f"📸 Found NO2 Image from: {datetime.fromtimestamp(ts/1000)}")
    else:
        print("⚠️ No NO2 image found.")

    updated_count = 0
    
    # Check the first station specifically for debugging
    debug_station = stations[0]
    print(f"🔍 DEBUG: Checking values for station {debug_station[0]}...")

    for station in stations:
        s_id, lat, lon = station
        point = ee.Geometry.Point([lon, lat])
        
        # Extract NO2
        no2_val = 0.0
        if no2_img:
            data = no2_img.reduceRegion(reducer=ee.Reducer.mean(), geometry=point, scale=1000).getInfo()
            val = data.get('tropospheric_NO2_column_number_density')
            if val is not None: 
                no2_val = val * 1000000 

        # Extract SO2
        so2_val = 0.0
        if so2_img:
            data = so2_img.reduceRegion(reducer=ee.Reducer.mean(), geometry=point, scale=1000).getInfo()
            val = data.get('SO2_column_number_density')
            if val is not None: 
                so2_val = val * 1000000

        # Print debug for first station
        if s_id == debug_station[0]:
            print(f"   -> NO2 Value: {no2_val}")
            print(f"   -> SO2 Value: {so2_val}")

        # Update Database
        if no2_val is not None or so2_val is not None:
            try:
                # Update the LATEST record for this station
                cur.execute("""
                    UPDATE measurements 
                    SET no2_sat = %s, so2_sat = %s
                    WHERE station_id = %s 
                    AND timestamp = (
                        SELECT MAX(timestamp) FROM measurements WHERE station_id = %s
                    )
                """, (no2_val, so2_val, s_id, s_id))
                
                if cur.rowcount > 0:
                    updated_count += 1
            except Exception as e:
                print(f"SQL Error: {e}")

    conn.commit()
    conn.close()
    print(f"🚀 Fusion Complete: Updated {updated_count} stations.")

if __name__ == "__main__":
    fetch_satellite_data()