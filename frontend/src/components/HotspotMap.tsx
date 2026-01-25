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

/* ---------------- TYPES ---------------- */

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

/* ---------------- HOTSPOT MARKER ---------------- */

const PulsingHotspot = ({
  lat,
  lon,
  aqi,
}: {
  lat: number;
  lon: number;
  aqi: number;
}) => {
  const radius = aqi > 300 ? 42 : aqi > 200 ? 32 : 22;

  return (
    <>
      {/* Outer Glow */}
      <CircleMarker
        center={[lat, lon]}
        radius={radius * 1.6}
        pathOptions={{
          color: "transparent",
          fillColor: "#ef4444",
          fillOpacity: 0.18,
        }}
      />

      {/* Core */}
      <CircleMarker
        center={[lat, lon]}
        radius={radius}
        pathOptions={{
          color: "#991b1b",
          weight: 1,
          fillColor: "#dc2626",
          fillOpacity: 0.65,
        }}
      >
        <Popup>
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-red-500">
              Hotspot
            </p>
            <p className="text-lg font-bold text-zinc-900">
              {aqi.toFixed(0)} AQI
            </p>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
};

/* ---------------- AUTO FIT BOUNDS ---------------- */

const AutoBounds = ({ stations }: { stations: Station[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!stations.length) return;

    const bounds = stations
      .filter(
        (s) => !isNaN(s.latitude) && !isNaN(s.longitude)
      )
      .map((s) => [s.latitude, s.longitude] as [number, number]);

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [stations, map]);

  return null;
};

/* ---------------- MAIN COMPONENT ---------------- */

const HotspotMap: React.FC = () => {
  const [hotspots, setHotspots] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<any[]>("/stations")
      .then((r) => {
        const clean: Station[] = r.data
          .map((s) => ({
            ...s,
            latitude: Number(s.latitude),
            longitude: Number(s.longitude),
            aqi: Number(s.aqi),
            pm25: Number(s.pm25),
            wind_speed_10m: Number(s.wind_speed_10m),
            wind_dir: Number(s.wind_dir),
          }))
          .filter(
            (s) =>
              !isNaN(s.latitude) &&
              !isNaN(s.longitude) &&
              !isNaN(s.aqi) &&
              s.aqi > 0
          );

        const sorted = [...clean].sort((a, b) => b.aqi - a.aqi);
        const critical = sorted.filter((s) => s.aqi > 200);
        const finalHotspots =
          critical.length < 5 ? sorted.slice(0, 5) : critical;

        setHotspots(finalHotspots);
        setLoading(false);
      })
      .catch((e) => console.error("Hotspot API Error:", e));
  }, []);

  return (
    <div
      className="relative w-full bg-zinc-950 flex"
      style={{ height: "calc(100vh - var(--header-h, 72px))" }}
    >
      {/* ---------------- MAP ---------------- */}

      <div className="flex-1 relative">

        {/* Vignette */}
        <div className="pointer-events-none absolute inset-0 z-[500]
        bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.75))]" />

        <MapContainer
          center={[28.6139, 77.209]}
          zoom={10}
          zoomControl={false}
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; CARTO"
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

        {/* LEGEND */}
        <div
          className="absolute bottom-6 left-6 z-[1000]
          bg-zinc-900/80 backdrop-blur-xl
          border border-zinc-700
          rounded-xl px-4 py-3 text-[11px] text-zinc-300 space-y-1"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Severe AQI (&gt;200)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            High AQI
          </div>
        </div>
      </div>

      {/* ---------------- SIDE PANEL ---------------- */}

      <div
        className="absolute top-6 right-6 z-[1000] w-[22rem]
        bg-gradient-to-br from-zinc-900/80 to-zinc-950/80
        backdrop-blur-2xl
        border border-red-500/20
        rounded-3xl
        shadow-[0_0_40px_-10px_rgba(239,68,68,0.4)]
        overflow-hidden flex flex-col max-h-[80%]"
      >
        {/* Header */}
        <div className="p-5 border-b border-red-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400">
              <Flame size={18} className="animate-pulse" />
              <h2 className="text-xs font-black uppercase tracking-[0.35em]">
                Active Hotspots
              </h2>
            </div>
            <span className="text-[10px] text-zinc-400">LIVE</span>
          </div>

          <p className="text-[11px] text-zinc-400 mt-2">
            Highest AQI clusters detected across monitored stations
          </p>
        </div>

        {/* List */}
        <div className="overflow-y-auto p-3 space-y-3">
          {loading ? (
            <div className="p-6 text-center text-xs text-zinc-500">
              Scanning satellite data...
            </div>
          ) : (
            hotspots.map((h, i) => (
              <div
                key={h.station_id}
                className="group relative overflow-hidden rounded-2xl
                bg-zinc-950/60 border border-zinc-800
                p-4 hover:border-red-500/50 hover:scale-[1.02]
                transition-all duration-300"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100
                transition bg-gradient-to-r from-red-500/10 via-transparent to-orange-500/10" />

                <div className="relative z-10 flex justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 flex items-center justify-center
                      rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-200">
                        {h.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <MapPin size={11} />
                      {h.latitude.toFixed(2)}, {h.longitude.toFixed(2)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black text-red-400 leading-none">
                      {h.aqi.toFixed(0)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-red-400/70">
                      AQI
                    </div>
                  </div>
                </div>

                {/* Severity bar */}
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
