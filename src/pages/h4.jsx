import React, { useState, useEffect } from 'react';
import {
  Upload,
  RefreshCw,
  FileText,
  CheckCircle,
  Play,
  Target,
  ArrowRight,
  Filter,
  Menu,
  Terminal
} from 'lucide-react';

// --- MOCK DATA GENERATORS ---

// 1. Theoretical Model (Datasheet perfect world)
const generateTheoreticalCurve = () => {
  const data = [];
  for (let t = 0; t <= 100; t++) {
    const vol = 4.2 - (0.05 * t) - 0.1;
    data.push({ t, v: Math.max(2.8, vol) });
  }
  return data;
};

// 2. "Real World" Data (Noisier, steeper drop due to higher Resistance)
const generateRealWorldData = () => {
  const data = [];
  for (let t = 0; t <= 100; t++) {
    const noise = (Math.random() - 0.5) * 0.05;
    const vol = 4.2 - (0.065 * t) - 0.2 + noise;
    data.push({ t, v: Math.max(2.5, vol) });
  }
  return data;
};

// --- HELPER: SVG CHART COMPONENT ---
const CalibrationChart = ({ theoretical, real, particles, currentStep }) => {
  const width = 600;
  const height = 300;
  const padding = 40;

  // Scales
  const xScale = (t) => padding + (t / 100) * (width - 2 * padding);
  const yScale = (v) => height - padding - ((v - 2.5) / (4.5 - 2.5)) * (height - 2 * padding);

  return (
    <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-2 h-full">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        {/* Grid Lines - tinted orange */}
        {[2.5, 3.0, 3.5, 4.0, 4.5].map(v => (
          <line key={v} x1={padding} y1={yScale(v)} x2={width - padding} y2={yScale(v)} stroke="#ffedd5" strokeDasharray="4 4" />
        ))}
        {[0, 20, 40, 60, 80, 100].map(t => (
          <line key={t} x1={xScale(t)} y1={height - padding} x2={xScale(t)} y2={padding} stroke="#ffedd5" strokeDasharray="4 4" />
        ))}

        {/* Axis Labels */}
        <text x={width / 2} y={height - 10} fill="#9a3412" textAnchor="middle" fontSize="10" fontWeight="500">Time (minutes)</text>
        <text x={12} y={height / 2} fill="#9a3412" textAnchor="middle" fontSize="10" fontWeight="500" transform={`rotate(-90, 12, ${height / 2})`}>Voltage (V)</text>

        {/* 1. Theoretical Curve (Blue dashed) */}
        <polyline
          points={theoretical.map(d => `${xScale(d.t)},${yScale(d.v)}`).join(' ')}
          fill="none"
          stroke="#38bdf8" // Sky-400
          strokeWidth="2"
          strokeDasharray="5 5"
          opacity="0.8"
        />

        {/* 2. Real World Data (Emerald Solid) */}
        <polyline
          points={real.slice(0, currentStep).map(d => `${xScale(d.t)},${yScale(d.v)}`).join(' ')}
          fill="none"
          stroke="#10b981" // Emerald-500
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* 3. Particles (Orange - Bayesian Beliefs) */}
        {particles.map((p, i) => (
          <circle
            key={i}
            cx={xScale(currentStep)}
            cy={yScale(p.val)}
            r={p.weight * 5}
            fill="#f97316" // Orange-500
            opacity="0.6"
          />
        ))}

        {/* Legend */}
        <g transform={`translate(${width - 150}, ${padding})`}>
          <rect width="130" height="80" fill="white" rx="8" stroke="#fdba74" strokeWidth="1" />
          
          <line x1="15" y1="25" x2="35" y2="25" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 4" />
          <text x="42" y="29" fill="#475569" fontSize="10" fontWeight="600">Model (Theory)</text>

          <line x1="15" y1="45" x2="35" y2="45" stroke="#10b981" strokeWidth="2" />
          <text x="42" y="49" fill="#475569" fontSize="10" fontWeight="600">Real Data (Log)</text>

          <circle cx="25" cy="65" r="3" fill="#f97316" />
          <text x="42" y="69" fill="#475569" fontSize="10" fontWeight="600">AI Particles</text>
        </g>
      </svg>
    </div>
  );
};

// --- SUBCOMPONENTS ---

function NavItem({ icon: Icon, label, active, expanded }) {
  return (
    <div className={`flex items-center px-4 py-3 cursor-pointer transition-all border-l-4 group ${active ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
      <Icon className={`w-5 h-5 min-w-[20px] transition-colors ${active ? 'text-orange-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
      {expanded && <span className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all">{label}</span>}
    </div>
  );
}

// --- MAIN APPLICATION ---

export default function HelixTwinL4() {
  const [step, setStep] = useState(0); // 0: Idle, 1: Upload, 2: Running, 3: Converged
  const [simIndex, setSimIndex] = useState(0);
  const [theoreticalData, setTheoreticalData] = useState([]);
  const [realData, setRealData] = useState([]);
  const [particles, setParticles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [calibratedParam, setCalibratedParam] = useState(0.1); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initialize Data
  useEffect(() => {
    setTheoreticalData(generateTheoreticalCurve());
    setRealData(generateRealWorldData());
  }, []);

  const addLog = (msg, type) => {
    setLogs(prev => [{ msg, type, time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }) }, ...prev]);
  };

  // --- CORE LOGIC ---
  const runCalibration = () => {
    setStep(2);
    setSimIndex(0);
    setParticles(Array(20).fill(0).map(() => ({ val: 4.0, weight: 1 }))); 
    addLog("Bayesian Filter Initialized. Spawning 20 particles...", "system");

    const interval = setInterval(() => {
      setSimIndex(curr => {
        if (curr >= 100) {
          clearInterval(interval);
          setStep(3);
          addLog("Calibration Complete. Parameter Converged.", "success");
          return curr;
        }

        const t = curr + 1;
        const realVal = 4.2 - (0.065 * t) - 0.2; 

        // Particle Filter Logic (Simulated)
        setParticles(prev => {
          const nextParticles = prev.map(p => {
            const drift = (Math.random() - 0.5) * 0.1;
            return { ...p, val: p.val - 0.06 + drift };
          });

          const weighted = nextParticles.map(p => {
            const error = Math.abs(p.val - realVal);
            const weight = Math.exp(-(error * error) / 0.01);
            return { val: p.val, weight: Math.max(0.1, weight) };
          });

          const bestParticle = weighted.reduce((max, p) => p.weight > max.weight ? p : max, weighted[0]);

          if (t % 10 === 0) {
            setCalibratedParam(prevR => prevR + 0.005);
          }

          return weighted.map(p => ({
            val: (p.val * 0.8) + (bestParticle.val * 0.2) + (Math.random() - 0.5) * 0.05,
            weight: p.weight
          }));
        });

        return t;
      });
    }, 50);
  };

  return (
    <div className="flex h-screen bg-orange-50 text-slate-800 font-sans overflow-hidden">

      {/* SIDEBAR NAVIGATION */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-orange-100 transition-all duration-300 flex flex-col z-20 shadow-sm`}>
        <div className="p-4 flex items-center justify-between border-b border-orange-50">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Target className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-800">Helix<span className="text-orange-500">Twin</span></span>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-orange-50 rounded text-slate-500 transition-colors">
            {isSidebarOpen ? <Menu className="w-5 h-5" /> : <Menu className="w-5 h-5 mx-auto" />}
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
           {isSidebarOpen && (
             <div className="space-y-6">
                
                {/* Step 1: Upload Card */}
                <div className={`p-4 rounded-xl border transition-all ${step === 0 ? 'bg-white border-orange-300 shadow-md ring-2 ring-orange-100' : 'bg-white border-slate-200'}`}>
                   <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg ${step === 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Upload className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${step === 0 ? 'text-orange-900' : 'text-slate-600'}`}>1. Ingest Log</span>
                   </div>
                   <p className="text-xs text-slate-500 mb-4 pl-1">Upload telemetry from physical device thermal chamber run.</p>
                   {step === 0 ? (
                     <button
                       onClick={() => { setStep(1); addLog("Ingested 'prototype_log_v1.csv' (10,000 pts)", "info"); }}
                       className="w-full py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-lg text-xs font-bold text-white transition-all shadow-md"
                     >
                       Select File...
                     </button>
                   ) : (
                     <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg font-medium">
                        <FileText className="w-3 h-3 text-emerald-500" /> prototype_log_v1.csv
                     </div>
                   )}
                </div>

                {/* Step 2: Calibrate Card */}
                <div className={`p-4 rounded-xl border transition-all ${step === 1 ? 'bg-white border-orange-300 shadow-md ring-2 ring-orange-100' : 'bg-white border-slate-200'}`}>
                   <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg ${step === 1 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                        <RefreshCw className={`w-4 h-4 ${step === 2 ? 'animate-spin' : ''}`} />
                      </div>
                      <span className={`text-sm font-bold ${step === 1 ? 'text-orange-900' : 'text-slate-600'}`}>2. Bayesian Filter</span>
                   </div>
                   <p className="text-xs text-slate-500 mb-4 pl-1">Run Particle Filter (SMC) to estimate hidden physics parameters.</p>
                   <button
                     onClick={runCalibration}
                     disabled={step !== 1}
                     className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${step === 1 ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'}`}
                   >
                     {step === 2 ? 'Calibrating...' : 'Start Calibration'}
                   </button>
                </div>

                {/* Parameters Panel */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Model Parameters</div>
                   <div className="flex justify-between items-center mb-2 text-sm">
                      <span className="text-slate-600 font-medium">R_internal (Ω)</span>
                      <div className="flex items-center gap-2">
                         <span className="text-slate-400 text-xs line-through">0.10</span>
                         <ArrowRight className="w-3 h-3 text-slate-300" />
                         <span className={`font-mono font-bold ${step === 3 ? 'text-emerald-600' : 'text-orange-600'}`}>
                            {calibratedParam.toFixed(3)}
                         </span>
                      </div>
                   </div>
                   <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-400 to-emerald-500 transition-all duration-300" style={{ width: `${(calibratedParam / 0.2) * 100}%` }}></div>
                   </div>
                </div>

             </div>
           )}
        </div>

        {/* Console Log */}
        <div className="h-40 border-t border-orange-100 bg-orange-50/50 p-2 overflow-hidden flex flex-col">
           <div className="text-[10px] font-bold text-orange-400 uppercase mb-2 px-2 flex items-center gap-2">
             <Terminal className="w-3 h-3" /> Calibration Log
           </div>
           <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 px-2">
              {logs.map((l, i) => (
                <div key={i} className={`flex gap-2 border-b border-orange-100 pb-1 ${l.type === 'success' ? 'text-emerald-600 font-bold' : 'text-slate-600'}`}>
                   <span className="text-slate-400 shrink-0">{l.time}</span>
                   <span>{l.msg}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col bg-orange-50/30 relative">

        {/* Header */}
        <header className="h-16 bg-white/90 backdrop-blur border-b border-orange-100 flex items-center justify-between px-8 z-10 sticky top-0">
           <div>
              <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 Real-to-Sim Calibration Engine
                 {step === 3 && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200">Converged</span>}
              </h1>
              <p className="text-xs text-slate-500 font-medium">Method: Sequential Monte Carlo (Particle Filters)</p>
           </div>
           <div className="flex items-center gap-3">
              <div className="text-right">
                 <div className="text-[10px] font-bold text-slate-400 uppercase">Fidelity Score</div>
                 <div className={`text-sm font-bold font-mono ${step === 3 ? 'text-emerald-600' : 'text-orange-500'}`}>
                    {step === 3 ? '98.5%' : 'LOW (Theoretical)'}
                 </div>
              </div>
              <div className={`w-2 h-8 rounded-full ${step === 3 ? 'bg-emerald-500' : 'bg-orange-300'}`}></div>
           </div>
        </header>

        {/* Chart Area */}
        <div className="flex-1 p-8 overflow-hidden flex flex-col relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]">
           
           <div className="flex-1 relative shadow-xl rounded-xl overflow-hidden border border-orange-100 bg-white">
              <CalibrationChart
                 theoretical={theoreticalData}
                 real={realData}
                 particles={particles}
                 currentStep={simIndex}
              />

              {/* Success Overlay */}
              {step === 3 && (
                 <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur border border-emerald-100 p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-slide-up ring-4 ring-emerald-50">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                       <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Digital Twin Synchronized</h2>
                    <p className="text-slate-500 text-sm text-center mb-6 max-w-xs leading-relaxed">
                       Physics parameters have been updated to match empirical data. 
                       <br/><span className="font-bold text-emerald-600">Error reduced: 15% → 0.4%</span>
                    </p>
                    <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5">
                       Commit to Layer 5
                    </button>
                 </div>
              )}
           </div>

        </div>

      </div>
    </div>
  );
}
