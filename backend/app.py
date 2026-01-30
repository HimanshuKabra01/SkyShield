import os
import pickle
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
from datetime import datetime

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

# ==========================================
# DISEASE PREDICTION MODEL LOADER
# ==========================================
disease_model = None
try:
    with open('disease_model.pkl', 'rb') as f:
        disease_model = pickle.load(f)
    print("✅ Disease prediction model loaded.")
except Exception as e:
    print(f"⚠️ Warning: Could not load disease model. {e}")


# ==========================================
# HELPER FUNCTIONS
# ==========================================
def get_user_profile(user_id):
    """Fetches user health data. Opens its own connection to be safe."""
    conn = get_db_connection()
    if not conn: return None
    
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT age_group, has_asthma, is_pregnant, sensitivity_score, display_name 
            FROM user_profiles WHERE user_id = %s
        """, (user_id,))
        row = cur.fetchone()
    except Exception as e:
        print(f"Error fetching profile: {e}")
        return None
    finally:
        conn.close()
    
    if row:
        return {
            "age": row[0],
            "asthma": row[1],
            "pregnant": row[2],
            "sensitivity": row[3],
            "name": row[4]
        }
    return {"age": "adult", "asthma": False, "pregnant": False, "sensitivity": 1.0, "name": "Guest"}

def calculate_risk_score(aqi, profile):
    """Returns a risk score (0-10) specific to the user"""
    if aqi is None: aqi = 0
    base_risk = (float(aqi) / 50.0)
    personal_risk = base_risk
    
    if profile['asthma']: personal_risk *= 1.5
    if profile['pregnant']: personal_risk *= 1.3
    if profile['age'] == 'child': personal_risk *= 1.2
    if profile['age'] == 'elderly': personal_risk *= 1.4
    personal_risk *= profile['sensitivity']
    
    return round(personal_risk, 1)

def get_activity_advice(risk_score):
    activities = []
    
    if risk_score < 3.0:
        activities.append({"type": "sport", "name": "Running / Sport", "status": "GO", "color": "green", "message": "Perfect conditions! Go for that PB."})
    elif risk_score < 5.0:
        activities.append({"type": "sport", "name": "Running / Sport", "status": "CAUTION", "color": "orange", "message": "Reduce intensity. Take breaks."})
    else:
        activities.append({"type": "sport", "name": "Running / Sport", "status": "STOP", "color": "red", "message": "Lung stress high. Use treadmill."})

    if risk_score < 5.0:
        activities.append({"type": "commute", "name": "Walking / Commute", "status": "GO", "color": "green", "message": "Safe to walk outside."})
    elif risk_score < 7.0:
        activities.append({"type": "commute", "name": "Walking / Commute", "status": "MASK", "color": "orange", "message": "Wear an N95 mask for trips >30 mins."})
    else:
        activities.append({"type": "commute", "name": "Walking / Commute", "status": "AVOID", "color": "red", "message": "Avoid all non-essential travel."})

    if risk_score < 4.0:
        activities.append({"type": "ventilation", "name": "Home Ventilation", "status": "OPEN", "color": "green", "message": "Open windows to let fresh air in."})
    else:
        activities.append({"type": "ventilation", "name": "Home Ventilation", "status": "CLOSE", "color": "red", "message": "Keep windows shut. Use purifier."})
        
    return activities

# ==========================================
# API ROUTES
# ==========================================

@app.route('/api/predict_disease', methods=['POST'])
def predict_disease():
    """
    Analyzes symptoms and returns the likely disease with a confidence score.
    """
    if not disease_model:
        return jsonify({"error": "Model not active. Check server logs."}), 503
        
    data = request.json
    symptoms = data.get('symptoms', '')
    
    if not symptoms or len(symptoms) < 3:
        return jsonify({"error": "Please describe your symptoms in more detail."}), 400
        
    try:
        # 1. Predict the disease
        prediction = disease_model.predict([symptoms])[0]
        
        # 2. Get confidence score (probability)
        probabilities = disease_model.predict_proba([symptoms])
        confidence = round(probabilities.max() * 100, 1)
        
        return jsonify({
            "disease": prediction,
            "confidence": confidence,
            "advice": "Please consult a doctor for a confirmed diagnosis."
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stations', methods=['GET'])
def get_stations():
    """Returns detailed station data including weather"""
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

@app.route('/api/predictions/<station_id>', methods=['GET'])
def get_predictions(station_id):
    """Returns PM2.5 predictions for charts"""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
        
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
            "value": round(row[1], 1)
        })
        
    return jsonify(data)

@app.route('/api/update_profile', methods=['POST'])
def update_profile():
    """Updates user health settings (Asthma, Age, etc.)"""
    data = request.json

    user_id = data.get('user_id', 'test_firebase_uid_123') 
    
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB failed"}), 500
    
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO user_profiles (user_id, display_name, age_group, has_asthma, is_pregnant, sensitivity_score)
            VALUES (%s, 'Test User', %s, %s, %s, %s)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                age_group = EXCLUDED.age_group,
                has_asthma = EXCLUDED.has_asthma,
                is_pregnant = EXCLUDED.is_pregnant,
                sensitivity_score = EXCLUDED.sensitivity_score;
        """, (user_id, data.get('age_group', 'adult'), data.get('has_asthma', False), 
              data.get('is_pregnant', False), data.get('sensitivity_score', 1.0)))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Profile updated"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/personalized_feed', methods=['GET'])
def get_personalized_feed():
    """Generates the Suitability Score and Advice Cards"""
    station_id = request.args.get('station_id')
    user_id = request.args.get('user_id', 'test_firebase_uid_123')

    profile = get_user_profile(user_id)
    if not profile:
        profile = {"age": "adult", "asthma": False, "pregnant": False, "sensitivity": 1.0, "name": "Guest"}

    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB failed"}), 500
    cur = conn.cursor()

    cur.execute("""
        SELECT aqi, pm25, timestamp 
        FROM measurements 
        WHERE station_id = %s 
        ORDER BY timestamp DESC LIMIT 1
    """, (station_id,))
    air_data = cur.fetchone()
    
    if not air_data:
        conn.close()
        return jsonify({"error": "No station data found"}), 404
        
    current_aqi = air_data[0] or 0
    risk_score = calculate_risk_score(current_aqi, profile)
    activities = get_activity_advice(risk_score)
    
    cur.execute("""
        SELECT forecast_timestamp, predicted_pm25 
        FROM predictions 
        WHERE station_id = %s 
        ORDER BY forecast_timestamp ASC LIMIT 12
    """, (station_id,))
    forecast_rows = cur.fetchall()
    conn.close()
    
    forecast_data = []
    for row in forecast_rows:
        pred_val = row[1] if row[1] is not None else 0
        pred_aqi = pred_val * 2 
        pred_risk = calculate_risk_score(pred_aqi, profile)
        
        forecast_data.append({
            "time": row[0].strftime("%H:%M"),
            "risk_score": pred_risk,
            "is_unsafe": pred_risk > 5.0
        })

    return jsonify({
        "user_profile": profile,
        "current_context": {
            "aqi": current_aqi,
            "risk_score": risk_score,
            "last_updated": air_data[2]
        },
        "activities": activities,
        "forecast": forecast_data
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)