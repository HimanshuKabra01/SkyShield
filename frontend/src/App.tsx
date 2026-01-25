import React, { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react'; 
import Header from './components/Header';
import StationMap from './components/StationMap';
import PredictivePanel from './components/PredictivePanel';
import HotspotMap from './components/HotspotMap';
import PersonalizedDashboard from './components/PersonalizedDashboard';
import api from './services/api';

interface Station {
  station_id: string;
  name: string;
  aqi: number;
  likely_source?: string;
  health_advice?: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('holistic');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  
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
  useEffect(() => {
    if (isLoggedIn) setShowDashboard(true);
  }, [isLoggedIn]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-zinc-950 text-zinc-200 font-sans selection:bg-indigo-500/30">
      
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isLoggedIn={isLoggedIn}
        onLoginToggle={() => {
          setIsLoggedIn(!isLoggedIn);
          setShowDashboard(!isLoggedIn); 
        }}
      />
      
      <main className="relative h-full w-full">
        {isLoggedIn && showDashboard && selectedStation && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
             <div 
               className="absolute inset-0 bg-black/60 backdrop-blur-md" 
               onClick={() => setShowDashboard(false)} 
             />
             <div className="relative w-full max-w-6xl max-h-full flex flex-col z-10 pointer-events-none">
                <div className="flex justify-end mb-4 pointer-events-auto">
                  <button 
                    onClick={() => setShowDashboard(false)}
                    className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900/50 hover:bg-zinc-800/80 text-zinc-300 hover:text-white text-xs font-bold tracking-wider uppercase border border-white/10 backdrop-blur-md transition-all shadow-lg"
                  >
                    <span>Minimize</span>
                    <X size={14} className="group-hover:rotate-90 transition-transform" />
                  </button>
                </div>
                <div className="pointer-events-auto overflow-hidden rounded-3xl shadow-2xl shadow-black/50">
                   <PersonalizedDashboard stationId={selectedStation.station_id} />
                </div>
             </div>
          </div>
        )}
        {isLoggedIn && !showDashboard && (
           <button 
             onClick={() => setShowDashboard(true)}
             className="absolute bottom-8 right-8 z-[1400] group flex items-center gap-3 bg-zinc-900/80 hover:bg-zinc-800 text-white pl-5 pr-4 py-3 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-md transition-all hover:scale-105"
           >
             <span className="font-bold text-xs uppercase tracking-widest">My Dashboard</span>
             <div className="bg-indigo-500 rounded-full p-1.5 group-hover:bg-indigo-400 transition-colors">
               <ChevronRight size={14} />
             </div>
           </button>
        )}

        <div className={`absolute inset-0 transition-opacity duration-500 ${activeTab === 'holistic' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
           <StationMap />
        </div>
        
        {activeTab === 'predictive' && (
          <div className="relative z-20 h-full w-full pt-24 px-6 pb-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="col-span-1 md:col-span-3 h-full overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md shadow-xl flex flex-col">
              <div className="p-5 border-b border-white/5 bg-white/5">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Select Station</h2>
              </div>
              
              <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
                {stations.map(s => (
                  <button 
                    key={s.station_id}
                    onClick={() => setSelectedStation(s)}
                    className={`group w-full text-left px-4 py-3 rounded-xl transition-all duration-300 border ${
                      selectedStation?.station_id === s.station_id 
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-[0_0_20px_rgba(79,70,229,0.2)]' 
                      : 'border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-200 hover:border-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold tracking-wide">{s.name}</span>
                      <div className="flex gap-1">
                        {s.likely_source?.includes('Traffic') && <span className="text-[10px] grayscale group-hover:grayscale-0 transition-all">🚗</span>}
                        {s.likely_source?.includes('Industrial') && <span className="text-[10px] grayscale group-hover:grayscale-0 transition-all">🏭</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
      
            <div className="col-span-1 md:col-span-9 h-full min-h-0">
              {selectedStation ? (
                <PredictivePanel stationId={selectedStation.station_id} stationName={selectedStation.name} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 border border-white/5 rounded-2xl bg-zinc-900/20 backdrop-blur-sm">
                  <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Select a station to initialize AI Model</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className={`absolute inset-0 transition-opacity duration-500 ${activeTab === 'hotspots' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
           <HotspotMap />
        </div>

      </main>
    </div>
  );
};

export default App;