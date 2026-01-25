import h5py
import numpy as np
import psycopg2
import glob
import os
from datetime import datetime
from scipy.spatial import cKDTree
from dotenv import load_dotenv

load_dotenv()

DATA_FOLDER = "satellite_data/"

def get_db_connection():
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    return psycopg2.connect(
        dbname="skyshield", user="postgres", password="Hkabra@2006",
        host="localhost", port="5432"
    )

def process_mosdac_data():
    files = glob.glob(os.path.join(DATA_FOLDER, "*.h5"))
    if not files:
        print(f"⚠️ No MOSDAC .h5 files found in '{DATA_FOLDER}'. Skipping.")
        return

    print(f"📂 Found {len(files)} H5 files. Processing...")
    
    conn = get_db_connection()
    if not conn: return
    cur = conn.cursor()

    cur.execute("SELECT station_id, latitude, longitude FROM stations")
    stations = cur.fetchall()
    station_ids = [s[0] for s in stations]
    # Filter valid coords
    valid_stations = [s for s in stations if s[1] and s[2]]
    station_coords = np.array([[float(s[1]), float(s[2])] for s in valid_stations])
    valid_ids = [s[0] for s in valid_stations]

    if len(station_coords) == 0: return

    tree = cKDTree(station_coords)
    updates = 0

    for file_path in files:
        try:
            with h5py.File(file_path, 'r') as f:
                # Simplistic Key Search
                keys = list(f.keys())
                data_key = next((k for k in keys if "AOD" in k or "FOG" in k), None)
                
                if not data_key: continue
                
                # Mock Processing for structure (Real MOSDAC needs complex grid mapping)
                # Here we just acknowledge the file was read for the demo
                print(f"   -> Read {os.path.basename(file_path)} ({data_key})")
                
                # In a real scenario, you map the grid here. 
                # For now, we rely on Sentinel for satellite data.
        except Exception as e:
            print(f"Error reading {file_path}: {e}")

    conn.close()
    print("✅ MOSDAC processing check complete.")

if __name__ == "__main__":
    process_mosdac_data()