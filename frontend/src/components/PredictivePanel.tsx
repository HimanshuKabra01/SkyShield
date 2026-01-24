import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';
import { Zap, Clock } from 'lucide-react';

interface Prediction {
  time: string;
  value: number;
}

const PredictivePanel = ({
  stationId,
  stationName,
}: {
  stationId: string;
  stationName: string;
}) => {
  const [data, setData] = useState<Prediction[]>([]);

  useEffect(() => {
    axios
      .get<Prediction[]>(`http://127.0.0.1:5000/api/predictions/${stationId}`)
      .then((res) => setData(res.data))
      .catch((err) => console.error('Forecast Error:', err));
  }, [stationId]);

  return (
    <div className="relative bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 h-full shadow-[0_0_40px_-10px_rgba(234,179,8,0.15)] flex flex-col overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-500/10 blur-3xl rounded-full" />
      </div>
      <div className="relative flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-yellow-400/20 to-yellow-500/5 p-2.5 rounded-xl text-yellow-400 border border-yellow-500/20 shadow-inner">
            <Zap size={18} />
          </div>
          <div>
            <h3 className="text-white font-extrabold text-sm tracking-widest uppercase">
              AI Forecast Engine
            </h3>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase">
              {stationName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/80 rounded-full border border-zinc-700">
          <Clock size={12} className="text-zinc-400" />
          <span className="text-[9px] font-bold text-zinc-300 uppercase">
            Next 48 Hours
          </span>
        </div>
      </div>

      <div className="relative flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20 }}>
            <defs>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#facc15" stopOpacity={1} />
                <stop offset="100%" stopColor="#eab308" stopOpacity={0.3} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="2 6"
              stroke="#27272a"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#09090b',
                border: '1px solid #3f3f46',
                borderRadius: '10px',
                fontSize: '11px',
                color: '#fff',
              }}
              itemStyle={{
                color: '#facc15',
                fontWeight: 'bold',
              }}
              labelStyle={{
                color: '#a1a1aa',
                marginBottom: '4px',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="url(#forecastGradient)"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 5,
                fill: '#facc15',
                stroke: '#000',
                strokeWidth: 2,
              }}
              animationDuration={1400}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PredictivePanel;