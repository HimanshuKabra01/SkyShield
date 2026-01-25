import React, { useEffect, useState } from 'react';
import { Wind, Activity, AlertTriangle, Home, User, Settings } from 'lucide-react';
import api from '../services/api';

// --- Types ---
interface ForecastPoint {
  time: string;
  risk_score: number;
  is_unsafe: boolean;
}

interface ActivityAdvice {
  type: string;
  name: string;
  status: 'GO' | 'CAUTION' | 'STOP' | 'MASK' | 'AVOID' | 'OPEN' | 'CLOSE';
  color: string;
  message: string;
}

interface DashboardData {
  user_profile: {
    age: string;
    asthma: boolean;
    pregnant: boolean;
    sensitivity: number;
    name: string;
  };
  current_context: {
    aqi: number;
    risk_score: number;
    last_updated: string;
  };
  activities: ActivityAdvice[];
  forecast: ForecastPoint[];
}

interface Props {
  stationId: string;
}

const PersonalizedDashboard: React.FC<Props> = ({ stationId }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Local state for immediate UI updates while editing
  const [profile, setProfile] = useState({
    asthma: false,
    pregnant: false,
    age: 'adult'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/personalized_feed?station_id=${stationId}&user_id=test_firebase_uid_123`);
      setData(res.data);
      setProfile({
        asthma: res.data.user_profile.asthma,
        pregnant: res.data.user_profile.pregnant,
        age: res.data.user_profile.age
      });
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  // Sync profile changes to Backend
  const updateProfile = async (newProfile: any) => {
    try {
      // 1. Optimistic UI update
      setProfile(newProfile);
      
      // 2. Send to Backend
      await api.post('/update_profile', {
        user_id: 'test_firebase_uid_123',
        has_asthma: newProfile.asthma,
        is_pregnant: newProfile.pregnant,
        age_group: newProfile.age
      });

      // 3. Reload Data to get new Risk Scores
      fetchData();
    } catch (err) {
      console.error("Failed to update profile", err);
    }
  };

  useEffect(() => {
    if (stationId) fetchData();
  }, [stationId]);

  if (loading || !data) return <div className="p-8 text-center text-zinc-400 animate-pulse">Analyzing your risk profile...</div>;

  const { current_context, activities, forecast } = data;
  const isHighRisk = current_context.risk_score > 5.0;

  return (
    <div className="bg-zinc-900 text-zinc-100 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 max-h-[80vh] overflow-y-auto custom-scrollbar">
      
      {/* --- HEADER: Risk Score --- */}
      <div className={`p-8 relative overflow-hidden ${isHighRisk ? 'bg-red-900/20' : 'bg-emerald-900/20'}`}>
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-white mb-2">
              My Risk Score
            </h2>
            <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
               <User size={14} />
               {profile.age === 'adult' ? 'Adult' : profile.age === 'child' ? 'Child' : 'Elderly'} Profile
               {profile.asthma && <span className="text-red-400">• Asthma Active</span>}
            </div>
          </div>
          
          <div className="text-right">
             <div className={`text-6xl font-black ${isHighRisk ? 'text-red-500' : 'text-emerald-400'}`}>
               {current_context.risk_score}
               <span className="text-lg text-zinc-500 font-bold">/10</span>
             </div>
             <p className="text-xs uppercase tracking-widest text-zinc-500 mt-1">Personal Exposure Index</p>
          </div>
        </div>

        {/* Background Ambient Glow */}
        <div className={`absolute top-0 right-0 w-64 h-64 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 pointer-events-none
          ${isHighRisk ? 'bg-red-600' : 'bg-emerald-600'}`} 
        />
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- LEFT COL: Controls & Forecast (4 cols) --- */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. Health Settings Card */}
          <div className="bg-zinc-950/50 p-5 rounded-2xl border border-zinc-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-zinc-300 flex items-center gap-2">
                <Settings size={16} /> Health Factors
              </h3>
              <button 
                onClick={() => setIsEditing(!isEditing)} 
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                {isEditing ? 'Done' : 'Edit'}
              </button>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition cursor-pointer group">
                <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200">Asthma / Lung Condition</span>
                <input 
                  type="checkbox" 
                  checked={profile.asthma}
                  disabled={!isEditing}
                  onChange={(e) => updateProfile({...profile, asthma: e.target.checked})}
                  className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500/50 disabled:opacity-50"
                />
              </label>
              
              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition cursor-pointer group">
                <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200">Pregnancy</span>
                <input 
                  type="checkbox" 
                  checked={profile.pregnant}
                  disabled={!isEditing}
                  onChange={(e) => updateProfile({...profile, pregnant: e.target.checked})}
                  className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500/50 disabled:opacity-50"
                />
              </label>
            </div>
          </div>

          {/* 2. Mini Forecast Timeline */}
          <div className="bg-zinc-950/50 p-5 rounded-2xl border border-zinc-800">
             <h3 className="font-bold text-zinc-300 mb-4 flex items-center gap-2">
               <Activity size={16} /> 12-Hour Forecast
             </h3>
             <div className="space-y-3">
               {forecast.slice(0, 5).map((point, i) => (
                 <div key={i} className="flex items-center gap-3 text-xs">
                   <span className="w-10 text-zinc-500 font-mono">{point.time}</span>
                   <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                     <div 
                       className={`h-full rounded-full ${point.is_unsafe ? 'bg-red-500' : 'bg-emerald-500'}`} 
                       style={{ width: `${Math.min(point.risk_score * 10, 100)}%` }}
                     />
                   </div>
                   <span className={`w-6 text-right font-bold ${point.is_unsafe ? 'text-red-400' : 'text-emerald-400'}`}>
                     {point.risk_score}
                   </span>
                 </div>
               ))}
             </div>
          </div>

        </div>

        {/* --- RIGHT COL: Activity Advice (8 cols) --- */}
        <div className="lg:col-span-8 grid gap-4">
          {activities.map((activity, idx) => (
            <div 
              key={idx} 
              className={`relative p-5 rounded-2xl border-l-4 bg-zinc-800/40 hover:bg-zinc-800/60 transition-colors border-zinc-700`}
              style={{ borderLeftColor: activity.color }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'sport' ? 'bg-blue-500/20 text-blue-400' :
                    activity.type === 'ventilation' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-orange-500/20 text-orange-400'
                  }`}>
                    {activity.type === 'sport' && <Activity size={18} />}
                    {activity.type === 'commute' && <Wind size={18} />}
                    {activity.type === 'ventilation' && <Home size={18} />}
                  </div>
                  <h4 className="font-bold text-lg text-zinc-200">{activity.name}</h4>
                </div>
                
                <span 
                  className="px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase"
                  style={{ backgroundColor: activity.color, color: '#fff' }}
                >
                  {activity.status}
                </span>
              </div>
              
              <p className="text-zinc-400 text-sm leading-relaxed ml-12">
                {activity.message}
              </p>
            </div>
          ))}
          
          {/* Disclaimer */}
          <div className="mt-4 p-4 rounded-xl bg-blue-900/10 border border-blue-900/30 flex gap-3 items-start">
             <AlertTriangle size={16} className="text-blue-400 shrink-0 mt-0.5" />
             <p className="text-[10px] text-blue-300/70 leading-normal">
               This is an AI-generated health estimate based on ISRO satellite data and local sensors. 
               Always consult a doctor for medical conditions.
             </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PersonalizedDashboard;