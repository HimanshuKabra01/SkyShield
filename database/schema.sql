CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE stations (
  station_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),                  
  city VARCHAR(50),                   
  state VARCHAR(50),                  
  latitude FLOAT,                     
  longitude FLOAT,                    
  location GEOMETRY(Point, 4326)
);

CREATE TABLE measurements (
  id SERIAL PRIMARY KEY,
  station_id VARCHAR(50) REFERENCES stations(station_id),
  timestamp TIMESTAMP,
  pm25 FLOAT,       
  pm10 FLOAT,       
  no2 FLOAT,        
  so2 FLOAT,        
  aqi INT,
  UNIQUE(station_id, timestamp)
);

CREATE TABLE user_profiles (
  user_id VARCHAR(128) PRIMARY KEY,
  display_name VARCHAR(100),
  
  age_group VARCHAR(20) CHECK (age_group IN ('child', 'adult', 'elderly')),
  
  has_asthma BOOLEAN DEFAULT FALSE,
  has_bronchitis BOOLEAN DEFAULT FALSE,
  has_cardio_issues BOOLEAN DEFAULT FALSE,
  is_pregnant BOOLEAN DEFAULT FALSE,
  is_smoker BOOLEAN DEFAULT FALSE,
  
  sensitivity_score FLOAT DEFAULT 1.0,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO user_profiles (user_id, display_name, age_group, has_asthma, sensitivity_score) 
VALUES ('test_firebase_uid_123', 'Test User', 'adult', TRUE, 1.5)
ON CONFLICT (user_id) DO NOTHING;