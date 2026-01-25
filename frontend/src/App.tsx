import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StationMap from './components/StationMap';
import PredictivePanel from './components/PredictivePanel';
import HotspotMap from './components/HotspotMap';
import api from './services/api';
import { BarChart3, Map as MapIcon, Zap } from 'lucide-react';

interface Station {
  station_id: string;
  name: string;
  aqi: number;
  likely_source?: string; // New Field
  health_advice?: string; // New Field
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('holistic');
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  useEffect(() => {
    api.get('/stations')
      .then(res => {
        setStations(res.data);
        if (res.data.length > 0) setSelectedStation(res.data[0]);
      })
      .catch(err => console.error("Error loading stations:", err));
  }, []);

  return (
    <div className="bg-zinc-950 h-screen overflow-hidden flex flex-col font-sans text-zinc-200">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 w-full relative overflow-hidden">
        {/* 1. HOLISTIC MAP */}
        {activeTab === 'holistic' && <StationMap />}
        
        {/* 2. PREDICTIVE PANEL */}
        {activeTab === 'predictive' && (
          <div className="h-full pt-20 px-6 pb-6 grid grid-cols-12 gap-6">
            
            {/* Sidebar List */}
            <div className="col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Select Station</h2>
              </div>
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {stations.map(s => (
                  <button 
                    key={s.station_id}
                    onClick={() => setSelectedStation(s)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all border group ${
                      selectedStation?.station_id === s.station_id 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' 
                      : 'border-transparent text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{s.name}</span>
                      {/* Show Source Icon in List too! */}
                      {s.likely_source?.includes('Traffic') && <span className="opacity-50 text-[10px]">🚗</span>}
                      {s.likely_source?.includes('Industrial') && <span className="opacity-50 text-[10px]">🏭</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Main Chart Area */}
            <div className="col-span-9 h-full">
              {selectedStation ? (
                <PredictivePanel stationId={selectedStation.station_id} stationName={selectedStation.name} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-700 border border-zinc-800 rounded-2xl bg-zinc-900/20">
                  <p className="text-sm font-black uppercase tracking-widest">Select a station to initialize AI Model</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. HOTSPOT MAP */}
        {activeTab === 'hotspots' && <HotspotMap />}
      </main>
    </div>
  );
};

export default App;