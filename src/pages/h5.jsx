import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  Heart,
  Wind,
  Cpu,
  Zap,
  Settings,
  ShieldAlert,
  Terminal,
  Layers,
  Menu
} from 'lucide-react';

// --- SIMULATION CONFIG ---
const TICK_RATE_MS = 50; // Update every 50ms
const TARGET_PEEP = 5; // Positive End-Expiratory Pressure
const TARGET_PIP = 20; // Peak Inspiratory Pressure
const BREATH_RATE = 12; // Breaths per minute

// --- HELPER: REAL-TIME CHART ---
const LiveChart = ({ data, color, min, max, label, unit }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Grid - lighter for white bg
    ctx.strokeStyle = '#f1f5f9'; // slate-100
    ctx.lineWidth = 1;
    ctx.beginPath();
    [0, 0.5, 1].forEach(r => {
      const y = height * r;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    });
    ctx.stroke();

    // Draw Line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Normalize and plot
    const len = data.length;
    const stepX = width / 100; // Show last 100 pts

    data.slice(-100).forEach((val, i) => {
      const normalized = (val - min) / (max - min);
      const x = i * stepX;
      const y = height - (normalized * height);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill area
    ctx.lineTo((data.length > 100 ? 100 : data.length) * stepX, height);
    ctx.lineTo(0, height);
    ctx.fillStyle = `${color}15`; // Very low opacity fill
    ctx.fill();

  }, [data, color, min, max]);

  return (
    <div className="relative h-24 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <canvas ref={canvasRef} width={400} height={100} className="w-full h-full" />
      <div className="absolute top-2 left-2 text-[10px] font-bold font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
        {label}
      </div>
      <div className="absolute bottom-2 right-2 text-xs font-bold font-mono text-slate-700">
        {data.length > 0 ? data[data.length - 1].toFixed(1) : 0} <span className="text-slate-400 text-[10px]">{unit}</span>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION ---

export default function HelixTwinL5() {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [logs, setLogs] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // State Variables (The "Twin" State)
  const [pressure, setPressure] = useState([0]); // cmH2O
  const [flow, setFlow] = useState([0]); // L/min
  const [volume, setVolume] = useState([0]); // mL
  const [valveState, setValveState] = useState(0); // 0-100% open
  const [turbineSpeed, setTurbineSpeed] = useState(0); // RPM
  const [breathPhase, setBreathPhase] = useState('EXPIRATION'); // INSPIRATION, EXPIRATION
  const [alarm, setAlarm] = useState(null);

  // Fault Injection Triggers
  const [coughTrigger, setCoughTrigger] = useState(false);
  const [leakTrigger, setLeakTrigger] = useState(false);

  const addLog = (msg, type) => {
    setLogs(prev => [{ msg, type, time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit', fractionDigits: 2 }) }, ...prev].slice(0, 20));
  };

  // --- CORE LOGIC: THE TRI-BRID LOOP ---
  useEffect(() => {
    let interval = null;

    if (isRunning) {
      interval = setInterval(() => {
        setTime(t => t + TICK_RATE_MS);

        // 1. LOGIC ENGINE (Firmware State Machine)
        let newTurbineCmd = turbineSpeed;
        let newValveCmd = valveState;
        let newPhase = breathPhase;

        // Simple Time-Cycled Ventilator Logic
        const cycleTime = 60000 / BREATH_RATE; // ms per breath
        const inspTime = cycleTime / 3; // 1:2 I:E Ratio
        const timer = (Date.now()) % cycleTime;

        if (timer < inspTime) {
          if (newPhase !== 'INSPIRATION') {
            newPhase = 'INSPIRATION';
            addLog("Cycle Start: Inspiration Phase", "system");
          }
          // PID Control for Pressure Target (Simulated)
          const currentP = pressure[pressure.length - 1];
          if (currentP < TARGET_PIP) newTurbineCmd = Math.min(newTurbineCmd + 500, 40000);
          else newTurbineCmd = Math.max(newTurbineCmd - 500, 5000);
          newValveCmd = 0; // Close exhalation valve
        } else {
          if (newPhase !== 'EXPIRATION') {
            newPhase = 'EXPIRATION';
            addLog("Cycle Switch: Exhalation Phase", "system");
          }
          newTurbineCmd = 2000; // Idle speed
          newValveCmd = 100; // Open valve to exhale
        }

        // SAFETY INTERRUPT: High Pressure Alarm
        if (pressure[pressure.length - 1] > 40) { // Safety limit
          addLog("CRITICAL: Over-Pressure Detected! Opening Safety Valve.", "error");
          setAlarm("HIGH PRESSURE");
          newTurbineCmd = 0;
          newValveCmd = 100; // Dump pressure immediately
        } else if (alarm === "HIGH PRESSURE" && pressure[pressure.length - 1] < 10) {
          setAlarm(null); // Auto-reset
          addLog("Alarm Cleared: Pressure Normal.", "success");
        }

        // 2. PHYSICS ENGINE (Pneumatics)
        let pTurbine = (newTurbineCmd / 40000) * 60; // Max 60 cmH2O at full speed
        let lungCompliance = 50; // mL/cmH2O (Normal Lungs)
        let airwayResist = 5; // cmH2O/L/s

        // FAULT: Leak drops resistance
        if (leakTrigger) {
          pTurbine *= 0.5; // Loss of pressure
          if (!alarm) addLog("Warning: Circuit Leak Detected", "warning");
        }

        // 3. BIO ENGINE (Patient Lungs)
        let pPatient = volume[volume.length - 1] / lungCompliance;
        if (coughTrigger) {
          pPatient += 50; // Massive spike
          setCoughTrigger(false); // One-shot event
          addLog("BIO-EVENT: Patient Cough Simulated", "warning");
        }

        // Calculate Dynamics
        const deltaP = pTurbine - pPatient - (newPhase === 'EXPIRATION' ? 0 : 0);
        let instantaneousFlow = deltaP / airwayResist; // L/s

        // Valve Logic: If valve open, flow goes out
        if (newValveCmd > 50) {
          instantaneousFlow = -1 * (pPatient / airwayResist); // Passive exhalation
        }

        const newVol = Math.max(0, volume[volume.length - 1] + (instantaneousFlow * (TICK_RATE_MS / 1000) * 1000)); // mL
        const newPress = newVol / lungCompliance; // P = V/C

        // UPDATE STATE
        setTurbineSpeed(newTurbineCmd);
        setValveState(newValveCmd);
        setBreathPhase(newPhase);

        setPressure(prev => [...prev.slice(-100), newPress]);
        setFlow(prev => [...prev.slice(-100), instantaneousFlow * 60]); // Convert to L/min
        setVolume(prev => [...prev.slice(-100), newVol]);

      }, TICK_RATE_MS);
    }
    return () => clearInterval(interval);
  }, [isRunning, pressure, volume, breathPhase, alarm, coughTrigger, leakTrigger]);


  return (
    <div className="flex h-screen bg-orange-50 text-slate-800 font-sans overflow-hidden">

      {/* SIDEBAR: CONTROLS */}
      <div className="w-72 bg-white border-r border-orange-100 flex flex-col z-20 shadow-sm">
        <div className="p-4 border-b border-orange-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Activity className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-800">Helix<span className="text-orange-500">Twin</span></span>
          </div>
          <div className="mt-1 flex justify-between items-center">
             <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">Layer 5: Co-Simulation</div>
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-orange-50 rounded text-slate-400">
               <Menu className="w-4 h-4" />
             </button>
          </div>
        </div>

        <div className="p-4 space-y-6 flex-1 overflow-y-auto">

          {/* Main Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
               <Cpu className="w-3 h-3 text-orange-400" /> Simulation Master
            </div>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${isRunning ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'}`}
            >
              {isRunning ? <><Pause className="w-3 h-3" /> Pause Engine</> : <><Play className="w-3 h-3" /> Run Simulation</>}
            </button>
            <div className="mt-3 flex justify-between text-[10px] font-mono text-slate-400 bg-slate-50 p-2 rounded">
              <span>Time: {(time / 1000).toFixed(1)}s</span>
              <span>Rate: {TICK_RATE_MS}ms</span>
            </div>
          </div>

          {/* Fault Injection */}
          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
            <div className="text-[10px] font-bold text-red-500 uppercase mb-3 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> Fault Injection
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setCoughTrigger(true)}
                className="w-full bg-white hover:bg-red-50 border border-red-200 text-red-600 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Wind className="w-3 h-3" /> Trigger Patient Cough
              </button>
              <button
                onClick={() => setLeakTrigger(!leakTrigger)}
                className={`w-full border py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm ${leakTrigger ? 'bg-red-500 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <ShieldAlert className="w-3 h-3" /> {leakTrigger ? 'Stop Leak' : 'Simulate Air Leak'}
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm">
              <span className="text-slate-500 flex items-center gap-2"><Cpu className="w-3 h-3 text-slate-400" /> Firmware</span>
              <span className={`font-bold px-2 rounded ${breathPhase === 'INSPIRATION' ? 'bg-sky-100 text-sky-700' : 'bg-purple-100 text-purple-700'}`}>{breathPhase}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm">
              <span className="text-slate-500 flex items-center gap-2"><Wind className="w-3 h-3 text-slate-400" /> Turbine</span>
              <span className="text-slate-700 font-bold">{Math.round(turbineSpeed)} RPM</span>
            </div>
            <div className="flex justify-between p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm">
              <span className="text-slate-500 flex items-center gap-2"><Settings className="w-3 h-3 text-slate-400" /> Valve</span>
              <span className="text-slate-700 font-bold">{valveState === 0 ? 'CLOSED' : 'OPEN'}</span>
            </div>
          </div>

        </div>
      </div>

      {/* MAIN VISUALIZATION */}
      <div className="flex-1 flex flex-col bg-orange-50/30 relative overflow-hidden">

        {/* Top Bar */}
        <div className="h-14 bg-white/80 backdrop-blur border-b border-orange-100 flex items-center px-6 justify-between z-10 sticky top-0">
          <h1 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-500" /> Multi-Domain Digital Twin
          </h1>
          {alarm && (
            <div className="px-3 py-1 bg-red-500 text-white font-bold text-xs rounded-full animate-pulse flex items-center gap-2 shadow-md shadow-red-200">
              <ShieldAlert className="w-3 h-3" /> ALARM: {alarm}
            </div>
          )}
        </div>

        {/* Graphs Grid */}
        <div className="flex-1 p-6 grid grid-rows-3 gap-4 overflow-y-auto">

          {/* 1. Pressure (Physics + Logic) */}
          <div className="flex flex-col">
            <div className="flex justify-between items-end mb-1 px-1">
              <span className="text-xs font-bold text-sky-600 flex items-center gap-2">
                <Activity className="w-3 h-3" /> Airway Pressure
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Target: {TARGET_PIP} cmH2O</span>
            </div>
            <LiveChart data={pressure} color="#0ea5e9" min={0} max={50} label="Sensor: P_Airway" unit="cmH2O" />
          </div>

          {/* 2. Flow (Physics) */}
          <div className="flex flex-col">
            <div className="flex justify-between items-end mb-1 px-1">
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-2">
                <Wind className="w-3 h-3" /> Air Flow Rate
              </span>
            </div>
            <LiveChart data={flow} color="#10b981" min={-60} max={60} label="Sensor: Q_Flow" unit="L/min" />
          </div>

          {/* 3. Volume (Bio-Physiology) */}
          <div className="flex flex-col">
            <div className="flex justify-between items-end mb-1 px-1">
              <span className="text-xs font-bold text-purple-600 flex items-center gap-2">
                <Heart className="w-3 h-3" /> Patient Lung Volume
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Compliance: 50 mL/cmH2O</span>
            </div>
            <LiveChart data={volume} color="#8b5cf6" min={0} max={800} label="Bio-Model: V_Lung" unit="mL" />
          </div>

        </div>

        {/* Bottom Terminal */}
        <div className="h-40 border-t border-orange-100 bg-white flex flex-col">
          <div className="px-4 py-1.5 bg-orange-50/50 border-b border-orange-100 text-xs font-bold text-orange-400 flex items-center gap-2 uppercase tracking-wide">
            <Terminal className="w-3 h-3" /> Simulation Event Log
          </div>
          <div className="flex-1 p-2 overflow-y-auto font-mono text-[10px] space-y-1">
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2 animate-fade-in border-b border-slate-50 pb-0.5 last:border-0">
                <span className="text-slate-400 shrink-0">[{l.time}]</span>
                <span className={
                  l.type === 'error' ? 'text-red-600 font-bold' :
                    l.type === 'warning' ? 'text-orange-500 font-medium' :
                      l.type === 'system' ? 'text-sky-600' :
                        'text-emerald-600'
                }>{l.msg}</span>
              </div>
            ))}
            <div className="text-orange-400 animate-pulse pl-1">_</div>
          </div>
        </div>

      </div>
    </div>
  );
}
