import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Grid,
  RefreshCw,
  Zap,
  Settings,
  Box,
  Code,
  Thermometer,
  Activity,
  Download,
  CheckCircle,
  AlertTriangle,
  Layers,
  Wind,
  Menu,
  Terminal 
} from 'lucide-react';

// --- MOCK DATA ---
const INITIAL_COMPONENTS = [
  { id: 'MCU', label: 'Nordic nRF52840', width: 60, height: 60, type: 'Logic', power: 0.1, x: 250, y: 200, pins: 48 },
  { id: 'PWR', label: 'LiPo-5000', width: 100, height: 160, type: 'Power', power: 2.0, x: 100, y: 200, pins: 2 },
  { id: 'HV', label: 'Mains Converter', width: 80, height: 80, type: 'HighVoltage', power: 5.0, x: 450, y: 150, pins: 6 },
  { id: 'SEN', label: 'BioSensor AFE', width: 40, height: 40, type: 'Patient', power: 0.05, x: 250, y: 350, pins: 8 },
  { id: 'USB', label: 'USB-C', width: 40, height: 30, type: 'Connector', power: 0.0, x: 50, y: 200, pins: 12, anchored: true }
];

const NETLIST = [
  { from: 'PWR', to: 'MCU', type: 'power', voltage: '3.3V' },
  { from: 'MCU', to: 'SEN', type: 'signal', voltage: '1.8V' },
  { from: 'HV', to: 'PWR', type: 'power', voltage: '12V' },
  { from: 'USB', to: 'PWR', type: 'power', voltage: '5V' }
];

// --- HELPER COMPONENTS ---

const PcbComponent = ({ comp, showThermal, isSelected, onClick }) => {
  const getStyle = (type) => {
    switch (type) {
      case 'HighVoltage': return { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700', icon: Zap };
      case 'Power': return { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700', icon: Zap };
      case 'Logic': return { bg: 'bg-sky-50', border: 'border-sky-500', text: 'text-sky-700', icon: Cpu };
      default: return { bg: 'bg-slate-50', border: 'border-slate-400', text: 'text-slate-600', icon: Box };
    }
  };

  const style = getStyle(comp.type);
  const Icon = style.icon;

  return (
    <div
      onClick={onClick}
      className={`absolute flex flex-col items-center justify-center rounded shadow-sm transition-all duration-300 cursor-pointer
        ${style.bg} border-2 ${isSelected ? 'border-sky-500 ring-2 ring-sky-200' : style.border}
        ${showThermal && comp.power > 1.0 ? 'animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' : ''}
      `}
      style={{
        width: comp.width,
        height: comp.height,
        left: comp.x,
        top: comp.y,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 50 : 10
      }}
    >
      <Icon className={`w-5 h-5 ${style.text} mb-1`} />
      <span className={`text-[10px] font-bold ${style.text} text-center leading-none px-1`}>
        {comp.label}
      </span>
      {/* Pins Visualization */}
      <div className="absolute -left-1 top-1/2 w-1.5 h-3 bg-slate-300 rounded-sm"></div>
      <div className="absolute -right-1 top-1/2 w-1.5 h-3 bg-slate-300 rounded-sm"></div>
      
      {showThermal && comp.power > 0.5 && (
        <div className="absolute -top-3 -right-3 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white">
          {comp.power}W
        </div>
      )}
    </div>
  );
};

// --- CHART COMPONENT (SVG) ---
const OptimizationChart = () => {
  // Generate fake data points for the scatter plot
  const points = Array.from({ length: 50 }).map((_, i) => ({
    x: Math.random() * 8 + 2, // Mass (kg)
    y: Math.random() * 10 + 2, // Life (h)
    status: Math.random() > 0.7 ? 'infeasible' : 'feasible'
  }));
  const optimal = { x: 4.8, y: 11.5 }; // Selected Point

  return (
    <div className="w-full h-48 relative border border-emerald-200 rounded-lg bg-emerald-50 p-4 shadow-sm">
      <h4 className="text-xs font-bold text-emerald-800 uppercase mb-2 absolute top-2 left-4">Pareto Frontier: Mass vs. Battery Life</h4>
      <svg className="w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
        {/* Grid - using lighter emerald tone */}
        <line x1="10" y1="50" x2="95" y2="50" stroke="#a7f3d0" strokeWidth="0.8" />
        <line x1="10" y1="50" x2="10" y2="5" stroke="#a7f3d0" strokeWidth="0.8" />
        
        {/* Constraints */}
        <line x1="60" y1="5" x2="60" y2="50" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" />
        <text x="62" y="10" fontSize="4.5" fontWeight="bold" fill="#ef4444">Max Mass (5kg)</text>
        
        {/* Points */}
        {points.map((p, i) => (
          <circle 
            key={i} 
            cx={p.x * 8 + 10} 
            cy={50 - p.y * 3} 
            r="1.8" 
            fill={p.status === 'feasible' ? '#0ea5e9' : '#94a3b8'} 
            opacity="0.8" 
          />
        ))}
        
        {/* Optimal */}
        <circle cx={optimal.x * 8 + 10} cy={50 - optimal.y * 3} r="3" fill="#10b981" stroke="white" strokeWidth="1" />
        <text x={optimal.x * 8 + 15} y={50 - optimal.y * 3} fontSize="4.5" fontWeight="bold" fill="#047857">Selected</text>
        
        {/* Axes Labels */}
        <text x="52" y="58" fontSize="4.5" fontWeight="bold" fill="#065f46" textAnchor="middle">System Mass (kg)</text>
        <text x="5" y="30" fontSize="4.5" fontWeight="bold" fill="#065f46" textAnchor="middle" transform="rotate(-90 5,30)">Battery Life (h)</text>
      </svg>
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function HelixTwinL3() {
  const [activeTab, setActiveTab] = useState('ecad');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [components, setComponents] = useState(INITIAL_COMPONENTS);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showThermal, setShowThermal] = useState(false);
  const [isRouted, setIsRouted] = useState(false);
  const [logs, setLogs] = useState(["System Initialized. Waiting for generative commands..."]);

  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  // --- ACTIONS ---
  const runAutoPlace = () => {
    setIsOptimizing(true);
    addLog("Starting Force-Directed Placement Algorithm...");
    setTimeout(() => {
      // Simple shuffle simulation
      setComponents(prev => prev.map(c => c.anchored ? c : {
        ...c,
        x: c.x + (Math.random() - 0.5) * 50,
        y: c.y + (Math.random() - 0.5) * 50
      }));
      setIsOptimizing(false);
      addLog("Placement Optimization Converged (Cost: 0.04)");
    }, 1500);
  };

  const toggleRoute = () => {
    setIsRouted(!isRouted);
    addLog(isRouted ? "Traces ripped up." : "Auto-Router Completed: 100% Routed, 0 DRC Errors.");
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20 shadow-sm`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/30">
                <Cpu className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-800">Helix<span className="text-sky-500">Twin</span></span>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors">
            {isSidebarOpen ? <Menu className="w-5 h-5" /> : <Menu className="w-5 h-5 mx-auto" />}
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
           {isSidebarOpen && (
             <div className="space-y-6">
                
                {/* Generative Controls */}
                <div>
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Generative Actions</h3>
                   <div className="space-y-2">
                      <button 
                        onClick={runAutoPlace}
                        disabled={isOptimizing}
                        className="w-full flex items-center justify-between bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 p-2.5 rounded-lg text-xs font-bold transition-all"
                      >
                         <span className="flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} /> Optimize Placement</span>
                         <span className="bg-white px-1.5 py-0.5 rounded text-[10px] border border-sky-100">AI</span>
                      </button>
                      
                      <button 
                        onClick={toggleRoute}
                        className={`w-full flex items-center justify-between border p-2.5 rounded-lg text-xs font-bold transition-all ${isRouted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                         <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> {isRouted ? 'Reroute' : 'Auto-Route'}</span>
                         {isRouted && <CheckCircle className="w-3 h-3" />}
                      </button>
                   </div>
                </div>

                {/* Analysis Tools */}
                <div>
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Analysis Layers</h3>
                   <div className="space-y-2">
                      <button 
                        onClick={() => setShowThermal(!showThermal)}
                        className={`w-full flex items-center gap-2 border p-2.5 rounded-lg text-xs font-bold transition-all ${showThermal ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                         <Thermometer className="w-4 h-4" /> Thermal Gradient
                      </button>
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                         <span className="flex items-center gap-2 text-slate-600"><AlertTriangle className="w-4 h-4 text-amber-500" /> DRC Errors</span>
                         <span className="font-bold text-slate-800">0</span>
                      </div>
                   </div>
                </div>

                {/* Optimization Chart */}
                <div>
                   <OptimizationChart />
                </div>

             </div>
           )}
        </div>
      </div>

      {/* MAIN CANVAS */}
      <div className="flex-1 flex flex-col h-full bg-slate-100 relative">
         
         {/* Top Bar */}
         <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
               {['ecad', 'mcad', 'firmware'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${activeTab === tab ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {tab}
                  </button>
               ))}
            </div>
            
            <div className="flex items-center gap-3">
               <div className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
                  <span className="font-bold text-slate-700">Power:</span> 7.15W | <span className="font-bold text-slate-700">Mass:</span> 4.8kg
               </div>
               <button className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all">
                  <Download className="w-3 h-3" /> Export Mfg Files
               </button>
            </div>
         </div>

         {/* Canvas Area */}
         <div className="flex-1 overflow-hidden relative flex items-center justify-center p-8 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]">
            
            {activeTab === 'ecad' && (
               <div className="relative w-[800px] h-[600px] bg-slate-800 rounded-xl shadow-2xl border-4 border-slate-700 overflow-hidden">
                  <div className="absolute top-0 left-0 bg-slate-700 text-white text-[10px] px-3 py-1 rounded-br-lg font-mono">PCB: MAIN_CONTROLLER_REV_A</div>
                  
                  {/* Traces */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                     {isRouted && NETLIST.map((net, i) => {
                        const start = components.find(c => c.id === net.from);
                        const end = components.find(c => c.id === net.to);
                        if (!start || !end) return null;
                        
                        const midX = (start.x + end.x) / 2;
                        const path = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
                        
                        return (
                           <g key={i}>
                              <path d={path} fill="none" stroke={net.type === 'power' ? '#f59e0b' : '#38bdf8'} strokeWidth={net.type === 'power' ? 4 : 2} opacity="0.8" className="animate-draw" />
                              <circle cx={start.x} cy={start.y} r="3" fill="#cbd5e1" />
                              <circle cx={end.x} cy={end.y} r="3" fill="#cbd5e1" />
                           </g>
                        );
                     })}
                  </svg>

                  {/* Components */}
                  {components.map(comp => (
                     <PcbComponent 
                        key={comp.id} 
                        comp={comp} 
                        showThermal={showThermal} 
                        isSelected={false} 
                        onClick={() => {}}
                     />
                  ))}

                  {/* ISO Barrier Visual */}
                  <div className="absolute right-[180px] top-0 bottom-0 w-2 bg-stripes-yellow opacity-30 border-l border-r border-yellow-500/50 flex flex-col justify-center items-center">
                     <span className="text-[10px] text-yellow-500 font-bold -rotate-90 whitespace-nowrap">ISO BARRIER</span>
                  </div>
               </div>
            )}

            {activeTab === 'mcad' && (
               <div className="w-[600px] h-[500px] bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col items-center justify-center relative">
                  <Wind className="w-32 h-32 text-slate-200 absolute animate-pulse" />
                  <div className="z-10 text-center">
                     <h3 className="text-xl font-bold text-slate-700 mb-2">Mechanical Enclosure (Generated)</h3>
                     <p className="text-slate-500 text-sm mb-6">Parametric model generated via CadQuery script.</p>
                     <div className="grid grid-cols-2 gap-4 text-left bg-slate-50 p-6 rounded-lg border border-slate-100">
                        <div>
                           <div className="text-[10px] text-slate-400 uppercase">Dimensions</div>
                           <div className="font-mono font-bold text-slate-700">120 x 90 x 25 mm</div>
                        </div>
                        <div>
                           <div className="text-[10px] text-slate-400 uppercase">Material</div>
                           <div className="font-mono font-bold text-slate-700">Medical ABS (White)</div>
                        </div>
                        <div>
                           <div className="text-[10px] text-slate-400 uppercase">IP Rating</div>
                           <div className="font-mono font-bold text-sky-600">IP54 (Splash Proof)</div>
                        </div>
                        <div>
                           <div className="text-[10px] text-slate-400 uppercase">Ventilation</div>
                           <div className="font-mono font-bold text-orange-600">Active (Fan Mount)</div>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'firmware' && (
               <div className="w-full max-w-2xl h-[500px] bg-[#1e1e1e] rounded-xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
                  <div className="bg-[#252526] px-4 py-2 flex items-center justify-between border-b border-black">
                     <div className="flex items-center gap-2 text-xs text-slate-300">
                        <Code className="w-4 h-4 text-blue-400" />
                        <span>main_controller.c</span>
                     </div>
                     <span className="text-[10px] text-green-500">● Formal Verification Passed</span>
                  </div>
                  <pre className="flex-1 p-4 font-mono text-xs text-slate-300 overflow-auto">
{`/* * Helix-Twin Auto-Generated Firmware
 * Target: Nordic nRF52840 (ARM Cortex-M4)
 * Compliance: IEC 62304 Class B
 */

#include "helix_core.h"
#include "safety_logic.h"

// Defined Constraints from Layer 1
#define MAX_PRESSURE_CMH2O  40.0
#define WATCHDOG_TIMEOUT_MS 100

void main(void) {
    // 1. Hardware Init
    sys_clock_init();
    gpio_init(VALVE_PIN, GPIO_OUT);
    adc_init(SENSOR_PIN);
    
    // 2. Safety Watchdog
    wdt_enable(WATCHDOG_TIMEOUT_MS);

    // 3. Main Loop (RTOS Task 1)
    while (1) {
        float pressure = read_sensor();
        
        // Critical Safety Logic (ISO 14971 Control)
        if (pressure > MAX_PRESSURE_CMH2O) {
            gpio_set(VALVE_PIN, HIGH); // OPEN RELIEF VALVE
            log_event(EVT_OVERPRESSURE);
        } else {
            // Normal PID Control
            run_pid_loop(pressure);
        }
        
        wdt_feed();
        os_delay(10);
    }
}`}
                  </pre>
               </div>
            )}

         </div>

         {/* Bottom Log Panel */}
         <div className="h-32 bg-white border-t border-slate-200 flex flex-col">
            <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
               <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Terminal className="w-3 h-3" /> Hardware Agent Console
               </span>
               <span className="text-[10px] text-slate-400">v2.4.0-stable</span>
            </div>
            <div className="flex-1 p-2 overflow-y-auto font-mono text-[11px] space-y-1">
               {logs.map((log, i) => (
                  <div key={i} className="text-slate-600 border-b border-slate-50 pb-0.5 last:border-0">{log}</div>
               ))}
            </div>
         </div>

      </div>
    </div>
  );
}
