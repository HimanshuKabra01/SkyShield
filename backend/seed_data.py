import psycopg2
import os
from datetime import datetime, timedelta
import random

def get_db_connection():
    # Uses the same connection logic as your app
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    else:
        return psycopg2.connect(
            dbname="skyshield",
            user="postgres",
            password="Hkabra@2006", # Ensure this matches your local DB password
            host="localhost",
            port="5432"
        )

def seed_database():
    conn = get_db_connection()
    cur = conn.cursor()

    print("🌱 Seeding database with test data...")

    try:
      cur.execute("""
          INSERT INTO stations (station_id, name, latitude, longitude)
          VALUES ('STATION_001', 'Downtown Demo Station', 28.6139, 77.2090)
          ON CONFLICT (station_id) DO NOTHING;
      """)

      cur.execute("""
          INSERT INTO measurements (
              station_id, pm25, pm10, aqi, no2_sat, so2_sat, 
              temp_c, wind_speed_10m, wind_speed_80m, wind_dir, 
              pbl_height, timestamp
          )
          VALUES (
              'STATION_001', 185.5, 250.0, 310, 45.2, 12.5, 
              28.5, 2.5, 5.0, 180, 
              500, NOW()
          );
      """)

      now = datetime.now()
      values = []
      for i in range(12):
          future_time = now + timedelta(hours=i)
          predicted_pm25 = 180 + (i * 5) + random.uniform(-10, 10) 
          
          values.append(f"('STATION_001', '{future_time}', {predicted_pm25})")

      query = f"""
          INSERT INTO predictions (station_id, forecast_timestamp, predicted_pm25)
          VALUES {','.join(values)}
          ON CONFLICT (station_id, forecast_timestamp) DO NOTHING;
      """
      cur.execute(query)

      conn.commit()
      print("Database successfully seeded with STATION_001 and test data!")

    except Exception as e:
      print(f"Error seeding data: {e}")
      conn.rollback()
    finally:
      cur.close()
      conn.close()

if __name__ == '__main__':
  seed_database()