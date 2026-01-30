import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Settings, Stethoscope, 
  ShieldAlert, ThermometerSun
} from 'lucide-react'
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts'
import api from '../services/api'

// --- NEW IMPORTS ---
import Header from '../components/Header'
import SeasonalWidget from '../components/SeasonalWidget'
import DiseaseMap from '../components/DiseaseMap'

// --- Interfaces ---
interface ForecastPoint {
  time: string
  risk_score: number
  is_unsafe: boolean
}

interface ActivityAdvice {
  type: string
  name: string
  status: 'GO' | 'CAUTION' | 'STOP' | 'MASK' | 'AVOID' | 'OPEN' | 'CLOSE'
  color: string
  message: string
}

interface DashboardData {
  user_profile: {
    age: string
    asthma: boolean
    pregnant: boolean
    sensitivity: number
    name: string
  }
  current_context: {
    aqi: number
    risk_score: number
    last_updated: string
  }
  activities: ActivityAdvice[]
  forecast: ForecastPoint[]
}

const PersonalHealth: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  // Profile State
  const [profile, setProfile] = useState({
    asthma: false,
    pregnant: false,
    age: 'adult',
    sensitivity: 1.0 
  })

  // Disease Predictor State
  const [symptoms, setSymptoms] = useState('')
  const [prediction, setPrediction] = useState<{ disease: string, confidence: number, advice: string } | null>(null)
  const [predicting, setPredicting] = useState(false)

  // --- Load Data ---
  useEffect(() => {
    const initDashboard = async () => {
      try {
        setLoading(true)
        const stationRes = await api.get('/stations')
        const stations = stationRes.data
        
        if (!stations || stations.length === 0) {
          setError("No stations found.")
          setLoading(false)
          return
        }

        const activeStationId = stations[0].station_id
        const res = await api.get(
          `/personalized_feed?station_id=${activeStationId}&user_id=test_firebase_uid_123`
        )
        
        setData(res.data)
        setProfile({
          asthma: res.data.user_profile.asthma,
          pregnant: res.data.user_profile.pregnant,
          age: res.data.user_profile.age,
          sensitivity: res.data.user_profile.sensitivity
        })
        
      } catch (err) {
        console.error("Failed to load dashboard", err)
        setError("Could not load health data. Please check your connection.")
      } finally {
        setLoading(false)
      }
    }

    initDashboard()
  }, [])

  // --- Update Profile ---
  const updateProfile = async (newProfile: any) => {
    try {
      setProfile(newProfile)
      await api.post('/update_profile', {
        user_id: 'test_firebase_uid_123',
        has_asthma: newProfile.asthma,
        is_pregnant: newProfile.pregnant,
        age_group: newProfile.age,
        sensitivity_score: newProfile.sensitivity 
      })
    } catch (err) {
      console.error("Failed to update profile", err)
    }
  }

  // --- Predict Disease ---
  const handleDiseasePrediction = async () => {
    if (!symptoms) return
    try {
      setPredicting(true)
      const res = await api.post('/predict_disease', { symptoms })
      setPrediction(res.data)
    } catch (err) {
      alert("Could not analyze symptoms. Please try again.")
    } finally {
      setPredicting(false)
    }
  }

  // --- Header Navigation Handler ---
  // When a user clicks a tab in the header, we redirect them to Home
  const handleTabChange = (tab: string) => {
    navigate('/', { state: { tab } });
  };

  if (loading) return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-zinc-500 gap-6">
        <div className="w-16 h-16 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
        <p className="animate-pulse tracking-[0.2em] text-xs uppercase font-medium">Initializing Health Engine...</p>
      </div>
  )

  if (error || !data) return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-red-400 p-10 text-center">
        <div className="bg-red-500/5 p-10 rounded-3xl border border-red-500/10 backdrop-blur-xl">
           <ShieldAlert size={48} className="mx-auto mb-6 text-red-500/50" />
           <h2 className="text-xl font-bold mb-2 text-white">Connection Error</h2>
           <p className="text-zinc-500 text-sm max-w-xs mx-auto">{error || "Backend unavailable."}</p>
        </div>
      </div>
  )

  const { current_context, forecast } = data
  const isHighRisk = current_context.risk_score > 5
  const themeColor = isHighRisk ? '#f43f5e' : '#10b981'

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* --- 1. GLOBAL HEADER --- */}
      <Header 
        activeTab="" // No active tab highlighting on this page
        setActiveTab={handleTabChange}
        isLoggedIn={true}
        onLoginToggle={() => {}}
      />

      {/* --- MAIN CONTENT (Padding added for fixed header) --- */}
      <div className="pt-24 px-4 md:px-8 pb-12 max-w-7xl mx-auto space-y-8">
        
        {/* HERO SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[420px]">
          <div className="md:col-span-8 relative group">
            <div className={`absolute inset-0 bg-gradient-to-br ${isHighRisk ? 'from-rose-500/10 to-transparent' : 'from-emerald-500/10 to-transparent'} rounded-[2.5rem] blur-xl opacity-50`} />
            <div className="relative h-full bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                   <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full border border-white/5 bg-white/5 backdrop-blur-md flex items-center gap-2`}>
                        <div className={`w-2 h-2 rounded-full ${isHighRisk ? 'bg-rose-500' : 'bg-emerald-500'} animate-pulse`} />
                        <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Live Analysis</span>
                      </div>
                      {profile.asthma && <span className="px-3 py-1 rounded-full border border-rose-500/20 bg-rose-500/10 text-[10px] font-bold text-rose-300">ASTHMA MODE</span>}
                   </div>
                   <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                     Personal <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">Shield</span>
                   </h1>
                </div>
                <div className="text-right z-10">
                   <div className="flex items-center justify-end gap-1 mb-[-10px]">
                      <span className={`text-8xl md:text-9xl font-black tracking-tighter ${isHighRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {current_context.risk_score}
                      </span>
                      <span className="text-xl md:text-2xl font-bold text-zinc-700 self-end mb-4">/10</span>
                   </div>
                   <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500 opacity-80">Exposure Risk</p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 flex flex-col gap-6">
            <div className="flex-1 bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                   <Settings size={18} className="text-indigo-400"/> Parameters
                 </h3>
                 <button 
                   onClick={() => setIsEditing(!isEditing)}
                   className="text-[10px] font-bold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-all border border-white/5 hover:border-white/20"
                 >
                   {isEditing ? 'SAVE' : 'EDIT'}
                 </button>
               </div>
               <div className="space-y-3 flex-1">
                 {[{ label: 'Asthma Condition', key: 'asthma' }, { label: 'Pregnancy', key: 'pregnant' }].map((item) => (
                   <div 
                     key={item.key}
                     onClick={() => isEditing && updateProfile({ ...profile, [item.key]: !(profile as any)[item.key] })}
                     className={`flex justify-between items-center p-4 rounded-2xl border transition-all cursor-pointer ${
                       (profile as any)[item.key] ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-black/20 border-white/5'
                     } ${!isEditing && 'cursor-default'}`}
                   >
                      <span className={`text-sm font-medium ${ (profile as any)[item.key] ? 'text-indigo-300' : 'text-zinc-500' }`}>{item.label}</span>
                      <div className={`w-4 h-4 rounded-full border ${ (profile as any)[item.key] ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-700' }`} />
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* --- GRID LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: AI & Seasonal */}
          <div className="lg:col-span-4 space-y-6">
             {/* 2. SEASONAL WIDGET (Separate Component) */}
             <SeasonalWidget />

             {/* AI Symptom Checker */}
             <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400"><Stethoscope size={24} /></div>
                   <div>
                     <h3 className="text-lg font-bold text-white">AI Diagnostix</h3>
                     <p className="text-xs text-indigo-300/70 font-mono uppercase">Neural Net</p>
                   </div>
                </div>
                <div className="relative z-10 space-y-4">
                   <textarea 
                      className="w-full h-32 bg-black/20 p-5 rounded-2xl text-sm text-zinc-300 border border-white/5 focus:border-indigo-500/50 outline-none resize-none"
                      placeholder="Describe symptoms..."
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                   />
                   <button 
                     onClick={handleDiseasePrediction}
                     disabled={predicting || !symptoms}
                     className="w-full py-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-[1.02] transition-all disabled:opacity-50"
                   >
                      {predicting ? 'Processing...' : 'Analyze Symptoms'}
                   </button>
                   {prediction && (
                      <div className="mt-4 p-5 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl">
                         <h4 className="text-xl font-bold text-white mb-1">{prediction.disease}</h4>
                         <p className="text-xs text-indigo-200/60">{prediction.advice}</p>
                      </div>
                   )}
                </div>
             </div>
          </div>

          {/* RIGHT: Stats, Map & Forecast */}
          <div className="lg:col-span-8 flex flex-col gap-6">
             
             {/* 3. DISEASE MAP (Separate Component) */}
             <div className="h-[400px]">
                <DiseaseMap />
             </div>

             {/* Forecast Chart */}
             <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 h-[280px]">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-bold text-white flex gap-2"><ThermometerSun size={18} className="text-cyan-400"/> 12-Hour Forecast</h3>
                </div>
                <div className="h-[180px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecast.slice(0, 12)}>
                         <defs>
                            <linearGradient id="gradientRisk" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor={themeColor} stopOpacity={0.4}/>
                               <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                            </linearGradient>
                         </defs>
                         <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                         <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} dy={15} />
                         <YAxis hide domain={[0, 12]} />
                         <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', color: '#fff' }} />
                         <Area type="monotone" dataKey="risk_score" stroke={themeColor} strokeWidth={3} fill="url(#gradientRisk)" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default PersonalHealth