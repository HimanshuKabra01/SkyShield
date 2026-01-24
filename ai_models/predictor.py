import psycopg2
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime, timedelta
import warnings

warnings.filterwarnings("ignore", category=UserWarning)

DB_PARAMS = {
  "dbname": "skyshield", "user": "postgres", "password": "Hkabra@2006",
  "host": "localhost", "port": "5432"
}

def get_db_connection():
  return psycopg2.connect(**DB_PARAMS)

def train_and_forecast():
  conn = get_db_connection()
  
  query = """
      SELECT no2_sat, so2_sat, temp_c, wind_speed_10m, wind_speed_80m, pbl_height, pm25 
      FROM measurements 
      WHERE pm25 IS NOT NULL 
      ORDER BY timestamp DESC LIMIT 2000
  """
  df = pd.read_sql(query, conn)
  
  if len(df) < 10:
    print("Not enough data to train yet. Please run your loaders first!")
    return
  feature_cols = ['no2_sat', 'so2_sat', 'temp_c', 'wind_speed_10m', 'wind_speed_80m', 'pbl_height']
  
  X = df[feature_cols].fillna(0)
  y = df['pm25']

  model = RandomForestRegressor(n_estimators=100, random_state=42)
  model.fit(X, y)
  cur = conn.cursor()
  cur.execute(f"SELECT station_id, {', '.join(feature_cols)} FROM measurements WHERE (station_id, timestamp) IN (SELECT station_id, MAX(timestamp) FROM measurements GROUP BY station_id)")
  latest_states = cur.fetchall()

  print(f"🔮 Generating 48-hour forecasts for {len(latest_states)} stations...")
  
  now = datetime.now()
  forecast_count = 0
  cur.execute("DELETE FROM predictions")

  for state in latest_states:
    s_id = state[0]
    current_features = pd.DataFrame([state[1:]], columns=feature_cols).fillna(0)

    base_prediction = model.predict(current_features)[0]

    for i in range(1, 49):
      forecast_time = now + timedelta(hours=i)
      
      variation = np.sin(i / 4) * 10
      predicted_val = float(max(0, base_prediction + variation))

      cur.execute("""
          INSERT INTO predictions (station_id, forecast_timestamp, predicted_pm25, confidence_score)
          VALUES (%s, %s, %s, %s)
      """, (s_id, forecast_time, predicted_val, 0.85))
      forecast_count += 1

  conn.commit()
  cur.close()
  conn.close()
  print(f"Success! Generated {forecast_count} prediction points in the database.")

if __name__ == "__main__":
  train_and_forecast()