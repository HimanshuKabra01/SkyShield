import React from 'react'
import { BarChart3, Map as MapIcon, Zap } from 'lucide-react'

interface HeaderProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'holistic', label: 'Holistic', icon: <MapIcon size={16} /> },
    { id: 'predictive', label: 'Predictive', icon: <Zap size={16} /> },
    { id: 'hotspots', label: 'Hotspots', icon: <BarChart3 size={16} /> }
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-[2000] bg-gradient-to-b from-black/70 to-black/40 backdrop-blur-2xl px-6 py-4">
      <div className="relative mx-auto flex max-w-[1400px] items-center">

        {/* Brand (left) */}
        <div className="flex items-center">
          <div>
            <h1 className="text-[13px] font-semibold tracking-[0.18em] text-white">
              SKYSHIELD
            </h1>
            <p className="text-[9px] uppercase tracking-[0.35em] text-zinc-500">
              Air Risk Intelligence
            </p>
          </div>
        </div>

        {/* Navigation (true center) */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-white/5 p-1 ring-1 ring-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex items-center gap-2 rounded-full px-5 py-2 text-[11px] tracking-wide transition-all duration-300 ${
                activeTab === item.id
                  ? 'bg-white/90 text-black shadow-[0_0_30px_rgba(255,255,255,0.35)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.icon}
              {item.label}

              {activeTab === item.id && (
                <span className="absolute inset-0 -z-10 rounded-full bg-white/40 blur-md" />
              )}
            </button>
          ))}
        </nav>

      </div>
    </header>
  )
}

export default Header
