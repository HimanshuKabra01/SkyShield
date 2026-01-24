import requests
import psycopg2
import time

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

def update_weather():
  print("Starting Weather Loader...")
  
  conn = get_db_connection()
  if not conn: return
  cur = conn.cursor()
  
  cur.execute("SELECT station_id, latitude, longitude FROM stations")
  stations = cur.fetchall()
  print(f"📍 Found {len(stations)} stations. Fetching weather for each...")

  count = 0
  
  for station in stations:
    s_id, lat, lon = station
    
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
    
    try:
      response = requests.get(url)
      data = response.json()
      
      if "current_weather" in data:
        temp = data["current_weather"]["temperature"]
        wind = data["current_weather"]["windspeed"]
        
        query = """
            UPDATE measurements 
            SET temp_c = %s, wind_speed_kmh = %s 
            WHERE station_id = %s 
            AND timestamp = (
                SELECT MAX(timestamp) FROM measurements WHERE station_id = %s
            )
        """
        cur.execute(query, (temp, wind, s_id, s_id))
        count += 1
          
    except Exception as e:
      print(f"⚠️ Error fetching weather for {s_id}: {e}")
        
    time.sleep(0.1)

  conn.commit()
  conn.close()
  print(f" Success! Updated weather for {count} stations.")

if __name__ == "__main__":
  update_weather()