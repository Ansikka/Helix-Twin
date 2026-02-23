import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Globe,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  Truck,
  Lock,
  Search,
  Scale,
  Menu
} from 'lucide-react';

// --- MOCK DATA: INHERITED BOM (From Layer 3) ---
const INPUT_BOM = [
  { id: 'MCU-001', mpn: 'nRF52840-QIAA', category: 'IC', risk_profile: 'Low', origin: 'Taiwan' },
  { id: 'BAT-001', mpn: 'LIPO-5000-30C', category: 'Battery', risk_profile: 'High', origin: 'China' },
  { id: 'PWR-002', mpn: 'TPS63020', category: 'Power', risk_profile: 'Medium', origin: 'USA' },
  { id: 'SEN-001', mpn: 'AD5940', category: 'Sensor', risk_profile: 'Low', origin: 'Ireland' },
  { id: 'CAP-999', mpn: 'CC0603-LEGACY', category: 'Passive', risk_profile: 'Low', origin: 'China' } // EOL Trap
];

// --- MOCK KNOWLEDGE BASE: HAZARDS (ISO 14971) ---
const HAZARD_DB = {
  'Battery': [
    { id: 'H-01', hazard: 'Thermal Runaway', severity: 5, prob: 4, mitigation: 'Battery Management System (BMS)', mitigation_id: 'REQ-PWR-005' },
    { id: 'H-02', hazard: 'Electrolyte Leakage', severity: 3, prob: 2, mitigation: 'Sealed Enclosure (IP67)', mitigation_id: 'REQ-MECH-010' }
  ],
  'HighVoltage': [
    { id: 'H-03', hazard: 'Electric Shock', severity: 5, prob: 3, mitigation: 'Galvanic Isolation > 4kV', mitigation_id: 'REQ-SAF-001' }
  ],
  'Sensor': [
    { id: 'H-04', hazard: 'Biocompatibility Failure', severity: 4, prob: 2, mitigation: 'ISO 10993 Certified Materials', mitigation_id: 'REQ-MAT-003' }
  ]
};

// --- MOCK API: SILICON EXPERT (Supply Chain) ---
const checkSupplyChainAPI = (mpn) => {
  if (mpn.includes('LEGACY')) return { status: 'EOL', yteol: 0, risk: 'Critical', alt: 'CC0603-NEXTGEN' };
  if (mpn.includes('nRF')) return { status: 'Active', yteol: 8, risk: 'Low', alt: null };
  if (mpn.includes('LIPO')) return { status: 'Active', yteol: 3, risk: 'Medium', alt: 'LIPO-5000-GEN2' }; // Geopolitical risk
  return { status: 'Active', yteol: 10, risk: 'Low', alt: null };
};

// --- HELPER: RPN CALCULATOR ---
const calculateRPN = (sev, prob) => {
  const score = sev * prob;
  let color = 'bg-emerald-500';
  if (score >= 10) color = 'bg-red-500';
  else if (score >= 6) color = 'bg-amber-500';
  return { score, color };
};

// --- CHART COMPONENT (SVG) ---
const RiskMatrixChart = ({ data }) => {
  // Simple scatter plot of Risk Severity vs. YTEOL
  return (
    <div className="w-full h-64 bg-white rounded-lg border border-slate-200 p-4 relative">
      <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 absolute top-2 left-4">Risk Landscape: Safety vs. Obsolescence</h4>
      <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
        {/* Background Zones */}
        <rect x="0" y="0" width="100" height="200" fill="#fef2f2" /> {/* High Risk Zone (Left - Low YTEOL) */}
        <rect x="100" y="0" width="300" height="200" fill="#f0fdf4" /> {/* Safe Zone */}
        
        {/* Axes */}
        <line x1="40" y1="180" x2="380" y2="180" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="40" y1="180" x2="40" y2="20" stroke="#cbd5e1" strokeWidth="1" />
        
        {/* Labels */}
        <text x="210" y="195" fontSize="10" fill="#64748b" textAnchor="middle">Years to End-of-Life (YTEOL)</text>
        <text x="15" y="100" fontSize="10" fill="#64748b" textAnchor="middle" transform="rotate(-90 15,100)">Hazard Severity</text>

        {/* Data Points */}
        {data.map((item, i) => {
           // Normalize: YTEOL 0-10 -> x 40-380, Severity 1-5 -> y 180-20
           const cx = 40 + (item.yteol / 10) * 340;
           const cy = 180 - (item.hazard_sev / 5) * 160;
           const color = item.status === 'EOL' ? '#ef4444' : item.hazard_sev >= 4 ? '#f97316' : '#10b981';
           
           return (
             <g key={i}>
                <circle cx={cx} cy={cy} r="6" fill={color} stroke="white" strokeWidth="1" />
                <text x={cx} y={cy - 10} fontSize="8" fill="#475569" textAnchor="middle">{item.mpn.split('-')[0]}</text>
             </g>
           );
        })}
      </svg>
    </div>
  );
};

// --- MAIN APPLICATION ---

export default function HelixTwinL6() {
  const [activeTab, setActiveTab] = useState('risk'); // risk, supply
  const [analyzing, setAnalyzing] = useState(false);
  const [fmeaTable, setFmeaTable] = useState([]);
  const [supplyReport, setSupplyReport] = useState([]);
  const [complianceStatus, setComplianceStatus] = useState('PENDING');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- LOGIC: AUTOMATED FMEA GENERATION ---
  const runRiskAnalysis = () => {
    setAnalyzing(true);
    setComplianceStatus('PENDING');
    
    setTimeout(() => {
      const report = [];
      let failCount = 0;

      INPUT_BOM.forEach(part => {
        const hazards = HAZARD_DB[part.category] || [];
        // Default entry if no specific hazards found for visualization
        if(hazards.length === 0) {
             report.push({
                part: part.mpn, hazard: 'General Failure', severity: 1, pre_prob: 1, mitigation: 'Standard QA', implemented: true, post_prob: 1, rpn: calculateRPN(1, 1)
             });
        }
        hazards.forEach(h => {
          const mitigationImplemented = Math.random() > 0.3; 
          const finalProb = mitigationImplemented ? Math.max(1, h.prob - 2) : h.prob;
          
          report.push({
            part: part.mpn,
            hazard: h.hazard,
            severity: h.severity,
            pre_prob: h.prob,
            mitigation: h.mitigation,
            implemented: mitigationImplemented,
            post_prob: finalProb,
            rpn: calculateRPN(h.severity, finalProb)
          });

          if (!mitigationImplemented && (h.severity * finalProb) >= 10) failCount++;
        });
      });

      setFmeaTable(report);
      setAnalyzing(false);
      if (failCount > 0) setComplianceStatus('FAIL');
    }, 1500);
  };

  // --- LOGIC: SUPPLY CHAIN CHECK ---
  const runSupplyCheck = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const report = INPUT_BOM.map(part => {
        const data = checkSupplyChainAPI(part.mpn);
        // Mock hazard sev for visualization
        const hazard_sev = HAZARD_DB[part.category]?.[0]?.severity || 1; 
        return { ...part, ...data, hazard_sev };
      });
      setSupplyReport(report);
      setAnalyzing(false);
      
      const hasEOL = report.some(r => r.status === 'EOL');
      if (hasEOL) setComplianceStatus('FAIL');
      else if (complianceStatus !== 'FAIL') setComplianceStatus('PASS'); 
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20 shadow-sm`}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/30">
               <ShieldCheck className="text-white w-5 h-5" />
             </div>
             {isSidebarOpen && <span className="font-bold text-lg tracking-tight text-slate-800">Helix<span className="text-emerald-500">Twin</span></span>}
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-emerald-50 rounded text-slate-400">
             <Menu className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-6 flex-1 overflow-y-auto">
           
           {/* Actions */}
           <div className="space-y-3">
              <button 
                onClick={() => { setActiveTab('risk'); runRiskAnalysis(); }}
                className={`w-full py-3 rounded-lg text-xs font-bold flex items-center justify-between px-4 border transition-all ${activeTab === 'risk' ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                 <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> ISO 14971 FMEA
                 </div>
                 {activeTab === 'risk' && analyzing && <RefreshCw className="w-3 h-3 animate-spin" />}
              </button>

              <button 
                onClick={() => { setActiveTab('supply'); runSupplyCheck(); }}
                className={`w-full py-3 rounded-lg text-xs font-bold flex items-center justify-between px-4 border transition-all ${activeTab === 'supply' ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                 <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Supply Chain Map
                 </div>
                 {activeTab === 'supply' && analyzing && <RefreshCw className="w-3 h-3 animate-spin" />}
              </button>
           </div>

           {/* Gatekeeper Status */}
           <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Design Release Gate</div>
              <div className="flex items-center justify-center py-4 bg-slate-50 rounded-lg">
                 {complianceStatus === 'PENDING' && <div className="text-slate-500 font-bold flex items-center gap-2"><Lock className="w-5 h-5" /> CHECK REQUIRED</div>}
                 {complianceStatus === 'PASS' && <div className="text-emerald-600 font-bold flex items-center gap-2 text-xl animate-pulse"><CheckCircle className="w-6 h-6" /> APPROVED</div>}
                 {complianceStatus === 'FAIL' && <div className="text-red-600 font-bold flex items-center gap-2 text-xl animate-pulse"><XCircle className="w-6 h-6" /> BLOCKED</div>}
              </div>
              <div className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                 {complianceStatus === 'FAIL' ? 'Critical Non-Conformities Detected' : complianceStatus === 'PASS' ? 'Ready for Layer 7 (Dashboard)' : 'Awaiting Audit Scans'}
              </div>
           </div>

        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
         
         {/* Header */}
         <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between px-8 z-10 sticky top-0">
            <div>
               <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {activeTab === 'risk' ? <span className="text-red-600">Compliance Sentinel</span> : <span className="text-amber-600">Supply Chain Intelligence</span>}
               </h1>
               <p className="text-xs text-slate-500 font-medium">
                  {activeTab === 'risk' ? 'Automated Risk Analysis (ISO 14971)' : 'Obsolescence & Geopolitical Risk Monitoring'}
               </p>
            </div>
            <div className="flex gap-2">
               <button className="px-3 py-1.5 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 font-bold flex items-center gap-2 transition-colors shadow-sm">
                  <FileText className="w-3 h-3" /> Export Report
               </button>
            </div>
         </div>

         {/* Content Area */}
         <div className="flex-1 p-8 overflow-y-auto">
            
            {/* VIEW 1: RISK TABLE */}
            {activeTab === 'risk' && (
              <div className="w-full space-y-6">
                 {fmeaTable.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                       <Scale className="w-12 h-12 mb-4 opacity-50" />
                       <p className="font-medium">Initiate Risk Analysis to generate FMEA matrix.</p>
                    </div>
                 ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                           <thead className="bg-slate-50 border-b border-slate-200">
                              <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                 <th className="p-4">Component / ID</th>
                                 <th className="p-4">Hazard</th>
                                 <th className="p-4 text-center">Sev</th>
                                 <th className="p-4 text-center">Prob</th>
                                 <th className="p-4">Mitigation</th>
                                 <th className="p-4 text-center">Implemented</th>
                                 <th className="p-4 text-center">RPN</th>
                              </tr>
                           </thead>
                           <tbody className="text-sm divide-y divide-slate-100">
                              {fmeaTable.map((row, i) => (
                                 <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-mono text-xs font-bold text-slate-600">{row.part}</td>
                                    <td className="p-4 text-slate-700 font-medium">{row.hazard}</td>
                                    <td className="p-4 text-center text-slate-600">{row.severity}</td>
                                    <td className="p-4 text-center text-slate-600">{row.pre_prob}</td>
                                    <td className="p-4 text-slate-500 text-xs italic">{row.mitigation}</td>
                                    <td className="p-4 text-center">
                                       {row.implemented ? 
                                          <span className="text-emerald-700 text-[10px] font-bold px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-full">YES</span> : 
                                          <span className="text-red-700 text-[10px] font-bold px-2 py-1 bg-red-50 border border-red-100 rounded-full animate-pulse">MISSING</span>
                                       }
                                    </td>
                                    <td className="p-4 text-center">
                                       <span className={`inline-block px-2.5 py-1 rounded text-white font-bold text-xs shadow-sm ${row.rpn.color}`}>
                                          {row.rpn.score}
                                       </span>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                    </div>
                 )}
              </div>
            )}

            {/* VIEW 2: SUPPLY CHAIN MAP */}
            {activeTab === 'supply' && (
               <div className="space-y-6">
                  {supplyReport.length > 0 && <RiskMatrixChart data={supplyReport} />}
                  
                  <div className="grid grid-cols-1 gap-4">
                     {supplyReport.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <Truck className="w-12 h-12 mb-4 opacity-50" />
                          <p className="font-medium">Scanning Global Distributors...</p>
                       </div>
                     ) : (
                        supplyReport.map((item, i) => (
                           <div key={i} className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all hover:shadow-md ${item.status === 'EOL' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                              <div className="flex items-center gap-4">
                                 <div className={`w-1.5 h-12 rounded-full ${item.status === 'EOL' ? 'bg-red-500' : item.risk === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                 <div>
                                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                       {item.mpn}
                                       {item.status === 'EOL' && <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-bold">OBSOLETE</span>}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 font-medium">
                                       {item.category} • {item.origin}
                                    </div>
                                 </div>
                              </div>
                              
                              <div className="flex items-center gap-8 text-right">
                                 <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">YTEOL</div>
                                    <div className={`text-lg font-bold ${item.yteol < 5 ? 'text-red-600' : 'text-emerald-600'}`}>{item.yteol} Yrs</div>
                                 </div>
                                 <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Risk</div>
                                    <div className="text-sm text-slate-600 font-medium">{item.risk}</div>
                                 </div>
                                 {item.alt ? (
                                    <div className="text-xs bg-white text-sky-700 px-3 py-2 rounded-lg border border-sky-200 shadow-sm">
                                       <div className="font-bold text-sky-800">Recommendation:</div>
                                       <div>Swap for <span className="font-mono font-bold">{item.alt}</span></div>
                                    </div>
                                 ) : (
                                    <div className="w-32"></div>
                                 )}
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            )}

         </div>
      </div>
    </div>
  );
}
