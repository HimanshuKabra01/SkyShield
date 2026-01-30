import React, { useEffect, useState } from 'react';
import { Droplets, Calendar, AlertTriangle } from 'lucide-react';
import api from '../services/api';

interface SeasonalData {
  season: string;
  risks: string[];
  advice: string;
  alert_color: string;
}

const SeasonalWidget: React.FC = () => {
  const [data, setData] = useState<SeasonalData | null>(null);

  useEffect(() => {
    api.get('/seasonal_forecast')
      .then(res => setData(res.data))
      .catch(err => console.error("Seasonal forecast error:", err));
  }, []);

  if (!data) return null;

  // Dynamic Styles based on alert level
  const theme = {
    red: { bg: 'from-rose-950/40 to-black', border: 'border-rose-500/20', text: 'text-rose-400', bgIcon: 'bg-rose-500/10' },
    orange: { bg: 'from-amber-950/40 to-black', border: 'border-amber-500/20', text: 'text-amber-400', bgIcon: 'bg-amber-500/10' },
    purple: { bg: 'from-purple-950/40 to-black', border: 'border-purple-500/20', text: 'text-purple-400', bgIcon: 'bg-purple-500/10' },
    yellow: { bg: 'from-yellow-950/40 to-black', border: 'border-yellow-500/20', text: 'text-yellow-400', bgIcon: 'bg-yellow-500/10' },
  }[data.alert_color] || { bg: 'from-zinc-900 to-black', border: 'border-white/10', text: 'text-zinc-400', bgIcon: 'bg-white/5' };

  return (
    <div className={`relative overflow-hidden rounded-[2rem] p-6 border bg-gradient-to-br transition-all duration-500 group ${theme.bg} ${theme.border}`}>
      
      {/* Glow Effect */}
      <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity bg-current ${theme.text}`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl backdrop-blur-md border border-white/5 ${theme.bgIcon} ${theme.text}`}>
               <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {data.season} Forecast
              </h3>
              <span className="text-[10px] text-zinc-400">Epidemiological Watch</span>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border border-white/5 ${theme.bgIcon} ${theme.text}`}>
            Active
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
               <AlertTriangle size={10} /> High Risk Vectors
            </p>
            <div className="flex flex-wrap gap-2">
              {data.risks.map((risk, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-zinc-300 font-medium hover:bg-white/10 transition-colors">
                  {risk}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex gap-3">
            <Droplets size={16} className="text-zinc-500 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400 italic leading-relaxed">
              "{data.advice}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonalWidget;