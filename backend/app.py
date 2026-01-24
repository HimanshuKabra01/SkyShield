from flask import Flask, jsonify
from flask_cors import CORS
import psycopg2

app = Flask(__name__)
CORS(app)

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
        print(f"Error connecting to DB: {e}")
        return None

# --- ROUTE 1: Holistic Station Data (Point 1) ---
@app.route('/api/stations', methods=['GET'])
def get_stations():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    cur = conn.cursor()
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
        stations.append({
            "station_id": row[0],
            "name": row[1],
            "latitude": row[2],
            "longitude": row[3],
            "pm25": row[4],
            "pm10": row[5],
            "aqi": row[6],
            "no2_sat": row[7],
            "so2_sat": row[8],
            "temp_c": row[9],
            "wind_speed_10m": row[10],
            "wind_speed_80m": row[11],
            "wind_dir": row[12],
            "pbl_height": row[13],
            "timestamp": row[14]
        })
    return jsonify(stations)

# --- ROUTE 2: Predictive Forecasts (Point 2) ---
@app.route('/api/predictions/<station_id>', methods=['GET'])
def get_predictions(station_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
        
    cur = conn.cursor()
    
    # Fetch future predictions sorted by time
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
        # Format: "14:00" for X-Axis, Value for Y-Axis
        data.append({
            "time": row[0].strftime("%H:%M"), 
            "value": round(row[1], 1)
        })
        
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, port=5000)