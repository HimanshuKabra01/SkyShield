import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
import psycopg2

load_dotenv()

app = Flask(__name__)
CORS(app)

def get_db_connection():
  DATABASE_URL = os.environ.get('DATABASE_URL') 
  if DATABASE_URL: return psycopg2.connect(DATABASE_URL)
  return psycopg2.connect(dbname="skyshield", user="postgres", password="Hkabra@2006", host="localhost", port="5432")

# --- AI INSIGHT HELPERS ---
def analyze_source(pm25, no2, so2):
    """Determines the likely cause of pollution"""
    if not pm25: return "Unknown"
    
    # Normalize (Rough baselines for Delhi)
    no2_ratio = (no2 or 0) / pm25
    so2_ratio = (so2 or 0) / pm25
    
    if so2_ratio > 0.15: return "🏭 Industrial Plume"
    if no2_ratio > 0.4: return "🚗 Vehicular Traffic"
    if pm25 > 150 and no2_ratio < 0.2: return "🌫️ Dust / Biomass Burning"
    return "🏙️ Urban Mix"

def get_health_advice(aqi):
    if aqi > 300: return "⛔ HAZARDOUS: Avoid all outdoor exertion."
    if aqi > 200: return "⚠️ VERY UNHEALTHY: Wear N95 mask outside."
    if aqi > 100: return "✋ UNHEALTHY: Sensitive groups stay indoors."
    return "✅ GOOD: Ideal for outdoor activities."

@app.route('/api/stations', methods=['GET'])
def get_stations():
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Fetch Data
    query = """
        SELECT s.station_id, s.name, s.latitude, s.longitude,
               m.pm25, m.aqi, m.no2_sat, m.so2_sat, m.temp_c, 
               m.wind_speed_10m, m.wind_dir, m.pbl_height
        FROM stations s
        JOIN measurements m ON s.station_id = m.station_id
        WHERE (m.station_id, m.timestamp) IN (
            SELECT station_id, MAX(timestamp) FROM measurements GROUP BY station_id
        );
    """
    cur.execute(query)
    rows = cur.fetchall()
    conn.close()

    stations = []
    for row in rows:
        pm25 = row[4]
        no2 = row[6]
        so2 = row[7]
        aqi = row[5] or 0
        
        # Inject "Standout" Features
        likely_source = analyze_source(pm25, no2, so2)
        health_tip = get_health_advice(aqi)

        stations.append({
            "station_id": row[0],
            "name": row[1],
            "latitude": row[2],
            "longitude": row[3],
            "pm25": pm25,
            "aqi": aqi,
            "no2_sat": no2,
            "so2_sat": so2,
            "temp_c": row[8],
            "wind_speed_10m": row[9],
            "wind_dir": row[10],
            
            # New Advanced Fields
            "likely_source": likely_source,
            "health_advice": health_tip
        })
    return jsonify(stations)

@app.route('/api/predictions/<station_id>', methods=['GET'])
def get_predictions(station_id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT forecast_timestamp, predicted_pm25 
        FROM predictions WHERE station_id = %s 
        ORDER BY forecast_timestamp ASC
    """, (station_id,))
    rows = cur.fetchall()
    conn.close()
    
    data = []
    for row in rows:
        data.append({"time": row[0].strftime("%H:%M"), "value": round(row[1], 1)})
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, port=5000)