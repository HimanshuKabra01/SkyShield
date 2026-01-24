from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
import psycopg2.extras

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
    conn = psycopg2.connect(**DB_PARAMS)
    return conn
  except Exception as e:
    print(f"DB Error: {e}")
    return None
  
@app.route('/')
def home():
  return jsonify({"message": "SkyShield API is Online!", "status": "active"})

@app.route('/api/stations', methods=['GET'])
def get_stations():
  """Returns all stations with their latest air quality data (Includes AOD!)"""
  conn = get_db_connection()
  if not conn: return jsonify({"error": "Database error"}), 500
  
  cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
  
  query = """
      SELECT 
          s.station_id, s.name, s.latitude, s.longitude, 
          m.pm25, m.pm10, m.no2, m.aod, m.aqi, m.temp_c, m.wind_speed_kmh,
          m.timestamp
      FROM stations s
      JOIN measurements m ON s.station_id = m.station_id
      WHERE m.timestamp = (
          SELECT MAX(timestamp) FROM measurements WHERE station_id = s.station_id
      )
  """
  
  try:
    cur.execute(query)
    data = cur.fetchall()
    return jsonify(data)
  except Exception as e:
    return jsonify({"error": str(e)}), 500
  finally:
    cur.close()
    conn.close()

@app.route('/api/history/<station_id>', methods=['GET'])
def get_history(station_id):
  conn = get_db_connection()
  cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

  query = """
        SELECT timestamp, pm25, no2, aqi 
        FROM measurements 
        WHERE station_id = %s 
        ORDER BY timestamp DESC 
        LIMIT 24
    """
  
  cur.execute(query, (station_id,))
  data = cur.fetchall()

  cur.close()
  conn.close()
  return jsonify(data)

if __name__ == '__main__':
  print("Starting Skyshield on port 5000...")
  app.run(debug=True, port=5000)