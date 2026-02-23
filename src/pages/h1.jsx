import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Activity, 
  Database, 
  Wind, 
  Zap, 
  FileText, 
  Terminal, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight, 
  Code, 
  Layers, 
  Play, 
  Save,
  Search,
  Settings,
  ShieldCheck,
  Microscope,
  Menu,
  X
} from 'lucide-react';

// --- MOCK KNOWLEDGE BASE ---
const KNOWLEDGE_GRAPH_STUB = {
  standards: {
    "ventilator": ["ISO 80601-2-12", "IEC 60601-1-8", "ISO 14971"],
    "infusion_pump": ["IEC 60601-2-24", "ISO 14971"],
    "cgm": ["ISO 15197", "IEC 60601-1-11"]
  },
  components: {
    "battery": { standard: "IEC 62133", param: "capacity_Ah" },
    "enclosure": { standard: "IEC 60529", param: "ip_rating" }
  }
};

// --- HELPER COMPONENTS ---

const TerminalLine = ({ text, type = 'info', delay = 0 }) => {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  const colors = {
    info: 'text-sky-600',
    success: 'text-emerald-600',
    warning: 'text-orange-500',
    error: 'text-red-500',
    system: 'text-slate-500'
  };

  return (
    <div className={`font-mono text-xs md:text-sm mb-1 ${colors[type]} flex items-start animate-fade-in`}>
      <span className="mr-2 opacity-50 text-slate-400">[{new Date().toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
      <span>{text}</span>
    </div>
  );
};

const SysMLBlock = ({ code }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-4 font-mono text-sm overflow-x-auto relative group shadow-sm ring-1 ring-slate-100">
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button className="bg-sky-100 hover:bg-sky-200 text-xs px-2 py-1 rounded text-sky-700 font-medium" onClick={() => navigator.clipboard.writeText(code)}>
        Copy
      </button>
    </div>
    <pre>
      <code className="language-sysml text-slate-700">
        {code.split('\n').map((line, i) => (
          <div key={i} className="table-row">
            <span className="table-cell select-none text-slate-400 text-right pr-4 w-8">{i + 1}</span>
            <span className="table-cell">{line}</span>
          </div>
        ))}
      </code>
    </pre>
  </div>
);

const RequirementCard = ({ req }) => (
  <div className="bg-white border-l-4 border-sky-500 p-3 mb-2 rounded-r flex justify-between items-start animate-slide-in shadow-sm border-t border-r border-b border-slate-100 hover:shadow-md transition-shadow">
    <div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-sky-600">{req.id}</span>
        <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-100 font-medium">{req.type}</span>
      </div>
      <p className="text-sm text-slate-700 mt-1 font-medium">{req.text}</p>
      <div className="mt-2 flex gap-2">
        {req.tags.map(tag => (
          <span key={tag} className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 border border-slate-200 rounded">
            {tag}
          </span>
        ))}
      </div>
    </div>
    <div className="flex flex-col items-end">
       {req.verified ? (
         <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-[10px] font-bold border border-emerald-100">
            <CheckCircle className="w-3 h-3" /> Verified
         </div>
       ) : (
         <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full text-[10px] font-bold border border-orange-100">
           <AlertTriangle className="w-3 h-3" /> Pending GraphRAG
         </div>
       )}
    </div>
  </div>
);

// --- MAIN APPLICATION ---

export default function HelixTwinL1() {
  const [activeTab, setActiveTab] = useState('intent');
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [generatedReqs, setGeneratedReqs] = useState([]);
  const [sysmlCode, setSysmlCode] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Simulated Agent Logic (The "Brain" of Layer 1)
  const processIntent = async () => {
    if (!userInput.trim()) return;
    
    setIsProcessing(true);
    setLogs([]);
    setGeneratedReqs([]);
    setSysmlCode('');

    // Step 1: Ingestion
    addLog("Helix-Twin Semantic Engine Initialized...", 'system', 0);
    addLog(`Ingesting User Intent: "${userInput.substring(0, 40)}..."`, 'info', 500);

    // Step 2: Entity Recognition (Simulated)
    setTimeout(() => {
      addLog("NLP: Performing Named Entity Recognition (NER)...", 'system');
      
      let deviceType = "GenericMedicalDevice";
      let standardRef = "ISO 13485";
      
      // Heuristic Keyword Matching
      if (userInput.toLowerCase().includes("ventilator")) {
        deviceType = "VentilatorSystem";
        standardRef = "ISO 80601-2-12";
        addLog("Identified System of Interest: VENTILATOR (Class IIb/III)", 'success');
        addLog(`Mapping Regulatory Context: ${standardRef}`, 'warning');
      } else if (userInput.toLowerCase().includes("cgm") || userInput.toLowerCase().includes("glucose")) {
        deviceType = "ContinuousGlucoseMonitor";
        standardRef = "ISO 15197";
        addLog("Identified System of Interest: CGM (Class IIa)", 'success');
      }

      // Step 3: Constraint Extraction
      addLog("Extracting Functional Constraints...", 'info');
      const reqs = [];
      let sysmlProps = [];
      let counter = 1;

      // Battery Logic
      const battMatch = userInput.match(/(\d+)\s*(hour|h|hr|day|d)/i);
      if (battMatch) {
        const val = battMatch[1];
        const unit = battMatch[2].startsWith('d') ? 'd' : 'h';
        const reqId = `REQ-PWR-${String(counter++).padStart(3, '0')}`;
        reqs.push({
          id: reqId,
          type: 'Functional',
          text: `The system shall operate for a minimum of ${val}${unit} on internal battery power.`,
          tags: ['Power', 'IEC 62133'],
          verified: false
        });
        sysmlProps.push(`    attribute batteryLife: Time >= ${val} [${unit}];`);
        addLog(`Constraint Extracted: Battery Life >= ${val}${unit}`, 'success');
      }

      // Weight Logic
      const weightMatch = userInput.match(/(\d+)\s*(kg|g|lb)/i);
      if (weightMatch) {
        const val = weightMatch[1];
        const unit = weightMatch[2];
        const reqId = `REQ-MECH-${String(counter++).padStart(3, '0')}`;
        reqs.push({
          id: reqId,
          type: 'Physical',
          text: `The total system mass shall not exceed ${val}${unit}.`,
          tags: ['Mechanical', 'Usability'],
          verified: false
        });
        sysmlProps.push(`    attribute totalMass: Mass <= ${val} [${unit}];`);
        addLog(`Constraint Extracted: Max Weight <= ${val}${unit}`, 'success');
      }

      // Default Regulatory Req
      reqs.push({
        id: `REQ-REG-${String(counter++).padStart(3, '0')}`,
        type: 'Regulatory',
        text: `The system shall comply with ${standardRef} basic safety and essential performance requirements.`,
        tags: ['Compliance', standardRef],
        verified: true
      });

      setGeneratedReqs(reqs);

      // Step 4: SysML v2 Generation
      setTimeout(() => {
        addLog("Generating SysML v2 Architecture...", 'system');
        const code = `package ${deviceType}Model {
  import ISQ::*;
  import ${standardRef.replace(/[\s-]/g, '_')}::*;

  requirement def SystemRequirements {
    doc /* Auto-generated from Natural Language Intent */
${reqs.map(r => `    /* ${r.id}: ${r.text} */`).join('\n')}
  }

  part def ${deviceType} {
    // Extracted Parametric Constraints
${sysmlProps.join('\n')}
    
    // Default Subsystems based on Ontology
    part powerSubsystem: PowerUnit;
    part controlUnit: ProcessingUnit;
    ${deviceType.includes('Ventilator') ? 'part pneumaticUnit: PneumaticAssembly;' : ''}
    ${deviceType.includes('Glucose') ? 'part sensorUnit: BioSensor;' : ''}
  }
}`;
        setSysmlCode(code);
        setIsProcessing(false);
        addLog("Layer 1 Processing Complete. Ready for GraphRAG (Layer 2).", 'success');
      }, 1000);

    }, 1500);
  };

  const addLog = (text, type, delay = 0) => {
    setLogs(prev => [...prev, { text, type, delay }]);
  };

  // Preset Prompts
  const loadPrompt = (type) => {
    if (type === 'ventilator') {
      setUserInput("Design a portable emergency ventilator compliant with ISO 80601-2-12. It must have a battery life of at least 4 hours and weigh less than 5kg for transport.");
    } else if (type === 'cgm') {
      setUserInput("I need a wearable Continuous Glucose Monitor (CGM) that lasts 14 days on a coin cell battery. It must be water resistant (IPX7) and use Bluetooth LE.");
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20 shadow-sm`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/30">
                <Activity className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-800">Helix<span className="text-sky-500">Twin</span></span>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors">
            {isSidebarOpen ? <Menu className="w-5 h-5" /> : <Menu className="w-5 h-5 mx-auto" />}
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          <NavItem icon={Terminal} label="L1: Intent Engine" active={true} expanded={isSidebarOpen} />
          <NavItem icon={Database} label="L2: Knowledge Helix" active={false} expanded={isSidebarOpen} />
          <NavItem icon={Cpu} label="L3: Generative Core" active={false} expanded={isSidebarOpen} />
          <NavItem icon={Settings} label="L4: Calibration" active={false} expanded={isSidebarOpen} />
          <NavItem icon={Play} label="L5: Simulation" active={false} expanded={isSidebarOpen} />
          <NavItem icon={ShieldCheck} label="L6: Compliance" active={false} expanded={isSidebarOpen} />
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          {isSidebarOpen ? (
            <div className="text-xs text-slate-500 space-y-1">
              <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> System Online</p>
              <p>Model: <span className="font-semibold text-slate-700">Llama-3-70b</span></p>
              <p>Graph: <span className="font-semibold text-slate-700">Neo4j (Active)</span></p>
            </div>
          ) : (
            <div className="w-2 h-2 bg-emerald-500 rounded-full mx-auto animate-pulse"></div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full relative bg-slate-50">
        
        {/* HEADER */}
        <header className="h-16 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-6 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <span className="bg-sky-100 text-sky-700 px-2.5 py-1 rounded-md text-xs border border-sky-200 font-mono font-bold tracking-wide">LAYER 1</span>
            <h1 className="font-semibold text-slate-800 text-lg">Semantic Intent & Requirement Decomposition</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm text-slate-500 hover:text-sky-600 flex items-center gap-1.5 transition-colors font-medium">
              <Save className="w-4 h-4" /> Save Session
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-md">
              AE
            </div>
          </div>
        </header>

        {/* WORKSPACE GRID */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* LEFT PANEL: INPUT & CONVERSATION */}
          <div className="w-full md:w-1/2 flex flex-col border-r border-slate-200 bg-white">
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm mb-6 ring-1 ring-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <div className="p-1.5 bg-orange-100 rounded-md">
                    <Microscope className="w-5 h-5 text-orange-600" />
                  </div>
                  Engineering Objective
                </h2>
                <p className="text-slate-500 text-sm mb-4 leading-relaxed">
                  Describe the system you wish to design. Include functional constraints (battery life, weight), clinical goals, and target compliance standards.
                </p>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-800 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all font-mono text-sm resize-none h-32 placeholder-slate-400 shadow-inner"
                  placeholder="E.g., Design a portable ventilator with >4h battery life..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                />
                
                <div className="flex justify-between items-center mt-4 pt-2">
                  <div className="flex gap-2">
                    <button onClick={() => loadPrompt('ventilator')} className="text-xs bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full transition-all border border-slate-200 hover:border-sky-300 font-medium shadow-sm">
                      Ventilator
                    </button>
                    <button onClick={() => loadPrompt('cgm')} className="text-xs bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full transition-all border border-slate-200 hover:border-sky-300 font-medium shadow-sm">
                      CGM Device
                    </button>
                  </div>
                  <button 
                    onClick={processIntent}
                    disabled={isProcessing || !userInput}
                    className={`px-6 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all shadow-md ${isProcessing || !userInput ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200' : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-200 hover:shadow-sky-300 transform hover:-translate-y-0.5'}`}
                  >
                    {isProcessing ? (
                      <>Processing <span className="animate-spin">⟳</span></>
                    ) : (
                      <>Initialize Agent <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>

              {/* AGENT LOGS (Traceability) */}
              <div className="bg-white rounded-xl border border-slate-200 font-mono h-[calc(100%-20rem)] flex flex-col shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Terminal className="w-3 h-3" /> Agent Logic Trace
                  </span>
                  <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">ID: TRACE-{Math.floor(Math.random()*10000)}</span>
                </div>
                <div className="flex-1 p-4 overflow-y-auto bg-white">
                  {logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm italic">
                      <div className="w-16 h-1 bg-slate-100 rounded-full mb-2"></div>
                      Waiting for input... System Standby.
                    </div>
                  )}
                  {logs.map((log, idx) => (
                    <TerminalLine key={idx} text={log.text} type={log.type} delay={log.delay * idx} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: GENERATED ARTIFACTS */}
          <div className="w-full md:w-1/2 flex flex-col bg-slate-50/50">
            {/* TABS */}
            <div className="flex border-b border-slate-200 bg-white px-4 pt-2 gap-2">
              <TabButton active={activeTab === 'intent'} onClick={() => setActiveTab('intent')} icon={FileText} label="Requirements" />
              <TabButton active={activeTab === 'sysml'} onClick={() => setActiveTab('sysml')} icon={Code} label="SysML v2 Model" />
              <TabButton active={activeTab === 'graph'} onClick={() => setActiveTab('graph')} icon={Database} label="Knowledge Context" />
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'intent' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-slate-700">Decomposed Requirements</h3>
                    <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded border border-sky-100">Format: ReqIF/JSON</span>
                  </div>
                  
                  {generatedReqs.length > 0 ? (
                    generatedReqs.map((req, i) => (
                      <RequirementCard key={i} req={req} />
                    ))
                  ) : (
                    <EmptyState text="No requirements generated yet. Run the agent to decompose intent." />
                  )}
                </div>
              )}

              {activeTab === 'sysml' && (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-700">Generated System Model</h3>
                    <div className="flex gap-2">
                       <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 flex items-center gap-1 font-medium"><CheckCircle className="w-3 h-3" /> Syntax Valid</span>
                    </div>
                  </div>
                  {sysmlCode ? (
                    <SysMLBlock code={sysmlCode} />
                  ) : (
                     <EmptyState text="Waiting for constraints to generate SysML v2 structure." />
                  )}
                  {sysmlCode && (
                    <div className="mt-4 p-3 bg-sky-50 border border-sky-100 rounded-md text-xs text-sky-800 flex gap-2 items-start">
                      <div className="mt-0.5 p-1 bg-sky-100 rounded-full"><ChevronRight className="w-3 h-3 text-sky-600" /></div>
                      <div>
                        <strong>Next Step:</strong> This architecture block will be passed to Layer 3 (Hardware Agent) to resolve the 'PowerUnit' and 'PneumaticAssembly' parts into actual BOM items via GraphRAG.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'graph' && (
                <div>
                   <h3 className="text-sm font-bold text-slate-700 mb-4">Regulatory & Ontology Context (Layer 2 Preview)</h3>
                   <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-xs text-slate-500 mb-6 font-medium">The Semantic Engine retrieves these contexts to ground the requirements.</p>
                      
                      <div className="space-y-6">
                        <div className="relative pl-4 border-l-2 border-purple-400">
                           <div className="text-xs font-bold text-purple-600 uppercase mb-2">Standard Cluster</div>
                           <div className="flex flex-wrap gap-2">
                             {['ISO 13485 (Quality)', 'ISO 14971 (Risk)', 'IEC 60601-1 (Safety)', 'ISO 62366 (Usability)'].map(s => (
                               <div key={s} className="bg-purple-50 text-purple-700 px-2.5 py-1.5 rounded-md text-xs border border-purple-100 font-medium">{s}</div>
                             ))}
                           </div>
                        </div>

                        <div className="relative pl-4 border-l-2 border-emerald-400">
                           <div className="text-xs font-bold text-emerald-600 uppercase mb-2">Domain Ontology</div>
                           <div className="grid grid-cols-2 gap-3">
                             <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                               <div className="text-[10px] uppercase text-emerald-500 font-bold mb-1">Component</div>
                               <div className="text-sm font-medium text-slate-700">Battery_LiIon</div>
                             </div>
                             <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                               <div className="text-[10px] uppercase text-emerald-500 font-bold mb-1">Property</div>
                               <div className="text-sm font-medium text-slate-700">Nominal_Voltage</div>
                             </div>
                             <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 col-span-2">
                               <div className="text-[10px] uppercase text-emerald-500 font-bold mb-1">Constraint</div>
                               <div className="text-sm font-medium text-slate-700">Discharge_Rate</div>
                             </div>
                           </div>
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function NavItem({ icon: Icon, label, active, expanded }) {
  return (
    <div className={`flex items-center px-4 py-3 cursor-pointer transition-all border-l-4 group ${active ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
      <Icon className={`w-5 h-5 min-w-[20px] transition-colors ${active ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
      {expanded && <span className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all">{label}</span>}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all rounded-t-lg border-t border-x ${active ? 'border-slate-200 border-b-white bg-white text-sky-600 shadow-sm relative top-[1px]' : 'border-transparent bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
    >
      <Icon className={`w-4 h-4 ${active ? 'text-sky-500' : 'text-slate-400'}`} />
      {label}
    </button>
  );
}

function EmptyState({ text }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
        <Layers className="w-8 h-8 text-slate-300" />
      </div>
      <p className="text-sm max-w-[200px] text-center font-medium">{text}</p>
    </div>
  );
}
