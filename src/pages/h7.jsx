import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Activity,
  Clock,
  Layers,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Wind,
  Zap,
  Search,
  ChevronRight,
  ChevronDown,
  Maximize,
  FileText,
  Share2,
  Menu
} from 'lucide-react';

// --- MOCK AAS HIERARCHY (Asset Administration Shell) ---
const AAS_TREE = {
  id: 'ROOT', label: 'Ventilator_Helix_V1', type: 'System', status: 'WARNING', children: [
    {
      id: 'SUB-1', label: 'Pneumatic_Unit', type: 'Subsystem', status: 'PASS', children: [
        { id: 'CMP-1', label: 'Turbine_Blower', type: 'Component', status: 'PASS', val: '12,000 RPM' },
        { id: 'CMP-2', label: 'Flow_Sensor', type: 'Component', status: 'PASS', val: '45 L/min' }
      ]
    },
    {
      id: 'SUB-2', label: 'Power_Unit', type: 'Subsystem', status: 'WARNING', children: [
        { id: 'CMP-3', label: 'LiPo_Battery_Pack', type: 'Component', status: 'WARNING', val: '14.2 V', alert: 'High Internal Resistance' },
        { id: 'CMP-4', label: 'BMS_Circuit', type: 'Component', status: 'PASS', val: 'Active' }
      ]
    },
    {
      id: 'SUB-3', label: 'Control_Unit', type: 'Subsystem', status: 'PASS', children: [
        { id: 'CMP-5', label: 'nRF52840_MCU', type: 'Component', status: 'PASS', val: 'Sleep Mode' }
      ]
    }
  ]
};

// --- MOCK TIME-SERIES DATA (For Time Travel) ---
const generateHistory = () => {
  const data = [];
  for (let i = 0; i < 600; i++) { // 60 seconds of data
    data.push({
      t: i / 10,
      pressure: 20 + Math.sin(i / 10) * 5,
      flow: 30 + Math.cos(i / 10) * 10,
      voltage: 16 - (i / 600) * 2 // Dropping voltage
    });
  }
  return data;
};

// --- HELPER: RECURSIVE TREE COMPONENT ---
const TreeItem = ({ node, depth = 0, onSelect, selectedId }) => {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedId === node.id;

  return (
    <div className="select-none">
      <div
        onClick={() => onSelect(node)}
        className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer transition-colors border-l-2 ${isSelected ? 'bg-sky-50 border-sky-500' : 'border-transparent hover:bg-slate-50'}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className={`p-0.5 rounded hover:bg-slate-200 text-slate-400 ${!node.children ? 'invisible' : ''}`}
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {node.status === 'PASS' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
        {node.status === 'WARNING' && <AlertTriangle className="w-3 h-3 text-orange-500 animate-pulse" />}
        {node.status === 'FAIL' && <AlertTriangle className="w-3 h-3 text-red-500" />}

        <span className={`text-xs font-mono ${isSelected ? 'text-sky-700 font-bold' : 'text-slate-600'}`}>{node.label}</span>
      </div>

      {expanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeItem key={child.id} node={child} depth={depth + 1} onSelect={onSelect} selectedId={selectedId} />
          ))}
        </div>
      )}
    </div>
  );
};

// --- MAIN APPLICATION ---

export default function HelixTwinL7() {
  const [selectedNode, setSelectedNode] = useState(AAS_TREE);
  const [historyData, setHistoryData] = useState([]);
  const [playbackTime, setPlaybackTime] = useState(60); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    setHistoryData(generateHistory());
  }, []);

  // Playback Logic
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackTime(prev => (prev >= 60 ? 0 : prev + 0.1));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentSnapshot = historyData[Math.floor(playbackTime * 10)] || {};

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">

      {/* LEFT: HIERARCHY NAVIGATOR (AAS) */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-slate-200 flex flex-col z-20 shadow-sm transition-all duration-300`}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          {isSidebarOpen && (
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/30">
                  <LayoutDashboard className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-lg tracking-tight text-slate-800">Helix<span className="text-sky-500">Twin</span></span>
             </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
             <Menu className="w-4 h-4" />
          </button>
        </div>
        
        {isSidebarOpen && (
          <>
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-2 top-1.5 w-3 h-3 text-slate-400" />
                <input type="text" placeholder="Search AAS ID..." className="w-full bg-white border border-slate-200 rounded-md pl-7 py-1 text-xs text-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              <TreeItem node={AAS_TREE} onSelect={setSelectedNode} selectedId={selectedNode?.id} />
            </div>

            {/* System Health Footer */}
            <div className="p-4 border-t border-slate-100 bg-white">
              <div className="text-[10px] text-slate-400 uppercase mb-2 font-bold tracking-wider">Overall System Health</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-[85%] h-full bg-orange-400"></div>
                </div>
                <span className="text-xs font-bold text-orange-500">85%</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-orange-400" /> 1 Critical Warning
              </div>
            </div>
          </>
        )}
      </div>

      {/* CENTER: TWIN VISUALIZATION & TIME TRAVEL */}
      <div className="flex-1 flex flex-col bg-slate-50 relative">

        {/* Top Bar */}
        <div className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between px-6 z-10 sticky top-0">
          <h1 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-500" />
            {selectedNode.type} View: <span className="text-sky-600">{selectedNode.label}</span>
          </h1>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 font-medium flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-all">
              <Share2 className="w-3 h-3 text-sky-500" /> Share Digital Thread
            </button>
            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 font-medium flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-all">
              <FileText className="w-3 h-3 text-sky-500" /> Generate Report
            </button>
          </div>
        </div>

        {/* Visualization Area */}
        <div className="flex-1 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] relative overflow-hidden flex items-center justify-center">

          {/* The "Twin" Representation */}
          <div className="relative w-96 h-96 border-4 border-white rounded-full bg-slate-100 shadow-xl flex items-center justify-center animate-float">
            <div className="absolute inset-0 border-2 border-sky-200 rounded-full animate-ping-slow opacity-50"></div>
            <div className="absolute inset-0 bg-white rounded-full opacity-50"></div>

            {/* Central Icon based on Selection */}
            <div className="z-10 relative">
               {selectedNode.label.includes('Battery') ? (
                 <Zap className="w-24 h-24 text-orange-400 drop-shadow-sm" />
               ) : selectedNode.label.includes('Turbine') ? (
                 <Wind className="w-24 h-24 text-sky-500 drop-shadow-sm" />
               ) : (
                 <Activity className="w-24 h-24 text-emerald-500 drop-shadow-sm" />
               )}
            </div>

            {/* Data Floating Badges */}
            {selectedNode.val && (
              <div className="absolute -top-6 bg-white border border-slate-200 px-4 py-1.5 rounded-full text-sm font-mono text-slate-700 shadow-md font-bold z-20">
                {selectedNode.val}
              </div>
            )}
            {selectedNode.alert && (
              <div className="absolute -bottom-6 bg-red-50 border border-red-200 px-4 py-1.5 rounded-full text-xs font-bold text-red-600 shadow-md flex items-center gap-2 animate-bounce z-20">
                <AlertTriangle className="w-4 h-4" /> {selectedNode.alert}
              </div>
            )}
          </div>
        </div>

        {/* Time Travel Scrubber */}
        <div className="h-32 bg-white border-t border-slate-200 p-4 flex flex-col shadow-lg z-10">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all shadow-md ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-sky-500 hover:bg-sky-600'}`}
              >
                {isPlaying ? <div className="w-2 h-2 bg-white rounded-sm" /> : <div className="ml-0.5 w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent" />}
              </button>
              <div className="text-xs font-mono text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded">
                T - {Math.abs(60 - playbackTime).toFixed(2)}s
              </div>
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-2">
               <Clock className="w-3 h-3" /> Time-Travel Debugger
            </div>
          </div>

          {/* Scrubber Track */}
          <div className="relative h-12 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden cursor-crosshair group">
            {/* Waveform Visualization (Mock) */}
            <svg className="absolute inset-0 w-full h-full opacity-50" preserveAspectRatio="none">
              <path d="M0,24 Q50,5 100,24 T200,24 T300,40 T400,10 T500,24 T600,24" fill="none" stroke="#38bdf8" strokeWidth="2" />
            </svg>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-sky-500 z-10"
              style={{ left: `${(playbackTime / 60) * 100}%` }}
            >
              <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-sky-500 rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform ring-2 ring-white"></div>
            </div>

            <input
              type="range"
              min="0" max="60" step="0.1"
              value={playbackTime}
              onChange={(e) => { setIsPlaying(false); setPlaybackTime(parseFloat(e.target.value)); }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />
          </div>
        </div>
      </div>

      {/* RIGHT: INSPECTOR PANEL */}
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col z-20 shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Telemetry</h2>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">

          {/* Context Aware Panels */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wide">Pressure (L5 Simulation)</div>
            <div className="text-2xl font-mono text-sky-600 font-bold">{currentSnapshot.pressure?.toFixed(1)} <span className="text-sm text-slate-400 font-sans">cmH2O</span></div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wide">Flow Rate (L5 Simulation)</div>
            <div className="text-2xl font-mono text-emerald-600 font-bold">{currentSnapshot.flow?.toFixed(1)} <span className="text-sm text-slate-400 font-sans">L/min</span></div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wide">Battery Voltage (L4 Calibration)</div>
            <div className="text-2xl font-mono text-orange-500 font-bold">{currentSnapshot.voltage?.toFixed(2)} <span className="text-sm text-slate-400 font-sans">V</span></div>
            <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-300 to-orange-500" style={{ width: `${(currentSnapshot.voltage / 16) * 100}%` }}></div>
            </div>
          </div>

          {/* Drill Down Actions */}
          <div className="mt-8">
            <div className="text-[10px] text-slate-400 uppercase mb-3 font-bold tracking-wider">Deep Dive Actions</div>
            <button className="w-full text-left p-3 rounded-lg bg-white hover:bg-sky-50 border border-slate-200 text-xs text-slate-600 font-medium mb-2 flex justify-between items-center transition-all group shadow-sm hover:border-sky-200">
              Open Datasheet (PDF) <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500" />
            </button>
            <button className="w-full text-left p-3 rounded-lg bg-white hover:bg-sky-50 border border-slate-200 text-xs text-slate-600 font-medium mb-2 flex justify-between items-center transition-all group shadow-sm hover:border-sky-200">
              View Source Code (L3) <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500" />
            </button>
            <button className="w-full text-left p-3 rounded-lg bg-white hover:bg-sky-50 border border-slate-200 text-xs text-slate-600 font-medium flex justify-between items-center transition-all group shadow-sm hover:border-sky-200">
              Check Compliance (L6) <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500" />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
