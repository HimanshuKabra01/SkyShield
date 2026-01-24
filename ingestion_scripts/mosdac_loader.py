import h5py
import numpy as np
import psycopg2
import glob
import os
from datetime import datetime
from scipy.spatial import cKDTree
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    
    return psycopg2.connect(
        dbname="skyshield",
        user="postgres",
        password="Hkabra@2006",
        host="localhost",
        port="5432"
    )

DATA_FOLDER = "satellite_data/"

def get_dataset_key(f, possible_keys):
    """Helper to find a key that exists in the H5 file (case-insensitive check)"""
    file_keys = list(f.keys())
    for key in possible_keys:
        if key in f: return key
        for file_key in file_keys:
            if key.lower() == file_key.lower(): return file_key
    return None

def process_mosdac_data():
    CONFIGS = {
        "AOD": {"keyword": "AOD", "h5_keys": ["AOD", "aod", "Kalpana_AOD"], "db_col": "aod"},
        "FOG": {"keyword": "FOG", "h5_keys": ["Fog_Index", "FOG", "fog_index", "FOG_INTENSITY"], "db_col": "fog"}, 
        "TPW": {"keyword": "TPW", "h5_keys": ["TPW", "tpw"], "db_col": "tpw"}
    }

    files = glob.glob(os.path.join(DATA_FOLDER, "*.h5"))
    if not files:
        print(f"⚠️ No H5 files found in {DATA_FOLDER}")
        return

    conn = get_db_connection()
    if not conn: return
    cur = conn.cursor()

    cur.execute("SELECT station_id, latitude, longitude FROM stations")
    stations = cur.fetchall()
    station_ids = [s[0] for s in stations]
    station_coords = np.array([[s[1], s[2]] for s in stations])

    total_updates = 0

    for file_path in files:
        filename = os.path.basename(file_path)
        
        config = next((cfg for key, cfg in CONFIGS.items() if key in filename.upper()), None)
        if not config: continue

        print(f"📂 Processing {config['keyword']} file: {filename}...")

        try:
            with h5py.File(file_path, 'r') as f:
                lat_key = get_dataset_key(f, ['Latitude', 'LAT', 'lat', 'LATITUDE', 'Y'])
                lon_key = get_dataset_key(f, ['Longitude', 'LON', 'lon', 'LONGITUDE', 'X'])
                
                if not lat_key or not lon_key:
                    print(f"⚠️ Skipping {filename}: Could not find Lat/Lon keys. Available keys: {list(f.keys())}")
                    continue

                data_key = get_dataset_key(f, config['h5_keys'])
                if not data_key:
                    print(f"⚠️ Skipping {filename}: Could not find data key (expected {config['h5_keys']}). Available keys: {list(f.keys())}")
                    continue

                lat_1d = f[lat_key][:]
                lon_1d = f[lon_key][:]
                
                if np.max(lat_1d) < 5 or np.max(lon_1d) < 5:
                     print(f"⚠️ Warning: {filename} coordinates look like radians/scan angles (Max Y: {np.max(lat_1d)}), skipping for safety.")
                     continue
                data_obj = f[data_key]
                if len(data_obj.shape) == 2:
                    data_grid = data_obj[:]
                elif len(data_obj.shape) == 3:
                    data_grid = data_obj[0]
                else:
                    data_grid = data_obj[:]

                data_grid = np.where(data_grid == -999.0, np.nan, data_grid)

                # Create Grid
                lat_grid, lon_grid = np.meshgrid(lat_1d, lon_1d, indexing='ij')
                
                # Optimization: Filter to India/Delhi bounds
                mask = (lat_grid > 8.0) & (lat_grid < 37.0) & (lon_grid > 68.0) & (lon_grid < 97.0)
                
                local_data = data_grid[mask]
                if len(local_data) == 0: continue

                local_coords = np.column_stack((lat_grid[mask], lon_grid[mask]))

                tree = cKDTree(local_coords)
                distances, indices = tree.query(station_coords, k=1)

                try:
                    date_part = filename.split('_')[1] 
                    file_date = datetime.strptime(date_part, "%d%b%Y").date()
                except:
                    file_date = datetime.today().date()

                updates = 0
                for i, idx in enumerate(indices):
                    if distances[i] > 0.05: continue 
                    
                    val = local_data[idx]
                    if not np.isnan(val):
                        query = f"UPDATE measurements SET {config['db_col']} = %s WHERE station_id = %s AND timestamp::date = %s"
                        cur.execute(query, (float(val), station_ids[i], file_date))
                        updates += 1
                
                total_updates += updates
                if updates > 0:
                     print(f"✅ Updated {updates} stations with {config['keyword']}.")

        except Exception as e:
            print(f"❌ Error processing {filename}: {e}")

    conn.commit()
    conn.close()
    print(f"🚀 Job Complete. Total Updates: {total_updates}")

if __name__ == "__main__":
    process_mosdac_data()