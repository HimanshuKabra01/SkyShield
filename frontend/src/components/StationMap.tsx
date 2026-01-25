import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'
import { Thermometer, Wind, AlertTriangle } from 'lucide-react'

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
}

const MAP_CENTER: [number, number] = [28.6139, 77.209]

const getGlow = (aqi: number) => {
  if (aqi > 250) return { color: '#ef4444', r: 16 }
  if (aqi > 150) return { color: '#f59e0b', r: 13 }
  if (aqi > 80) return { color: '#eab308', r: 11 }
  return { color: '#22c55e', r: 9 }
}

const GlowMarker = ({
  position,
  color,
  radius
}: {
  position: [number, number]
  color: string
  radius: number
}) => (
  <>
    <CircleMarker
      center={position}
      radius={radius * 2.6}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.18,
        weight: 0
      }}
    />
    <CircleMarker
      center={position}
      radius={radius}
      pathOptions={{
        color: '#ffffff',
        fillColor: color,
        fillOpacity: 0.95,
        weight: 2
      }}
    />
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
      <MapContainer
        center={MAP_CENTER}
        zoom={11}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        {stations.map(s => {
          const g = getGlow(s.aqi)

          // Helper to safely convert strings to numbers
          const safeNumber = (val: any) => (val !== null && !isNaN(Number(val)) ? Number(val) : null);
          
          const pbl = safeNumber(s.pbl_height);
          const pm25 = safeNumber(s.pm25);
          const no2 = safeNumber(s.no2_sat);
          const temp = safeNumber(s.temp_c);
          const wind10 = safeNumber(s.wind_speed_10m);
          const wind80 = safeNumber(s.wind_speed_80m);

          return (
            <React.Fragment key={s.station_id}>
              <GlowMarker
                position={[s.latitude, s.longitude]}
                color={g.color}
                radius={g.r}
              />

              <CircleMarker
                center={[s.latitude, s.longitude]}
                radius={g.r}
                pathOptions={{
                  color: 'transparent',
                  fillColor: 'transparent'
                }}
              >
                <Popup>
                  <div className="w-[300px] rounded-2xl bg-zinc-950/90 backdrop-blur-xl p-4 text-white shadow-[0_0_80px_rgba(0,0,0,0.9)] ring-1 ring-white/5">

                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-[11px] uppercase tracking-[0.25em] text-zinc-400">
                        {s.name}
                      </h3>
                      <span className="text-[9px] text-zinc-500">AQI</span>
                    </div>

                    <div className="mb-5 flex items-end justify-between">
                      <p className="text-5xl font-extralight">
                        {s.aqi}
                      </p>
                      <p className="pb-1 text-[10px] uppercase tracking-widest text-zinc-400">
                        Severe
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {/* PM2.5 Box */}
                      <div className="rounded-lg bg-white/5 px-3 py-2">
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500">
                          PM2.5
                        </p>
                        <p className="text-xl font-light text-cyan-300">
                          {pm25 !== null ? pm25.toFixed(0) : '--'}
                        </p>
                      </div>

                      {/* NO2 Box */}
                      <div className="rounded-lg bg-white/5 px-3 py-2">
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500">
                          NO₂
                        </p>
                        <p className="text-xl font-light text-purple-300">
                          {no2 !== null ? no2.toFixed(1) : '--'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg bg-white/5 px-3 py-2">
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span className="flex items-center gap-2">
                          <Thermometer size={11} /> Temp
                        </span>
                        <span>{temp !== null ? temp : '--'}°C</span>
                      </div>

                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span className="flex items-center gap-2">
                          <Wind size={11} /> Wind
                        </span>
                        <span>{wind10 !== null ? wind10 : '--'}/{wind80 !== null ? wind80 : '--'} km/h</span>
                      </div>
                    </div>

                    {/* PBL Height Warning (This was the error source) */}
                    {pbl !== null && pbl < 300 && (
                      <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2">
                        <div className="flex items-center gap-2 text-red-400">
                          <AlertTriangle size={12} />
                          <p className="text-[9px] uppercase tracking-[0.25em]">
                            Inversion · {pbl.toFixed(0)}m
                          </p>
                        </div>
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