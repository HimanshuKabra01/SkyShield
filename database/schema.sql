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