import psycopg2
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime, timedelta
import os
import warnings
from dotenv import load_dotenv

load_dotenv()
warnings.filterwarnings("ignore", category=UserWarning)

def get_db_connection():
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    return psycopg2.connect(
        dbname="skyshield", user="postgres", password="Hkabra@2006",
        host="localhost", port="5432"
    )

def train_and_forecast():
    conn = get_db_connection()
    
    print("🧠 Training AI Model...")
    
    # Fetch recent data
    query = """
        SELECT no2_sat, so2_sat, temp_c, wind_speed_10m, wind_speed_80m, pbl_height, pm25 
        FROM measurements 
        WHERE pm25 IS NOT NULL 
        ORDER BY timestamp DESC LIMIT 10000
    """
    df = pd.read_sql(query, conn)
    
    if len(df) < 10:
        print("⚠️ Not enough data to train. Run the CPCB/Weather loaders first!")
        return
        
    feature_cols = ['no2_sat', 'so2_sat', 'temp_c', 'wind_speed_10m', 'wind_speed_80m', 'pbl_height']
    
    X = df[feature_cols].fillna(0)
    y = df['pm25']

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Get latest conditions for ALL stations
    cur = conn.cursor()
    cur.execute(f"""
        SELECT station_id, {', '.join(feature_cols)} 
        FROM measurements 
        WHERE (station_id, timestamp) IN (
            SELECT station_id, MAX(timestamp) FROM measurements GROUP BY station_id
        )
    """)
    latest_states = cur.fetchall()

    print(f"🔮 Forecasting for {len(latest_states)} stations...")
    
    now = datetime.now()
    forecast_count = 0
    cur.execute("DELETE FROM predictions")

    for state in latest_states:
        s_id = state[0]
        # Create a mini-dataframe for prediction
        current_features = pd.DataFrame([state[1:]], columns=feature_cols).fillna(0)

        base_prediction = model.predict(current_features)[0]

        for i in range(1, 49): # 48 Hour Forecast
            forecast_time = now + timedelta(hours=i)
            
            # Add Diurnal Variation (Simulation logic)
            # Pollution typically peaks at night/early morning and drops in afternoon
            hour_modifier = np.sin((forecast_time.hour - 6) * np.pi / 12) * 15
            
            predicted_val = float(max(10, base_prediction - hour_modifier))

            cur.execute("""
                INSERT INTO predictions (station_id, forecast_timestamp, predicted_pm25, confidence_score)
                VALUES (%s, %s, %s, %s)
            """, (s_id, forecast_time, predicted_val, 0.85))
            forecast_count += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"✅ Success! Generated {forecast_count} prediction points.")

if __name__ == "__main__":
    train_and_forecast()