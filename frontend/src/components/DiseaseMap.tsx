import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";
import { AlertTriangle, Activity } from "lucide-react";

interface DiseaseReport {
  disease: string;
  lat: number;
  lon: number;
  risk: string;
  date: string;
}

const DiseaseMarker = ({ data }: { data: DiseaseReport }) => {
  const isHigh = data.risk === 'High';
  const color = isHigh ? "#ef4444" : "#f59e0b"; // Red vs Amber
  
  return (
    <CircleMarker
      center={[data.lat, data.lon]}
      radius={isHigh ? 20 : 12}
      pathOptions={{ color: color, fillColor: color, fillOpacity: 0.6, weight: 0 }}
    >
      <Popup className="custom-popup">
        <div className="bg-zinc-950 text-white p-2 rounded-md min-w-[120px]">
          <div className="flex items-center gap-2 mb-1">
             <Activity size={12} className={color === "#ef4444" ? "text-red-500" : "text-amber-500"} />
             <span className="font-bold text-xs">{data.disease}</span>
          </div>
          <p className="text-[10px] text-zinc-400">{data.date}</p>
        </div>
      </Popup>
    </CircleMarker>
  );
};

const AutoBounds = ({ points }: { points: DiseaseReport[] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length) {
      const bounds = points.map(p => [p.lat, p.lon] as [number, number]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
};

const DiseaseMap: React.FC = () => {
  const [reports, setReports] = useState<DiseaseReport[]>([]);

  useEffect(() => {
    api.get<DiseaseReport[]>("/disease_hotspots")
      .then((r) => setReports(r.data))
      .catch(err => console.error("Failed to load disease hotspots", err));
  }, []);

  return (
    <div className="w-full h-full min-h-[400px] rounded-3xl overflow-hidden border border-white/10 relative">
      <div className="absolute top-4 left-4 z-[500] bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
         <AlertTriangle size={14} className="text-red-400" />
         <span className="text-xs font-bold text-white uppercase tracking-wider">Live Disease Clusters</span>
      </div>
      
      <MapContainer center={[20, 78]} zoom={4} className="w-full h-full bg-[#111]">
        <TileLayer
           url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
           attribution='&copy; CARTO'
        />
        <AutoBounds points={reports} />
        {reports.map((r, i) => <DiseaseMarker key={i} data={r} />)}
      </MapContainer>
    </div>
  );
};

export default DiseaseMap;