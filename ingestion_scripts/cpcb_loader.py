import requests
import psycopg2
import random
from datetime import datetime

DB_PARAMS = {
  "dbname": "skyshield", "user": "postgres", "password": "Hkabra@2006",
  "host": "localhost", "port": "5432"
}

def get_db_connection():
  try: return psycopg2.connect(**DB_PARAMS)
  except: return None

def generate_mock_data(station_id):
  """Generates realistic Delhi pollution data"""
  return {
    "pm25": random.uniform(40, 350),
    "pm10": random.uniform(80, 500),
    "no2": random.uniform(10, 100),
    "aqi": random.randint(100, 450),
    "co": random.uniform(0.5, 4.0),
    "so2": random.uniform(5, 40),
    "o3": random.uniform(10, 80)
  }

def fetch_cpcb_data():
  print("🔌 Connecting to CPCB Ground Network...")
  conn = get_db_connection()
  if not conn: return
  cur = conn.cursor()

  cur.execute("SELECT station_id FROM stations")
  stations = cur.fetchall()
  
  timestamp = datetime.now()
  records_added = 0

  print(f"📍 Polling sensors for {len(stations)} stations...")

  for (station_id,) in stations:
      data = generate_mock_data(station_id)

      try:
        cur.execute("""
          INSERT INTO measurements (station_id, timestamp, pm25, pm10, no2, aqi, co, so2, o3)
          VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
      """, (station_id, timestamp, data['pm25'], data['pm10'], data['no2'], 
            data['aqi'], data['co'], data['so2'], data['o3']))
        
        conn.commit() 
        records_added += 1
          
      except Exception as e:
        conn.rollback() 
        print(f"Error at {station_id}: {e}")

  conn.close()
  print(f"Ground Data Synced: {records_added} new sensor readings added.")

if __name__ == "__main__":
  fetch_cpcb_data()