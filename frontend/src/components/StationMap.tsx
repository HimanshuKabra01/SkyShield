import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { Wind, Activity, CloudFog, AlertTriangle, User, Layers } from 'lucide-react';

interface Station {
  station_id: string;
  name: string;
  latitude: number;
  longitude: number;
  pm25: number;
  pm10: number;
  no2: number | null;
  aod: number | null;
  aqi: number;
  temp_c: number | null;
  wind_speed_kmh: number | null;
  timestamp: string;
}

interface RiskLevel {
  color: string;
  label: string;
  radius: number;
  glow: number;
}

const MAP_CENTER: [number, number] = [28.6139, 77.2090];
const ZOOM_LEVEL = 11;

const StationMap: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [userMode, setUserMode] = useState<"standard" | "asthma" | "elderly">("standard");
  const [activeLayer, setActiveLayer] = useState<"pm25" | "no2" | "aod">("pm25");

  useEffect(() => {
    axios.get<Station[]>('http://127.0.0.1:5000/api/stations')
      .then(res => setStations(res.data))
      .catch(err => console.error("Error fetching stations:", err));
  }, []);

  const getRiskLevel = (val: number, type: string): RiskLevel => {
    let limit = 100;
    
    if (userMode === 'asthma') limit = 60; 
    if (userMode === 'elderly') limit = 80;

    let score = val;
    if (type === 'no2') score = val * 2; 
    if (type === 'aod') score = val * 200; 

    if (score > limit * 3) return { color: "#7f1d1d", label: "Hazardous", radius: 24, glow: 0.3 };
    if (score > limit * 2) return { color: "#ef4444", label: "Severe", radius: 20, glow: 0.25 };
    if (score > limit)     return { color: "#f97316", label: "Poor", radius: 16, glow: 0.2 };
    return { color: "#22c55e", label: "Good", radius: 10, glow: 0.1 };
  };

  return (
    <div className="h-screen w-full relative font-sans overflow-hidden bg-zinc-900">
      
      <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 w-80">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <Wind size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 leading-none tracking-tight">SkyShield</h1>
            <p className="text-[10px] text-blue-600 font-bold tracking-widest uppercase mt-1">AI Risk Intelligence</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 mb-2">
            <User size={12} /> Health Profile
          </label>
          <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-lg">
            {(['standard', 'asthma', 'elderly'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setUserMode(mode)}
                className={`text-xs py-1.5 capitalize rounded-md transition-all font-medium ${
                  userMode === mode 
                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          {userMode !== 'standard' && (
             <div className="mt-2 text-[10px] text-red-600 bg-red-50 border border-red-100 p-2 rounded flex items-center gap-2">
               <AlertTriangle size={14} />
               <span><b>Strict Mode:</b> Thresholds lowered.</span>
             </div>
          )}
        </div>
      </div>
      <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-xl border border-white/20 flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase text-center mb-1">Source</label>
        
        <button onClick={() => setActiveLayer('pm25')} className={`p-3 rounded-lg flex flex-col items-center w-20 transition-all ${activeLayer === 'pm25' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
          <Activity size={20} />
          <span className="text-[10px] font-bold mt-1">Ground</span>
        </button>

        <button onClick={() => setActiveLayer('no2')} className={`p-3 rounded-lg flex flex-col items-center w-20 transition-all ${activeLayer === 'no2' ? 'bg-purple-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
          <Layers size={20} />
          <span className="text-[10px] font-bold mt-1">NO₂ Sat</span>
        </button>

        <button onClick={() => setActiveLayer('aod')} className={`p-3 rounded-lg flex flex-col items-center w-20 transition-all ${activeLayer === 'aod' ? 'bg-orange-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
          <CloudFog size={20} />
          <span className="text-[10px] font-bold mt-1">AOD Sat</span>
        </button>
      </div>

      <MapContainer center={MAP_CENTER} zoom={ZOOM_LEVEL} style={{ height: "100%", width: "100%", background: "#1a1a1a" }} zoomControl={false}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        {stations.map((station) => {
          let val = station.pm25;
          if (activeLayer === 'no2') val = station.no2 || 0;
          if (activeLayer === 'aod') val = station.aod || 0;

          if (!val) return null;

          const risk = getRiskLevel(val, activeLayer);

          return (
            <React.Fragment key={station.station_id}>
              <CircleMarker center={[station.latitude, station.longitude]} radius={risk.radius * 2} 
                pathOptions={{ color: risk.color, fillColor: risk.color, fillOpacity: risk.glow, stroke: false }} />
              
              <CircleMarker center={[station.latitude, station.longitude]} radius={6}
                pathOptions={{ color: "#fff", weight: 2, fillColor: risk.color, fillOpacity: 1 }}>
                
                <Popup className="custom-popup">
                  <div className="p-1 min-w-[200px]">
                    <h3 className="font-bold text-gray-900">{station.name}</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                       <div><span className="text-gray-400 text-xs">PM2.5:</span> <b>{station.pm25}</b></div>
                       <div><span className="text-gray-400 text-xs">NO₂:</span> <b className="text-purple-600">{station.no2?.toFixed(1) || '--'}</b></div>
                       <div><span className="text-gray-400 text-xs">AOD:</span> <b className="text-orange-600">{station.aod?.toFixed(2) || '--'}</b></div>
                       <div><span className="text-gray-400 text-xs">Temp:</span> <b className="text-blue-500">{station.temp_c}°</b></div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default StationMap;