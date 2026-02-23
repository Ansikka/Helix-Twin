import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Search,
  Share2,
  Shield,
  AlertTriangle,
  CheckCircle,
  Terminal,
  FileText,
  Cpu,
  Zap,
  ArrowRight,
  RefreshCw,
  Lock,
  Network,
  Menu,
  Sparkles,
  Bot
} from 'lucide-react';

// --- GEMINI API CONFIGURATION ---
const apiKey = ""; // API Key provided by execution environment

// --- MOCK KNOWLEDGE GRAPH DATA (The "Truth") ---
const GRAPH_NODES = [
  // Components
  { id: 'C1', label: 'LiPo-3000', type: 'Component', category: 'Power', specs: { voltage: 3.7, capacity_mAh: 3000, discharge_C: 2 }, x: 100, y: 300 },
  { id: 'C2', label: 'LiPo-5000', type: 'Component', category: 'Power', specs: { voltage: 3.7, capacity_mAh: 5000, discharge_C: 5 }, x: 100, y: 150 },
  { id: 'C3', label: 'nRF52840', type: 'Component', category: 'MCU', specs: { voltage: 3.3, current_sleep: '1.5uA' }, x: 400, y: 100 },
  { id: 'C4', label: 'Blower-5V', type: 'Component', category: 'Pneumatic', specs: { voltage: 5.0, flow_max: '20L/min' }, x: 400, y: 300 },

  // Standards
  { id: 'S1', label: 'IEC 62133', type: 'Standard', desc: 'Secondary cells safety', x: 250, y: 50 },
  { id: 'S2', label: 'ISO 14971', type: 'Standard', desc: 'Risk Management', x: 600, y: 50 },
  { id: 'S3', label: 'ISO 80601-2-12', type: 'Standard', desc: 'Ventilator Safety', x: 600, y: 350 },

  // Hazards
  { id: 'H1', label: 'Thermal Runaway', type: 'Hazard', severity: 5, x: 250, y: 400 },
  { id: 'H2', label: 'Air Embolism', type: 'Hazard', severity: 5, x: 700, y: 200 }
];

const GRAPH_EDGES = [
  { source: 'C1', target: 'S1', label: 'COMPLIES_WITH' },
  { source: 'C2', target: 'S1', label: 'COMPLIES_WITH' },
  { source: 'C1', target: 'H1', label: 'HAS_RISK' },
  { source: 'C2', target: 'H1', label: 'HAS_RISK' },
  { source: 'C3', target: 'S2', label: 'REQUIRES' },
  { source: 'C4', target: 'S3', label: 'COMPLIES_WITH' },
  { source: 'C4', target: 'C3', label: 'CONTROLLED_BY' }, // Blower controlled by MCU
  { source: 'S2', target: 'H1', label: 'MITIGATES' }
];

// --- GEMINI HELPER FUNCTION ---
async function callGemini(prompt) {
  try {
    // Retry logic with exponential backoff
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            }),
          }
        );

        if (!response.ok) throw new Error(`API call failed: ${response.status}`);

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Analysis unavailable.";
      } catch (e) {
        attempt++;
        if (attempt === maxRetries) throw e;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI Service Unavailable (Using fallback logic).";
  }
}

// --- HELPER COMPONENTS ---

const TerminalBlock = ({ logs }) => (
  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 font-mono text-xs md:text-sm h-full overflow-y-auto shadow-inner ring-1 ring-orange-100">
    {logs.length === 0 && <span className="text-orange-400 italic">System Ready. Waiting for query...</span>}
    {logs.map((log, i) => (
      <div key={i} className={`mb-1 animate-fade-in ${
        log.type === 'query' ? 'text-sky-600 font-medium' : 
        log.type === 'error' ? 'text-red-500' : 
        log.type === 'success' ? 'text-emerald-600' : 
        log.type === 'ai' ? 'text-purple-600 italic' :
        'text-slate-600'
      }`}>
        <span className="opacity-50 mr-2 text-orange-400">{log.ts}</span>
        {log.type === 'query' && <span className="text-purple-500 mr-2">$</span>}
        {log.type === 'ai' && <span className="text-purple-500 mr-2">✨</span>}
        {log.text}
      </div>
    ))}
    <div className="animate-pulse text-orange-500 font-bold mt-2">_</div>
  </div>
);

const NodeDetails = ({ node, currentRequirement }) => {
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Reset analysis when node changes
  useEffect(() => {
    setAnalysis(null);
    setAnalyzing(false);
  }, [node]);

  const runAnalysis = async () => {
    if (!node) return;
    setAnalyzing(true);
    
    const prompt = `
      You are a Medical Device Compliance Officer (ISO 13485/14971).
      
      Context:
      Component: ${node.label} (${node.type})
      Specs: ${JSON.stringify(node.specs || {})}
      Requirement: "${currentRequirement || 'General safety check'}"
      
      Task:
      Analyze if this component is suitable for the requirement. 
      Identify 1 key risk and 1 key benefit. 
      Keep response under 40 words. Use bullet points.
    `;

    const result = await callGemini(prompt);
    setAnalysis(result);
    setAnalyzing(false);
  };

  if (!node) return <div className="text-emerald-600/70 text-sm italic text-center mt-10 p-4 border-2 border-dashed border-emerald-200 rounded-lg bg-emerald-100/20">Select a node to view properties</div>;
  
  const getIcon = (type) => {
    switch(type) {
      case 'Component': return <Cpu className="w-5 h-5 text-sky-600" />;
      case 'Standard': return <Shield className="w-5 h-5 text-purple-600" />;
      case 'Hazard': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default: return <Database className="w-5 h-5" />;
    }
  };

  const getHeaderColor = (type) => {
     switch(type) {
      case 'Component': return 'bg-sky-50 border-sky-100 text-sky-700';
      case 'Standard': return 'bg-purple-50 border-purple-100 text-purple-700';
      case 'Hazard': return 'bg-orange-50 border-orange-100 text-orange-700';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 animate-slide-in shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 ${getHeaderColor(node.type)} p-3 rounded-lg -mx-1`}>
        {getIcon(node.type)}
        <span className="font-bold text-lg">{node.label}</span>
        <span className="text-xs bg-white/80 px-2 py-0.5 rounded-full ml-auto font-medium shadow-sm">{node.type}</span>
      </div>
      
      <div className="space-y-3 px-1 flex-1 overflow-y-auto">
        {node.specs && Object.entries(node.specs).map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm group border-b border-slate-50 pb-1 last:border-0">
            <span className="text-slate-500 font-medium">{k}:</span>
            <span className="text-sky-700 font-mono bg-sky-50 px-1.5 rounded">{v}</span>
          </div>
        ))}
        {node.desc && <p className="text-sm text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100">{node.desc}</p>}
        {node.severity && (
           <div className="flex justify-between text-sm items-center bg-red-50 p-2 rounded border border-red-100">
             <span className="text-slate-600">Severity (1-5):</span>
             <span className="text-red-600 font-bold bg-white px-2 py-0.5 rounded border border-red-200 shadow-sm">{node.severity}</span>
           </div>
        )}

        {/* AI Analysis Block */}
        <div className="mt-6">
          <button 
            onClick={runAnalysis}
            disabled={analyzing}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2 px-4 rounded-lg text-xs font-bold shadow-md transition-all hover:shadow-lg disabled:opacity-70"
          >
            {analyzing ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3 text-yellow-300" />}
            {analyzing ? "Consulting AI Agent..." : "Generate AI Compliance Check"}
          </button>
          
          {analysis && (
            <div className="mt-3 bg-purple-50 border border-purple-100 rounded-lg p-3 text-xs text-purple-900 leading-relaxed shadow-inner animate-fade-in relative">
               <Bot className="w-4 h-4 text-purple-400 absolute top-2 right-2 opacity-50" />
               <div className="font-bold mb-1 text-purple-700">AI Assistant Findings:</div>
               <div className="markdown-prose">{analysis}</div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-auto pt-3 border-t border-slate-100">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Provenance</span>
        <div className="flex items-center gap-1.5 mt-1.5 bg-emerald-50 text-emerald-700 p-2 rounded border border-emerald-100">
            <Lock className="w-3 h-3 text-emerald-500" />
            <span className="text-xs font-semibold">Verified (Datasheet Ingest)</span>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION ---

export default function HelixTwinL2() {
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState([]);
  const [activeNode, setActiveNode] = useState(null);
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [schemaValid, setSchemaValid] = useState(true);

  // SVG Refs for interactivity
  const svgRef = useRef(null);

  const addLog = (text, type = 'info') => {
    const ts = new Date().toLocaleTimeString([], { hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
    setLogs(prev => [...prev, { text, type, ts }]);
  };

  // --- CORE LOGIC: GraphRAG Execution ---
  
  const executeGraphQuery = async (sysmlReq) => {
    setIsProcessing(true);
    setHighlightedNodes([]);
    setActiveNode(null);
    setLogs([]); // Clear logs for new run

    addLog(`Received L1 Requirement: "${sysmlReq}"`, 'system');
    addLog("Consulting Gemini to construct Cypher Query...", 'ai');

    // 1. Generate Cypher (Real AI Call)
    let cypher = "";
    try {
      const aiPrompt = `Convert this medical device requirement into a Neo4j Cypher query: "${sysmlReq}".
      Schema: (:Component {category, specs.capacity_mAh, id})
      Example: MATCH (c:Component {category: 'Power'}) WHERE c.specs.capacity_mAh >= 4000 RETURN c
      Only return the query string.`;
      
      const generatedCypher = await callGemini(aiPrompt);
      // Fallback if AI fails or returns conversational text (simplified for demo)
      cypher = generatedCypher.includes("MATCH") ? generatedCypher : "MATCH (c:Component) WHERE ... [AI Fallback]";
      
      // Override for the demo logic to ensure the graph lights up correctly
      if (sysmlReq.includes("batteryLife")) {
         cypher = "MATCH (c:Component {category: 'Power'}) WHERE c.specs.capacity_mAh >= 4000 RETURN c"; // Enforce logic for demo
      }
    } catch (e) {
      cypher = "MATCH (n) RETURN n LIMIT 5 // Fallback";
    }

    addLog(cypher, 'query');

    // 2. Schema Validation (Safety Step)
    if (cypher.includes("DELETE") || cypher.includes("DROP")) {
      addLog("Security Alert: Malicious Query Detected", 'error');
      setSchemaValid(false);
      setIsProcessing(false);
      return;
    }
    addLog("Schema Validation: PASS", 'success');

    // 3. Execution (Simulated Graph DB Response)
    setTimeout(() => {
      // Simple logic to find nodes based on the mock query intent
      let results = [];
      if (sysmlReq.includes("batteryLife")) {
          results = GRAPH_NODES.filter(n => n.category === 'Power' && n.specs && n.specs.capacity_mAh >= 4000);
      } else if (sysmlReq.includes("Ventilator")) {
          results = GRAPH_NODES.filter(n => n.id === 'S3');
      }

      if (results.length > 0) {
          setHighlightedNodes(results.map(n => n.id));
          addLog(`Graph Retrieval: Found ${results.length} matching nodes.`, 'success');
          setActiveNode(results[0]); // Auto-select first result
      } else {
          addLog("Graph Retrieval: No matching nodes found.", 'error');
      }
      setIsProcessing(false);
    }, 800);
  };

  // Mock Input from L1
  const loadScenario = (type) => {
    if (type === 'battery') {
      const req = "REQ-PWR-001: batteryLife >= 4 hours (Load ~1A)";
      setQuery(req);
      executeGraphQuery(req);
    } else if (type === 'standard') {
      const req = "REQ-REG-001: Compliance with Ventilator Safety";
      setQuery(req);
      executeGraphQuery(req);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* SIDEBAR (Minimal Context) */}
      <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-4 z-20 shadow-sm">
        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
           <Database className="text-white w-6 h-6" />
        </div>
        <div className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 cursor-pointer transition-colors" title="Switch to L1">
            <FileText className="w-5 h-5" />
        </div>
        <div className="p-2 bg-purple-50 rounded-lg text-purple-600 border border-purple-100 cursor-default shadow-sm" title="Current: L2 Knowledge Graph">
            <Share2 className="w-5 h-5" />
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full bg-slate-50">
        {/* HEADER */}
        <header className="h-14 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-6 z-10 sticky top-0">
          <div>
            <h1 className="font-semibold text-slate-800 flex items-center gap-2 text-lg">
              <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 text-sm font-bold">Layer 2</span> Knowledge Helix (GraphRAG)
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 font-medium">
                <Shield className="w-3 h-3" /> Schema Guard: Active
             </div>
             <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-sky-50 border border-sky-200 rounded-full text-sky-700 font-medium">
                <Network className="w-3 h-3" /> Neo4j Connection: Stable
             </div>
          </div>
        </header>

        {/* MAIN SPLIT VIEW */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT: GRAPH VISUALIZER */}
            <div className="flex-1 bg-white relative overflow-hidden flex flex-col">
               
               {/* Controls Overlay */}
               <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <button onClick={() => loadScenario('battery')} className="bg-white hover:bg-orange-50 text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 flex items-center gap-2 transition-all shadow-md hover:shadow-lg hover:border-orange-200 group">
                     <div className="bg-orange-100 p-1 rounded-full group-hover:bg-orange-200 transition-colors"><Zap className="w-3 h-3 text-orange-600" /></div>
                     <span className="font-medium">Simulate L1: Find Battery (&gt;4h)</span>
                  </button>
                  <button onClick={() => loadScenario('standard')} className="bg-white hover:bg-purple-50 text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 flex items-center gap-2 transition-all shadow-md hover:shadow-lg hover:border-purple-200 group">
                     <div className="bg-purple-100 p-1 rounded-full group-hover:bg-purple-200 transition-colors"><FileText className="w-3 h-3 text-purple-600" /></div>
                     <span className="font-medium">Simulate L1: Find Standard</span>
                  </button>
               </div>

               {/* Graph Area */}
               <div className="flex-1 relative cursor-move bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
                  <svg className="w-full h-full" ref={svgRef}>
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                        </marker>
                    </defs>
                    
                    {/* Render Edges */}
                    {GRAPH_EDGES.map((edge, i) => {
                        const start = GRAPH_NODES.find(n => n.id === edge.source);
                        const end = GRAPH_NODES.find(n => n.id === edge.target);
                        return (
                            <g key={i}>
                                <line 
                                    x1={start.x} y1={start.y} 
                                    x2={end.x} y2={end.y} 
                                    stroke="#cbd5e1" 
                                    strokeWidth="2" 
                                    markerEnd="url(#arrowhead)"
                                />
                                <rect 
                                    x={(start.x + end.x) / 2 - 25} 
                                    y={(start.y + end.y) / 2 - 10} 
                                    width="50" height="14" 
                                    fill="white" 
                                    rx="4"
                                    fillOpacity="0.9"
                                />
                                <text 
                                    x={(start.x + end.x) / 2} 
                                    y={(start.y + end.y) / 2} 
                                    textAnchor="middle" 
                                    className="text-[9px] fill-slate-500 font-mono font-bold uppercase tracking-wider"
                                    dy="3"
                                >
                                    {edge.label}
                                </text>
                            </g>
                        );
                    })}

                    {/* Render Nodes */}
                    {GRAPH_NODES.map((node) => {
                        const isHighlighed = highlightedNodes.includes(node.id);
                        const isActive = activeNode?.id === node.id;
                        
                        // Node Colors
                        let fill = '#ffffff';
                        let stroke = '#cbd5e1';
                        
                        if (node.type === 'Component') {
                            fill = '#f0f9ff'; stroke = '#0ea5e9'; // Sky
                        } else if (node.type === 'Standard') {
                            fill = '#f3e8ff'; stroke = '#9333ea'; // Purple
                        } else {
                            fill = '#fff7ed'; stroke = '#f97316'; // Orange
                        }

                        if (isHighlighed) {
                            stroke = '#22d3ee'; // Bright Cyan highlight
                            fill = '#ecfeff';
                        }
                        if (isActive) {
                            stroke = '#0f172a'; // Dark Slate for active
                            fill = '#ffffff';
                        }

                        return (
                            <g 
                                key={node.id} 
                                className="cursor-pointer transition-all duration-300"
                                onClick={() => setActiveNode(node)}
                            >
                                <circle 
                                    cx={node.x} 
                                    cy={node.y} 
                                    r={isActive ? 28 : 22} 
                                    fill={fill} 
                                    stroke={stroke}
                                    strokeWidth={isHighlighed ? 3 : isActive ? 2.5 : 2}
                                    className={`${isHighlighed ? 'animate-pulse' : ''} transition-all drop-shadow-sm`}
                                />
                                <text 
                                    x={node.x} 
                                    y={node.y + 40} 
                                    textAnchor="middle" 
                                    className={`text-[10px] font-bold pointer-events-none select-none bg-white/80 px-1 rounded ${isHighlighed ? 'fill-sky-600' : 'fill-slate-600'}`}
                                >
                                    {node.label}
                                </text>
                            </g>
                        );
                    })}
                  </svg>
                  
                  {/* Legend */}
                  <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-xl border border-slate-200 text-xs shadow-lg backdrop-blur-sm">
                     <div className="flex items-center gap-2 mb-1.5"><span className="w-3 h-3 rounded-full bg-sky-100 border-2 border-sky-500"></span> Component</div>
                     <div className="flex items-center gap-2 mb-1.5"><span className="w-3 h-3 rounded-full bg-purple-100 border-2 border-purple-600"></span> Standard</div>
                     <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-100 border-2 border-orange-500"></span> Hazard</div>
                  </div>
               </div>

               {/* Bottom Terminal */}
               <div className="h-48 border-t border-orange-200 bg-orange-50 flex flex-col">
                  <div className="px-4 py-2 bg-orange-100 border-b border-orange-200 text-xs font-bold tracking-wide text-orange-800 flex justify-between items-center uppercase">
                      <span className="flex items-center gap-2"><Terminal className="w-3 h-3 text-orange-600" /> Agent-to-Graph Log</span>
                      <span className="flex items-center gap-1 bg-white/60 px-2 py-0.5 rounded text-[10px] text-orange-700 hover:bg-white cursor-pointer transition-colors"><RefreshCw className="w-3 h-3" /> Auto-Scroll</span>
                  </div>
                  <div className="flex-1 p-2 bg-orange-50">
                      <TerminalBlock logs={logs} />
                  </div>
               </div>

            </div>

            {/* RIGHT: INSPECTOR */}
            <div className="w-80 bg-emerald-50 border-l border-emerald-200 flex flex-col shadow-lg z-10">
                <div className="p-4 border-b border-emerald-100 bg-emerald-100/50">
                    <h2 className="text-sm font-bold text-emerald-900 uppercase tracking-wide mb-1 flex items-center gap-2">
                        <Search className="w-4 h-4 text-emerald-600" /> Node Inspector
                    </h2>
                    <p className="text-[11px] text-emerald-700 leading-tight">
                        Live details retrieved from the "Truth" source (Datasheet/Standard).
                    </p>
                </div>
                <div className="p-4 flex-1 overflow-y-auto bg-emerald-50">
                    <NodeDetails node={activeNode} currentRequirement={query} />
                </div>
                
                {/* Status Footer */}
                <div className="p-4 bg-emerald-100/30 border-t border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-600 mb-3 uppercase tracking-wider">Knowledge Graph Metrics</div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-lg text-center border border-emerald-100 shadow-sm">
                            <div className="text-xl font-black text-slate-700">4</div>
                            <div className="text-[10px] font-bold text-emerald-500 uppercase mt-1">Components</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg text-center border border-emerald-100 shadow-sm">
                            <div className="text-xl font-black text-slate-700">3</div>
                            <div className="text-[10px] font-bold text-emerald-500 uppercase mt-1">Standards</div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
