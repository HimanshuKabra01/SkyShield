import React, { useEffect, useState } from 'react'
import { Wind, Activity, AlertTriangle, Home, User, Settings } from 'lucide-react'
import api from '../services/api'

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

interface Props {
  stationId: string
}

const PersonalizedDashboard: React.FC<Props> = ({ stationId }) => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  const [profile, setProfile] = useState({
    asthma: false,
    pregnant: false,
    age: 'adult'
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get(
        `/personalized_feed?station_id=${stationId}&user_id=test_firebase_uid_123`
      )
      setData(res.data)
      setProfile({
        asthma: res.data.user_profile.asthma,
        pregnant: res.data.user_profile.pregnant,
        age: res.data.user_profile.age
      })
    } catch (err) {
      console.error("Failed to load dashboard", err)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (newProfile: any) => {
    try {
      setProfile(newProfile)
      await api.post('/update_profile', {
        user_id: 'test_firebase_uid_123',
        has_asthma: newProfile.asthma,
        is_pregnant: newProfile.pregnant,
        age_group: newProfile.age
      })
      fetchData()
    } catch (err) {
      console.error("Failed to update profile", err)
    }
  }

  useEffect(() => {
    if (stationId) fetchData()
  }, [stationId])

  if (loading || !data)
    return (
      <div className="p-10 text-center text-zinc-400 animate-pulse">
        Initializing neural risk engine...
      </div>
    )

  const { current_context, activities, forecast } = data
  const isHighRisk = current_context.risk_score > 5

  return (

    <div className="glass-panel text-white max-h-[80vh] overflow-y-auto">
      <div className={`relative overflow-hidden p-8 ${
        isHighRisk ? 'bg-red-500/10' : 'bg-emerald-500/10'
      }`}>

        <div className="relative z-10 flex justify-between items-start">

          <div>
            <h2 className="text-3xl font-black tracking-tight">
              PERSONAL RISK INDEX
            </h2>

            <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
              <User size={14} />
              {profile.age.toUpperCase()} PROFILE
              {profile.asthma && <span className="text-red-400">• ASTHMA</span>}
            </div>
          </div>

          <div className="text-right">
            <div className={`text-6xl font-black ${
              isHighRisk ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {current_context.risk_score}
              <span className="text-lg text-zinc-500">/10</span>
            </div>

            <p className="text-[10px] uppercase tracking-widest text-zinc-400">
              Exposure Score
            </p>
          </div>
        </div>
        <div className={`absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-30
          ${isHighRisk ? 'bg-red-500' : 'bg-emerald-500'}
        `} />
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-5">
            <div className="flex justify-between mb-4">
              <h3 className="flex items-center gap-2 text-zinc-300 font-semibold">
                <Settings size={15} /> HEALTH FACTORS
              </h3>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                {isEditing ? 'DONE' : 'EDIT'}
              </button>
            </div>

            <div className="space-y-3">

              {[
                { label: 'ASTHMA / LUNG CONDITION', key: 'asthma' },
                { label: 'PREGNANCY', key: 'pregnant' }
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex justify-between items-center
                    bg-zinc-900/50 hover:bg-zinc-800/60
                    rounded-lg px-4 py-3 transition"
                >
                  <span className="text-xs text-zinc-300">
                    {item.label}
                  </span>

                  <input
                    type="checkbox"
                    checked={(profile as any)[item.key]}
                    disabled={!isEditing}
                    onChange={(e) =>
                      updateProfile({
                        ...profile,
                        [item.key]: e.target.checked
                      })
                    }
                    className="w-4 h-4 accent-cyan-400"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="glass-panel p-5">
            <h3 className="flex items-center gap-2 mb-4 text-zinc-300 font-semibold">
              <Activity size={15} /> 12H RISK FORECAST
            </h3>

            <div className="space-y-3">
              {forecast.slice(0, 5).map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="w-10 text-zinc-500">{p.time}</span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        p.is_unsafe ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${p.risk_score * 10}%` }}
                    />
                  </div>

                  <span className={`w-6 text-right ${
                    p.is_unsafe ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {p.risk_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 grid gap-4">

          {activities.map((a, i) => (

            <div key={i} className="glass-panel p-5 hover:bg-white/5 transition">
              <div className="flex justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${a.color}33`, color: a.color }}
                  >
                    {a.type === 'sport' && <Activity size={18} />}
                    {a.type === 'commute' && <Wind size={18} />}
                    {a.type === 'ventilation' && <Home size={18} />}
                  </div>

                  <h4 className="text-lg font-semibold text-zinc-200">
                    {a.name}
                  </h4>
                </div>

                <span
                  className="px-3 py-1 rounded-full text-xs font-black"
                  style={{ backgroundColor: a.color, color: '#000' }}
                >
                  {a.status}
                </span>
              </div>

              <p className="text-sm text-zinc-400 leading-relaxed ml-12">
                {a.message}
              </p>

            </div>
          ))}

          <div className="glass-panel p-4 flex gap-3 items-start">
            <AlertTriangle size={16} className="text-blue-400 mt-0.5" />

            <p className="text-[11px] text-blue-300">
              AI-generated health guidance. Always consult a medical professional.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PersonalizedDashboard