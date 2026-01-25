import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";
import { Flame, MapPin } from "lucide-react";

interface Station {
  station_id: string;
  name: string;
  latitude: number;
  longitude: number;
  pm25: number;
  aqi: number;
  wind_speed_10m: number;
  wind_dir: number;
}

const PulsingHotspot = ({
  lat,
  lon,
  aqi,
}: {
  lat: number;
  lon: number;
  aqi: number;
}) => {
  const radius = aqi > 300 ? 40 : aqi > 200 ? 30 : 22;

  return (
    <>
      <CircleMarker
        center={[lat, lon]}
        radius={radius * 1.7}
        pathOptions={{
          color: "transparent",
          fillColor: "#ef4444",
          fillOpacity: 0.18,
        }}
      />

      <CircleMarker
        center={[lat, lon]}
        radius={radius}
        pathOptions={{
          color: "#7f1d1d",
          weight: 1,
          fillColor: "#dc2626",
          fillOpacity: 0.7,
        }}
      >
        <Popup>
          <div className="bg-zinc-900/70 backdrop-blur-2xl border border-white/10 rounded-md px-3 py-2 text-white text-xs shadow-xl">
            <p className="uppercase tracking-widest text-red-400 text-[10px]">
              Hotspot
            </p>
            <p className="text-lg font-semibold">{aqi.toFixed(0)} AQI</p>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
};

const AutoBounds = ({ stations }: { stations: Station[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!stations.length) return;

    const bounds = stations.map(
      (s) => [s.latitude, s.longitude] as [number, number]
    );

    map.fitBounds(bounds, { padding: [80, 80] });
  }, [stations, map]);

  return null;
};

const HotspotMap: React.FC = () => {
  const [hotspots, setHotspots] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any[]>("/stations").then((r) => {
      const clean = r.data
        .map((s) => ({
          ...s,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          aqi: Number(s.aqi),
        }))
        .filter((s) => !isNaN(s.latitude) && !isNaN(s.longitude) && s.aqi > 0);

      const sorted = [...clean].sort((a, b) => b.aqi - a.aqi);

      const severe = sorted.filter((s) => s.aqi > 200);
      const remaining = sorted.filter((s) => s.aqi <= 200);

      const finalHotspots = [...severe, ...remaining].slice(0, 5);

      setHotspots(finalHotspots);
      setLoading(false);
    });
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex">
      <div className="flex-1 relative">
        <div
          className="pointer-events-none absolute inset-0 z-[200]
          bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.75))]"
        />

        <MapContainer
          center={[28.6139, 77.209]}
          zoom={10}
          zoomControl={false}
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <AutoBounds stations={hotspots} />

          {hotspots.map((s) => (
            <PulsingHotspot
              key={s.station_id}
              lat={s.latitude}
              lon={s.longitude}
              aqi={s.aqi}
            />
          ))}
        </MapContainer>
      </div>

      <div
        className="absolute right-5 top-20 bottom-5 z-[500]
        w-[21rem]
        bg-zinc-900/55 backdrop-blur-3xl
        border border-white/10
        rounded-xl
        shadow-[0_30px_90px_rgba(0,0,0,0.9)]
        flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400">
              <Flame size={18} className="animate-pulse" />
              <h2 className="text-xs font-black uppercase tracking-[0.35em]">
                Active Hotspots
              </h2>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 mt-2">
            Highest AQI clusters detected across monitored stations
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading ? (
            <div className="p-6 text-center text-xs text-zinc-500">
              Scanning satellite data...
            </div>
          ) : (
            hotspots.map((h, i) => (
              <div
                key={h.station_id}
                className="rounded-lg
                bg-zinc-950/60
                border border-white/10
                p-4 hover:border-red-500/40 hover:scale-[1.02]
                transition-all duration-300"
              >
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-5 h-5 flex items-center justify-center
                        rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold"
                      >
                        {i + 1}
                      </span>

                      <h3 className="text-sm font-medium text-zinc-200">
                        {h.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <MapPin size={11} />
                      {h.latitude.toFixed(2)}, {h.longitude.toFixed(2)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-semibold text-red-400">
                      {h.aqi.toFixed(0)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-red-400/70">
                      AQI
                    </div>
                  </div>
                </div>

                <div className="mt-3 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-orange-500"
                    style={{ width: `${Math.min(h.aqi / 5, 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HotspotMap;