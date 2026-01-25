import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'
import { 
  Thermometer, 
  Wind, 
  AlertTriangle, 
  Factory, 
  Car, 
  Trees, 
  Building2, 
  Activity 
} from 'lucide-react'

interface Station {
  station_id: string
  name: string
  latitude: number
  longitude: number
  pm25: number | string | null
  aqi: number
  no2_sat: number | string | null
  so2_sat: number | null
  temp_c: number | string | null
  wind_speed_10m: number | string | null
  wind_speed_80m: number | string | null
  pbl_height: number | string | null
  
  // NEW FIELDS
  likely_source?: string
  health_advice?: string
}

const MAP_CENTER: [number, number] = [28.6139, 77.209]

// Helper: Get Icon for Source
const getSourceIcon = (source: string) => {
  if (source?.includes('Traffic')) return <Car size={14} className="text-orange-400" />
  if (source?.includes('Industrial')) return <Factory size={14} className="text-purple-400" />
  if (source?.includes('Dust')) return <Wind size={14} className="text-yellow-400" />
  if (source?.includes('Clean')) return <Trees size={14} className="text-green-400" />
  return <Building2 size={14} className="text-blue-400" />
}

const getGlow = (aqi: number) => {
  if (aqi > 400) return { color: '#ef4444', r: 16 }
  if (aqi > 300) return { color: '#7f1d1d', r: 14 }
  if (aqi > 200) return { color: '#f97316', r: 13 }
  if (aqi > 100) return { color: '#eab308', r: 11 }
  if (aqi > 50) return { color: '#84cc16', r: 10 }
  return { color: '#22c55e', r: 9 }
}

const getAQIStatus = (aqi: number) => {
  if (aqi > 400) return { label: 'Severe', color: 'text-red-500' }
  if (aqi > 300) return { label: 'Very Poor', color: 'text-red-700' }
  if (aqi > 200) return { label: 'Poor', color: 'text-orange-500' }
  if (aqi > 100) return { label: 'Moderate', color: 'text-yellow-500' }
  if (aqi > 50) return { label: 'Satisfactory', color: 'text-lime-400' }
  return { label: 'Good', color: 'text-green-500' }
}

const GlowMarker = ({ position, color, radius }: { position: [number, number], color: string, radius: number }) => (
  <>
    <CircleMarker center={position} radius={radius * 2.6} pathOptions={{ color, fillColor: color, fillOpacity: 0.18, weight: 0 }} />
    <CircleMarker center={position} radius={radius} pathOptions={{ color: '#ffffff', fillColor: color, fillOpacity: 0.95, weight: 2 }} />
  </>
)

const StationMap: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([])

  useEffect(() => {
    api.get<Station[]>('/stations')
      .then(r => setStations(r.data))
      .catch(err => console.error("Failed to load map stations:", err))
  }, [])

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden">
      <MapContainer center={MAP_CENTER} zoom={11} zoomControl={false} className="h-full w-full">
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        {stations.map(s => {
          const g = getGlow(s.aqi)
          const status = getAQIStatus(s.aqi)
          const safeNumber = (val: any) => (val !== null && !isNaN(Number(val)) ? Number(val) : null);
          
          const pbl = safeNumber(s.pbl_height);
          const pm25 = safeNumber(s.pm25);
          const no2 = safeNumber(s.no2_sat);
          const temp = safeNumber(s.temp_c);
          const wind10 = safeNumber(s.wind_speed_10m);

          return (
            <React.Fragment key={s.station_id}>
              <GlowMarker position={[s.latitude, s.longitude]} color={g.color} radius={g.r} />

              <CircleMarker center={[s.latitude, s.longitude]} radius={g.r} pathOptions={{ color: 'transparent', fillColor: 'transparent' }}>
                <Popup>
                  <div className="w-[320px] rounded-2xl bg-zinc-950/95 backdrop-blur-xl p-4 text-white shadow-[0_0_80px_rgba(0,0,0,0.9)] ring-1 ring-white/10">

                    {/* HEADER */}
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-[11px] uppercase tracking-[0.25em] text-zinc-400 font-bold">{s.name}</h3>
                      <span className="text-[9px] text-zinc-500">REAL-TIME</span>
                    </div>

                    {/* AQI DISPLAY */}
                    <div className="mb-5 flex items-end justify-between border-b border-white/5 pb-4">
                      <div>
                        <p className="text-5xl font-thin tracking-tighter text-white">{s.aqi}</p>
                        <p className={`text-[10px] uppercase tracking-widest font-bold ${status.color} mt-1`}>{status.label}</p>
                      </div>
                      
                      {/* NEW: SOURCE ANALYSIS BADGE */}
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                          {getSourceIcon(s.likely_source || 'Unknown')}
                          <span className="text-[9px] uppercase tracking-wider text-zinc-300">
                            {s.likely_source || 'Analyzing...'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* NEW: HEALTH ADVICE BOX */}
                    <div className={`mb-4 rounded-lg px-3 py-2.5 flex items-start gap-3 border ${
                      s.aqi > 200 ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                      <Activity size={16} className={s.aqi > 200 ? 'text-red-400' : 'text-emerald-400'} />
                      <p className="text-[10px] leading-relaxed text-zinc-300 font-medium">
                        {s.health_advice || "No specific advice available."}
                      </p>
                    </div>

                    {/* METRICS GRID */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="rounded-lg bg-zinc-900/50 border border-white/5 px-3 py-2">
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500">PM2.5</p>
                        <p className="text-lg font-light text-cyan-300">{pm25 ? pm25.toFixed(0) : '--'}</p>
                      </div>
                      <div className="rounded-lg bg-zinc-900/50 border border-white/5 px-3 py-2">
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500">NO₂</p>
                        <p className="text-lg font-light text-purple-300">{no2 ? no2.toFixed(1) : '--'}</p>
                      </div>
                    </div>

                    {/* WEATHER ROW */}
                    <div className="flex justify-between items-center rounded-lg bg-white/5 px-3 py-2 text-[10px] text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Thermometer size={12} /> <span>{temp || '--'}°C</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wind size={12} /> <span>{wind10 || '--'} km/h</span>
                      </div>
                    </div>

                    {/* INVERSION WARNING */}
                    {pbl !== null && pbl < 300 && (
                      <div className="mt-2 flex items-center justify-center gap-2 text-red-400 text-[9px] uppercase tracking-widest py-1">
                        <AlertTriangle size={10} /> Inversion Layer Detected
                      </div>
                    )}

                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default StationMap