import React, { useEffect, useState } from 'react'
import { 
  Wind, Activity, Home, User, Settings, Stethoscope, 
  Send, ShieldCheck, ShieldAlert, ThermometerSun, 
  Droplets, Zap, ChevronRight
} from 'lucide-react'
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts'
import api from '../services/api'

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
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  // Profile State
  const [profile, setProfile] = useState({
    asthma: false,
    pregnant: false,
    age: 'adult'
  })

  // Disease Predictor State
  const [symptoms, setSymptoms] = useState('')
  const [prediction, setPrediction] = useState<{ disease: string, confidence: number, advice: string } | null>(null)
  const [predicting, setPredicting] = useState(false)

  // --- 1. Load Data ---
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
          age: res.data.user_profile.age
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
        age_group: newProfile.age
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

  // --- Loading / Error States ---
  if (loading)
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-zinc-500 gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-r-2 border-purple-500/50 rounded-full animate-spin delay-150"></div>
        </div>
        <p className="animate-pulse tracking-[0.2em] text-xs uppercase font-medium bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
          Initializing Health Engine...
        </p>
      </div>
    )

  if (error || !data)
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-red-400 p-10 text-center">
        <div className="bg-red-500/5 p-10 rounded-3xl border border-red-500/10 backdrop-blur-xl">
           <ShieldAlert size={48} className="mx-auto mb-6 text-red-500/50" />
           <h2 className="text-xl font-bold mb-2 text-white">Connection Error</h2>
           <p className="text-zinc-500 text-sm max-w-xs mx-auto">{error || "Backend unavailable."}</p>
        </div>
      </div>
    )

  const { current_context, activities, forecast } = data
  const isHighRisk = current_context.risk_score > 5
  // Dynamic Theme Colors
  const themeColor = isHighRisk ? '#f43f5e' : '#10b981' // rose-500 vs emerald-500
  const themeText = isHighRisk ? 'text-rose-400' : 'text-emerald-400'
  const themeBg = isHighRisk ? 'bg-rose-500' : 'bg-emerald-500'

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 p-4 md:p-8 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 ${isHighRisk ? 'bg-rose-900' : 'bg-emerald-900'}`} />
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 bg-indigo-900" />
      </div>

      <div className="relative max-w-7xl mx-auto space-y-8">
        
        {/* --- HERO SECTION --- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[420px]">
          
          {/* Main Risk Card */}
          <div className="md:col-span-8 relative group">
            <div className={`absolute inset-0 bg-gradient-to-br ${isHighRisk ? 'from-rose-500/10 to-transparent' : 'from-emerald-500/10 to-transparent'} rounded-[2.5rem] blur-xl opacity-50 transition-all duration-700`} />
            
            <div className="relative h-full bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl">
              {/* Dynamic Glow Line */}
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${isHighRisk ? 'rose' : 'emerald'}-500/50 to-transparent opacity-50`} />

              <div className="flex justify-between items-start">
                <div className="space-y-2">
                   <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full border border-white/5 bg-white/5 backdrop-blur-md flex items-center gap-2`}>
                        <div className={`w-2 h-2 rounded-full ${themeBg} animate-pulse shadow-[0_0_10px_currentColor]`} />
                        <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Live Analysis</span>
                      </div>
                      {profile.asthma && (
                        <span className="px-3 py-1 rounded-full border border-rose-500/20 bg-rose-500/10 text-[10px] font-bold text-rose-300">
                          ASTHMA MODE
                        </span>
                      )}
                   </div>
                   <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                     Personal <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">Shield</span>
                   </h1>
                </div>

                <div className="text-right z-10">
                   <div className="flex items-center justify-end gap-1 mb-[-10px]">
                      <span className={`text-8xl md:text-9xl font-black tracking-tighter drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] ${themeText}`}>
                        {current_context.risk_score}
                      </span>
                      <span className="text-xl md:text-2xl font-bold text-zinc-700 self-end mb-4">/10</span>
                   </div>
                   <p className={`text-xs font-bold uppercase tracking-[0.3em] ${themeText} opacity-80`}>
                     Exposure Risk
                   </p>
                </div>
              </div>

              {/* Visualization Area (Abstract or Chart) */}
              <div className="grid grid-cols-3 gap-6 mt-12 md:mt-0">
                 {[
                   { label: 'Air Quality', val: current_context.aqi, unit: 'AQI', icon: Wind },
                   { label: 'Profile Sensitivity', val: `1x`, unit: 'FACTOR', icon: User },
                   { label: 'Prediction', val: 'Active', unit: 'AI MODEL', icon: Zap },
                 ].map((stat, i) => (
                   <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 backdrop-blur-md hover:bg-white/[0.06] transition-colors">
                      <div className="flex items-center justify-between mb-2 opacity-50">
                        <stat.icon size={16} />
                        <span className="text-[10px] font-bold tracking-widest uppercase">{stat.unit}</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{stat.val}</div>
                      <div className="text-xs text-zinc-500 font-medium">{stat.label}</div>
                   </div>
                 ))}
              </div>
            </div>
          </div>

          {/* Settings & Profile Card */}
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
                   {isEditing ? 'SAVE CHANGES' : 'EDIT PROFILE'}
                 </button>
               </div>

               <div className="space-y-3 flex-1">
                 {[
                    { label: 'Asthma Condition', key: 'asthma' },
                    { label: 'Pregnancy', key: 'pregnant' }
                 ].map((item) => (
                   <div 
                     key={item.key}
                     onClick={() => isEditing && updateProfile({ ...profile, [item.key]: !(profile as any)[item.key] })}
                     className={`group flex justify-between items-center p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                       (profile as any)[item.key]
                         ? 'bg-indigo-600/10 border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.1)]' 
                         : 'bg-black/20 border-white/5 hover:bg-white/5'
                     } ${!isEditing && 'cursor-default'}`}
                   >
                      <span className={`text-sm font-medium transition-colors ${
                        (profile as any)[item.key] ? 'text-indigo-300' : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}>
                        {item.label}
                      </span>
                      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${
                        (profile as any)[item.key] ? 'bg-indigo-500' : 'bg-zinc-800'
                      }`}>
                         <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                            (profile as any)[item.key] ? 'translate-x-4' : 'translate-x-0'
                         }`} />
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* --- AI SYMPTOM ANALYZER --- */}
          <div className="lg:col-span-4">
             <div className="h-full bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden group">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400">
                     <Stethoscope size={24} />
                   </div>
                   <div>
                     <h3 className="text-lg font-bold text-white">AI Diagnostix</h3>
                     <p className="text-xs text-indigo-300/70 font-mono uppercase tracking-wider">Powered by Neural Net</p>
                   </div>
                </div>

                <div className="flex-1 flex flex-col gap-4 relative z-10">
                   <div className="relative flex-1">
                      <textarea 
                        className="w-full h-full min-h-[140px] bg-black/20 p-5 rounded-2xl text-sm text-zinc-300 placeholder:text-zinc-700 border border-white/5 focus:border-indigo-500/50 focus:bg-indigo-900/5 outline-none transition-all resize-none leading-relaxed"
                        placeholder="Describe what you are feeling... (e.g., 'dry cough, itchy eyes, chest tightness')"
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                      />
                      <div className="absolute bottom-4 right-4 flex items-center gap-2">
                         <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">{symptoms.length} chars</span>
                      </div>
                   </div>

                   <button 
                     onClick={handleDiseasePrediction}
                     disabled={predicting || !symptoms}
                     className="group relative w-full py-4 rounded-xl font-bold text-sm text-white overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                   >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 transition-all group-hover:scale-105" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
                      <span className="relative flex items-center justify-center gap-2">
                        {predicting ? (
                          <>Processing <div className="w-2 h-2 bg-white rounded-full animate-ping" /></>
                        ) : (
                          <>Analyze Symptoms <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                        )}
                      </span>
                   </button>
                </div>

                {/* AI Result Card (Animated) */}
                {prediction && (
                   <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-indigo-950/30 border border-indigo-500/20 p-5 rounded-2xl relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                         <div className="flex justify-between items-start mb-2">
                            <h4 className="text-xl font-bold text-white">{prediction.disease}</h4>
                            <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                               {prediction.confidence}% Confidence
                            </span>
                         </div>
                         <p className="text-xs text-indigo-200/60 leading-relaxed">
                            {prediction.advice || "AI prediction based on symptom patterns. Consult a doctor for medical advice."}
                         </p>
                      </div>
                   </div>
                )}
             </div>
          </div>

          {/* --- ACTIVITY & FORECAST --- */}
          <div className="lg:col-span-8 flex flex-col gap-6">
             
             {/* 1. Activity Matrix */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activities.map((a, i) => {
                  const isActive = a.status === 'GO' || a.status === 'OPEN';
                  const isWarn = a.status === 'CAUTION' || a.status === 'MASK';
                  const isDanger = a.status === 'STOP' || a.status === 'AVOID' || a.status === 'CLOSE';
                  
                  let cardBorder = 'border-white/5';
                  let cardBg = 'bg-white/[0.02]';
                  let iconColor = 'text-zinc-400';
                  
                  if (isActive) { cardBorder = 'border-emerald-500/20'; cardBg = 'bg-emerald-500/5 hover:bg-emerald-500/10'; iconColor = 'text-emerald-400'; }
                  if (isWarn) { cardBorder = 'border-amber-500/20'; cardBg = 'bg-amber-500/5 hover:bg-amber-500/10'; iconColor = 'text-amber-400'; }
                  if (isDanger) { cardBorder = 'border-rose-500/20'; cardBg = 'bg-rose-500/5 hover:bg-rose-500/10'; iconColor = 'text-rose-400'; }

                  return (
                    <div key={i} className={`p-5 rounded-3xl border ${cardBorder} ${cardBg} backdrop-blur-sm transition-all duration-300 group`}>
                       <div className="flex justify-between items-start">
                          <div className="flex gap-4">
                             <div className={`p-3 rounded-2xl bg-black/20 ${iconColor} ring-1 ring-white/5`}>
                               {a.type === 'sport' && <Activity size={20} />}
                               {a.type === 'commute' && <Wind size={20} />}
                               {a.type === 'ventilation' && <Home size={20} />}
                             </div>
                             <div>
                               <h4 className="font-bold text-zinc-200 text-sm mb-1">{a.name}</h4>
                               <p className="text-xs text-zinc-500 leading-tight max-w-[200px]">{a.message}</p>
                             </div>
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                             isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                             isWarn ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                             'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}>
                            {a.status}
                          </span>
                       </div>
                    </div>
                  )
                })}
             </div>

             {/* 2. Forecast Chart (Sleek) */}
             <div className="flex-1 bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 relative">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-lg font-bold text-white flex items-center gap-2">
                     <ThermometerSun size={18} className="text-cyan-400"/> 12-Hour Forecast
                   </h3>
                   <div className="flex gap-4">
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                         <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Safe
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                         <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> Unsafe
                      </div>
                   </div>
                </div>

                <div className="h-[200px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecast.slice(0, 12)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                         <defs>
                            <linearGradient id="gradientRisk" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor={themeColor} stopOpacity={0.4}/>
                               <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                            </linearGradient>
                         </defs>
                         <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                         <XAxis 
                            dataKey="time" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }}
                            dy={15}
                         />
                         <YAxis hide domain={[0, 12]} />
                         <Tooltip 
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-xl">
                                    <p className="text-xs text-zinc-400 mb-1 font-mono">{label}</p>
                                    <p className="text-lg font-bold text-white">
                                      {payload[0].value} <span className="text-xs text-zinc-500 font-normal">RISK</span>
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                         />
                         <Area 
                            type="monotone" 
                            dataKey="risk_score" 
                            stroke={themeColor} 
                            strokeWidth={3}
                            fill="url(#gradientRisk)" 
                            animationDuration={1500}
                         />
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