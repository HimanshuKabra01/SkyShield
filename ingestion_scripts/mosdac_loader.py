import h5py
import numpy as np
import psycopg2
import os
import glob
from scipy.spatial import cKDTree
from datetime import datetime

DATA_FOLDER = "satellite_data" 
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

def process_mosdac_aod():
    files = glob.glob(os.path.join(DATA_FOLDER, "*AOD*.h5"))
    if not files:
        print(f"⚠️ No AOD files found in {DATA_FOLDER}")
        return

    print(f"🛰️ Processing {len(files)} AOD files...")

    conn = get_db_connection()
    if not conn: return
    cur = conn.cursor()
    
    cur.execute("SELECT station_id, latitude, longitude FROM stations")
    stations = cur.fetchall()
    
    station_ids = [s[0] for s in stations]
    station_coords = np.array([[s[1], s[2]] for s in stations]) # [[Lat, Lon]]

    count = 0

    for file_path in files:
        try:
            filename = os.path.basename(file_path)
            print(f"📂 Reading {filename}...")

            with h5py.File(file_path, 'r') as f:
                
                lat_1d = f['latitude'][:]  
                lon_1d = f['longitude'][:]
                
                aod_grid = f['AOD'][0] 

                aod_grid = np.where(aod_grid == -999.0, np.nan, aod_grid)

                lat_grid, lon_grid = np.meshgrid(lat_1d, lon_1d, indexing='ij')

                mask = (lat_grid > 28.0) & (lat_grid < 29.0) & (lon_grid > 76.0) & (lon_grid < 78.0)
                
                local_lats = lat_grid[mask]
                local_lons = lon_grid[mask]
                local_aod = aod_grid[mask]

                if len(local_aod) == 0:
                    print("⚠️ No data pixels found over Delhi in this file.")
                    continue

                sat_points = np.column_stack((local_lats, local_lons))
                tree = cKDTree(sat_points)

                distances, indices = tree.query(station_coords, k=1)

                try:
                    date_part = filename.split('_')[1] # '22JAN2026'
                    file_date = datetime.strptime(date_part, "%d%b%Y").date()
                except:
                    file_date = datetime.today().date()

                saved_batch = 0
                for i, idx in enumerate(indices):
                    if distances[i] > 0.1: continue

                    val = local_aod[idx]
                    s_id = station_ids[i]

                    if not np.isnan(val):
                        cur.execute("""
                            UPDATE measurements 
                            SET aod = %s 
                            WHERE station_id = %s AND timestamp::date = %s
                        """, (float(val), s_id, file_date))
                        saved_batch += 1
                
                count += saved_batch
                print(f"✅ Enhanced {saved_batch} stations with AOD data.")

        except Exception as e:
            print(f"❌ Error processing {filename}: {e}")

    conn.commit()
    conn.close()
    print(f"🚀 Job Complete. Total Updates: {count}")

if __name__ == "__main__":
    process_mosdac_aod()