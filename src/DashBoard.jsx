import React from 'react';
import {
  Terminal, Database, Cpu, Target, Activity, ShieldCheck, LayoutDashboard,
  ArrowRight, Activity as Pulse
} from 'lucide-react';

const LayerCard = ({ title, desc, icon: Icon, color, onClick }) => (
  <button 
    onClick={onClick}
    className="group relative flex flex-col items-start p-6 bg-slate-800/60 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-orange-500/50 transition-all duration-300 text-left w-full h-full shadow-lg backdrop-blur-sm"
  >
    <div className={`p-3 rounded-lg bg-slate-900/50 border border-slate-700 mb-4 group-hover:scale-110 transition-transform ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">{title}</h3>
    <p className="text-sm text-slate-300 leading-relaxed mb-8 font-medium">{desc}</p>
    
    <div className="mt-auto flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-orange-400 uppercase tracking-wider transition-colors">
      Launch Layer <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
    </div>
    
    {/* Decoration */}
    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
    </div>
  </button>
);

export default function Dashboard({ onNavigate }) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-8 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-[#0f172a] to-[#0f172a]">
      
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto mb-16 text-center pt-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-900/40 border border-blue-700/50 text-blue-300 text-xs font-mono mb-6 shadow-sm backdrop-blur-md">
          <Pulse className="w-3 h-3 text-orange-500" /> AUTONOMOUS ENGINEERING PLATFORM
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight drop-shadow-sm">
          Helix<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Twin</span>
        </h1>
        <p className="text-slate-300 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-light">
          A Generative Systems Engineering Platform for <span className="text-white font-medium">Autonomous Medical Device Design</span>.
          <br className="hidden md:block" /> Select a layer to begin the autonomous design lifecycle.
        </p>
      </div>

      {/* Grid of Layers */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        
        <LayerCard 
          title="L1: Semantic Intent" 
          desc="Translate natural language requirements into rigorous SysML v2 & ReqIF constraints."
          icon={Terminal} 
          color="text-purple-400"
          onClick={() => onNavigate(1)}
        />

        <LayerCard 
          title="L2: Knowledge Helix" 
          desc="GraphRAG engine for zero-hallucination component selection and standards retrieval."
          icon={Database} 
          color="text-blue-400"
          onClick={() => onNavigate(2)}
        />

        <LayerCard 
          title="L3: Generative Design" 
          desc="Autonomous ECAD/MCAD layout synthesis with ISO clearance validation."
          icon={Cpu} 
          color="text-cyan-400"
          onClick={() => onNavigate(3)}
        />

        <LayerCard 
          title="L4: Calibration Matrix" 
          desc="Bayesian Particle Filters that tune the simulation using physical prototype data."
          icon={Target} 
          color="text-green-400"
          onClick={() => onNavigate(4)}
        />

        <LayerCard 
          title="L5: Co-Simulation" 
          desc="Tri-brid engine (Physics + Logic + Bio) for closed-loop validation."
          icon={Activity} 
          color="text-yellow-400"
          onClick={() => onNavigate(5)}
        />

        <LayerCard 
          title="L6: Compliance Sentinel" 
          desc="Automated ISO 14971 Risk Analysis and Supply Chain obsolescence checks."
          icon={ShieldCheck} 
          color="text-red-400"
          onClick={() => onNavigate(6)}
        />

        <div className="md:col-span-2 lg:col-span-3">
          <button 
            onClick={() => onNavigate(7)}
            className="w-full group relative p-8 bg-gradient-to-r from-blue-900/40 to-slate-800/40 border border-slate-700/50 rounded-xl hover:border-orange-500/50 transition-all text-left flex items-center justify-between backdrop-blur-sm shadow-lg"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-600/50">
                   <LayoutDashboard className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold text-white group-hover:text-orange-400 transition-colors">L7: Omni-Dashboard</h3>
              </div>
              <p className="text-slate-300 max-w-xl font-medium ml-1">
                The Master Command Center. Aggregate all layers into a single Asset Administration Shell (AAS) with Time-Travel Debugging.
              </p>
            </div>
            <div className="hidden md:flex h-14 w-14 bg-orange-600 rounded-full items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-orange-900/50 group-hover:bg-orange-500">
              <ArrowRight className="w-8 h-8 text-white" />
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
