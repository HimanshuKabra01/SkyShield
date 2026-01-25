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
  if DATABASE_URL:
    return psycopg2.connect(DATABASE_URL)
  else:
    return psycopg2.connect(
      dbname="skyshield",
      user="postgres",
      password="Hkabra@2006", 
      host="localhost",
      port="5432"
    )

# --- 🚀 FEATURE: Pollution Source Fingerprinting ---
def analyze_source(pm25, no2, so2):
    """
    Determines the likely root cause of pollution by analyzing 
    the ratio of gases (NO2/SO2) to particulate matter (PM2.5).
    """
    if not pm25 or float(pm25) == 0: return "Unknown"
    
    # Safe conversion to floats
    pm25_val = float(pm25)
    no2_val = float(no2) if no2 is not None else 0.0
    so2_val = float(so2) if so2 is not None else 0.0

    # Ratios (Calibrated for Urban India)
    no2_ratio = no2_val / pm25_val
    so2_ratio = so2_val / pm25_val
    
    if so2_ratio > 0.15: 
        return "🏭 Industrial Plume"  # High Sulfur = Coal/Factory
    if no2_ratio > 0.35: 
        return "🚗 Vehicular Traffic" # High Nitrogen = Diesel/Petrol
    if pm25_val > 150 and no2_ratio < 0.2: 
        return "🌫️ Dust / Biomass"    # High PM, Low Gas = Dust/Crop Burning
    
    return "🏙️ Urban Mix"            # Standard City Smog

# --- 🚀 FEATURE: Personalized Health Advice ---
def get_health_advice(aqi):
    if not aqi: return "No Data"
    aqi_val = float(aqi)
    
    if aqi_val > 400: return "⛔ HAZARDOUS: Avoid ALL outdoor exertion. Windows shut."
    if aqi_val > 300: return "⚠️ SEVERE: Healthy people limit outdoor activity."
    if aqi_val > 200: return "😷 VERY POOR: Wear N95 mask. Sensitive groups stay inside."
    if aqi_val > 100: return "✋ POOR: Breathing discomfort for sensitive people."
    if aqi_val > 50:  return "😐 MODERATE: Unusually sensitive people should reduce exertion."
    return "✅ GOOD: Air quality is satisfactory. Enjoy the outdoors!"

@app.route('/api/stations', methods=['GET'])
def get_stations():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Fetch Latest Data for All Stations
        query = """
            SELECT 
                s.station_id, s.name, s.latitude, s.longitude,
                m.pm25, m.pm10, m.aqi,
                m.no2_sat, m.so2_sat,
                m.temp_c, m.wind_speed_10m, m.wind_speed_80m, m.wind_dir, m.pbl_height,
                m.timestamp
            FROM stations s
            JOIN measurements m ON s.station_id = m.station_id
            WHERE (m.station_id, m.timestamp) IN (
                SELECT station_id, MAX(timestamp) 
                FROM measurements 
                GROUP BY station_id
            );
        """
        cur.execute(query)
        rows = cur.fetchall()
        conn.close()

        stations = []
        for row in rows:
            # Extract raw values
            pm25 = row[4]
            aqi = row[6]
            no2 = row[7]
            so2 = row[8]
            
            # Run AI Analysis
            source = analyze_source(pm25, no2, so2)
            advice = get_health_advice(aqi)

            stations.append({
                "station_id": row[0],
                "name": row[1],
                "latitude": row[2],
                "longitude": row[3],
                "pm25": pm25,
                "pm10": row[5],
                "aqi": aqi,
                "no2_sat": no2,
                "so2_sat": so2,
                "temp_c": row[9],
                "wind_speed_10m": row[10],
                "wind_speed_80m": row[11],
                "wind_dir": row[12],
                "pbl_height": row[13],
                "timestamp": row[14],
                
                # New "Standout" Fields
                "likely_source": source,
                "health_advice": advice
            })
        return jsonify(stations)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/predictions/<station_id>', methods=['GET'])
def get_predictions(station_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT forecast_timestamp, predicted_pm25 
            FROM predictions 
            WHERE station_id = %s 
            ORDER BY forecast_timestamp ASC
        """, (station_id,))
        
        rows = cur.fetchall()
        conn.close()
        
        data = []
        for row in rows:
            data.append({
                "time": row[0].strftime("%H:%M"), 
                "value": round(float(row[1]), 1) # Ensure float
            })
            
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)