import { useState, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Upload, 
  Key, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Table as TableIcon,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Download,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { 
  Step, 
  AppState, 
  Observation, 
  APILogEntry
} from '../types';
import { callGemini, PROMPTS } from '../lib/gemini';

export default function TheveninSolver({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<AppState>({
    apiKey: "",
    imageBase64: "",
    imageMimeType: "image/jpeg",
    currentStep: 1,
    completedSteps: [],
    circuitData: null,
    meshData: null,
    kvlData: null,
    solveData: null,
    vthData: null,
    rthData: null,
    verifyData: null,
    vth: null,
    rth: null,
    rl: null,
    il: null,
    observations: [],
    apiLog: []
  });

  const [screen, setScreen] = useState<'setup' | 'solver'>('setup');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'observations' | 'logs'>('observations');
  const [rlInput, setRlInput] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setState(prev => ({
        ...prev,
        imageBase64: base64,
        imageMimeType: file.type
      }));
    };
    reader.readAsDataURL(file);
  };

  const logAPI = (step: string, prompt: string, response: any) => {
    const entry: APILogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      step,
      promptSnippet: prompt.substring(0, 100) + "...",
      responseSnippet: JSON.stringify(response).substring(0, 100) + "..."
    };
    setState(prev => ({
      ...prev,
      apiLog: [entry, ...prev.apiLog]
    }));
  };

  const startAnalysis = async () => {
    if (!state.apiKey || !state.imageBase64) return;
    setScreen('solver');
    await runStep2();
  };

  // --- Step Logic ---

  const runStep2 = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callGemini(state.apiKey, PROMPTS.IDENTIFY, state.imageBase64, state.imageMimeType);
      logAPI("Step 2: Identification", PROMPTS.IDENTIFY, data);
      
      if (!data.can_solve) {
        throw new Error(data.cannot_solve_reason || "Circuit cannot be solved with Thevenin's Theorem.");
      }

      setState(prev => ({
        ...prev,
        circuitData: data,
        currentStep: 2
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmStep2 = () => {
    setState(prev => ({ ...prev, completedSteps: [...prev.completedSteps, 2], currentStep: 3 }));
  };

  const runStep3 = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prompt = PROMPTS.MESH_SETUP(
        JSON.stringify(state.circuitData),
        state.circuitData!.load_resistor_id,
        state.circuitData!.load_terminals.positive,
        state.circuitData!.load_terminals.negative
      );
      const data = await callGemini(state.apiKey, prompt, state.imageBase64, state.imageMimeType);
      logAPI("Step 3: Mesh Setup", prompt, data);

      setState(prev => ({
        ...prev,
        meshData: data,
        currentStep: 3
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const runStep4 = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prompt = PROMPTS.KVL(
        JSON.stringify(state.circuitData),
        JSON.stringify(state.meshData),
        state.circuitData!.load_resistor_id,
        `${state.circuitData!.load_terminals.positive}-${state.circuitData!.load_terminals.negative}`
      );
      const data = await callGemini(state.apiKey, prompt, state.imageBase64, state.imageMimeType);
      logAPI("Step 4: KVL", prompt, data);

      setState(prev => ({
        ...prev,
        kvlData: data,
        currentStep: 4
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const runStep5 = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prompt = PROMPTS.SOLVE(JSON.stringify(state.kvlData!.kvl_equations));
      const data = await callGemini(state.apiKey, prompt);
      logAPI("Step 5: Solve KVL", prompt, data);

      setState(prev => ({
        ...prev,
        solveData: data,
        currentStep: 5
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const runStep6 = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prompt = PROMPTS.VTH(
        JSON.stringify(state.circuitData),
        JSON.stringify(state.solveData!.mesh_current_values),
        state.circuitData!.load_terminals.positive,
        state.circuitData!.load_terminals.negative
      );
      const data = await callGemini(state.apiKey, prompt);
      logAPI("Step 6: Vth", prompt, data);

      setState(prev => ({
        ...prev,
        vthData: data,
        vth: data.vth_value,
        currentStep: 6
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const recordVth = () => {
    const obs: Observation = {
      id: Math.random().toString(36).substr(2, 9),
      step: 6,
      parameter: "Thevenin Voltage",
      symbol: "Vth",
      value: state.vthData!.vth_value.toString(),
      unit: "V"
    };
    setState(prev => ({
      ...prev,
      observations: [...prev.observations, obs],
      completedSteps: [...prev.completedSteps, 3, 4, 5, 6],
      currentStep: 7
    }));
  };

  const runStep8 = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prompt = PROMPTS.RTH(
        JSON.stringify(state.circuitData),
        `${state.circuitData!.load_terminals.positive}-${state.circuitData!.load_terminals.negative}`
      );
      const data = await callGemini(state.apiKey, prompt);
      logAPI("Step 8: Rth", prompt, data);

      setState(prev => ({
        ...prev,
        rthData: data,
        rth: data.rth_value,
        currentStep: 8
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const recordRth = () => {
    const obs: Observation = {
      id: Math.random().toString(36).substr(2, 9),
      step: 8,
      parameter: "Thevenin Resistance",
      symbol: "Rth",
      value: state.rthData!.rth_value.toString(),
      unit: "Ω"
    };
    setState(prev => ({
      ...prev,
      observations: [...prev.observations, obs],
      completedSteps: [...prev.completedSteps, 7, 8],
      currentStep: 9
    }));
  };

  const calculateIL = () => {
    const rl = parseFloat(rlInput);
    if (isNaN(rl)) return;
    const il = state.vth! / (state.rth! + rl);
    setState(prev => ({
      ...prev,
      rl,
      il,
      currentStep: 10
    }));
  };

  const recordIL = () => {
    const obs: Observation = {
      id: Math.random().toString(36).substr(2, 9),
      step: 10,
      parameter: "Load Current",
      symbol: "IL",
      value: state.il!.toFixed(4),
      unit: "A"
    };
    setState(prev => ({
      ...prev,
      observations: [...prev.observations, obs],
      completedSteps: [...prev.completedSteps, 9, 10],
      currentStep: 11
    }));
    runStep11();
  };

  const runStep11 = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prompt = PROMPTS.VERIFY(
        JSON.stringify(state.circuitData),
        state.rl!,
        state.vth!,
        state.rth!,
        state.il!
      );
      const data = await callGemini(state.apiKey, prompt);
      logAPI("Step 11: Verification", prompt, data);

      setState(prev => ({
        ...prev,
        verifyData: data,
        currentStep: 11
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const completeExperiment = () => {
    setState(prev => ({ ...prev, completedSteps: [...prev.completedSteps, 11], currentStep: 12 }));
  };

  const resetAll = () => {
    setState({
      apiKey: "",
      imageBase64: "",
      imageMimeType: "image/jpeg",
      currentStep: 1,
      completedSteps: [],
      circuitData: null,
      meshData: null,
      kvlData: null,
      solveData: null,
      vthData: null,
      rthData: null,
      verifyData: null,
      vth: null,
      rth: null,
      rl: null,
      il: null,
      observations: [],
      apiLog: []
    });
    setScreen('setup');
    setRlInput("");
  };

  // --- Renderers ---

  const renderStepContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-teal-accent rounded-full animate-pulse" />
            <div className="w-3 h-3 bg-teal-accent rounded-full animate-pulse [animation-delay:0.2s]" />
            <div className="w-3 h-3 bg-teal-accent rounded-full animate-pulse [animation-delay:0.4s]" />
          </div>
          <p className="text-teal-accent font-orbitron text-sm tracking-widest animate-pulse">ANALYZING CIRCUIT...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6 bg-danger-red/5 border border-danger-red rounded-xl space-y-4">
          <div className="flex items-center gap-3 text-danger-red">
            <AlertCircle className="w-6 h-6" />
            <h4 className="font-bold">Analysis Error</h4>
          </div>
          <p className="text-sm text-text-muted">{error}</p>
          <button 
            onClick={() => {
              if (state.currentStep === 2) runStep2();
              else if (state.currentStep === 3) runStep3();
              else if (state.currentStep === 4) runStep4();
              else if (state.currentStep === 5) runStep5();
              else if (state.currentStep === 6) runStep6();
              else if (state.currentStep === 8) runStep8();
              else if (state.currentStep === 11) runStep11();
            }}
            className="flex items-center gap-2 text-xs text-danger-red hover:underline"
          >
            <RefreshCw className="w-3 h-3" /> Retry Step
          </button>
        </div>
      );
    }

    switch (state.currentStep) {
      case 2:
        return state.circuitData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-orbitron text-teal-accent flex items-center gap-2">
              <Zap className="w-5 h-5" /> 📐 Circuit Identified
            </h3>
            <div className="flex flex-wrap gap-2">
              {state.circuitData.components.map(c => (
                <span key={c.id} className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  c.type === 'voltage_source' ? 'bg-teal-accent/10 border-teal-accent text-teal-accent' :
                  c.id === state.circuitData?.load_resistor_id ? 'bg-danger-red/10 border-danger-red text-danger-red' :
                  'bg-amber-accent/10 border-amber-accent text-amber-accent'
                }`}>
                  {c.id}: {c.value}
                </span>
              ))}
            </div>
            <blockquote className="border-l-4 border-border-dark pl-4 italic text-text-muted text-sm">
              {state.circuitData.topology_summary}
            </blockquote>
            <div className="space-y-2">
              <p className="text-xs text-text-muted uppercase tracking-widest">Mesh Loops Identified:</p>
              <div className="flex gap-4">
                {state.circuitData.meshes.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2 text-xs">
                    <div className={`w-3 h-3 rounded-full ${['bg-purple-500', 'bg-orange-500', 'bg-blue-500'][i % 3]}`} />
                    <span>{m.id} ({m.direction})</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={confirmStep2} className="btn-primary w-full">
              ✅ Confirm Identification — Proceed to Step 3
            </button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!state.meshData ? (
              <button onClick={runStep3} className="btn-primary w-full">
                Assign Mesh Current Variables
              </button>
            ) : (
              <>
                <h3 className="font-orbitron text-teal-accent">Mesh Current Assignments</h3>
                <div className="overflow-hidden rounded-xl border border-border-dark">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-bg-dark text-text-muted uppercase">
                      <tr>
                        <th className="px-4 py-2">Variable</th>
                        <th className="px-4 py-2">Mesh</th>
                        <th className="px-4 py-2">Direction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-dark">
                      {state.meshData.mesh_currents.map(m => (
                        <tr key={m.variable} className={m.description.toLowerCase().includes('zero') ? 'text-danger-red font-bold' : ''}>
                          <td className="px-4 py-3">{m.variable}</td>
                          <td className="px-4 py-3">{m.mesh_id}</td>
                          <td className="px-4 py-3">{m.direction}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-amber-accent/5 border border-amber-accent rounded-lg text-xs text-amber-accent italic">
                  {state.meshData.open_circuit_note}
                </div>
                <button onClick={runStep4} className="btn-primary w-full">
                  ➡️ Write KVL Equations
                </button>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-orbitron text-teal-accent">KVL Equations</h3>
            <div className="space-y-4">
              {state.kvlData?.kvl_equations.map((eq, i) => (
                <div key={eq.mesh} className="equation-card animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${i * 200}ms` }}>
                  <p className="text-[10px] text-text-muted uppercase mb-1">{eq.equation_label} - Mesh {eq.mesh}</p>
                  <p className="text-sm opacity-60">{eq.raw_equation}</p>
                  <p className="text-sm opacity-80">{eq.substituted_equation}</p>
                  <p className="text-teal-accent font-bold">{eq.simplified}</p>
                </div>
              ))}
            </div>
            <div className="p-4 bg-amber-accent/10 border border-amber-accent/30 rounded-lg text-sm text-amber-accent font-mono">
              {state.kvlData?.system_of_equations}
            </div>
            <button onClick={runStep5} className="btn-primary w-full">
              🔢 Solve the Equations
            </button>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-orbitron text-teal-accent">Solution Steps ({state.solveData?.method})</h3>
            <div className="space-y-3">
              {state.solveData?.solution_steps.map(s => (
                <div key={s.step_number} className="p-3 bg-bg-dark border border-border-dark rounded-lg">
                  <p className="text-[10px] text-text-muted uppercase mb-1">Step {s.step_number}: {s.operation}</p>
                  <p className="text-xs font-mono text-teal-accent">{s.expression}</p>
                  <p className="text-[10px] text-text-muted mt-1">Result: {s.result}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-4 justify-center">
              {state.solveData?.mesh_current_values.map(v => (
                <div key={v.variable} className="px-6 py-3 bg-amber-accent/10 border border-amber-accent rounded-xl text-center">
                  <span className="block text-[10px] text-text-muted uppercase">Value of {v.variable}</span>
                  <span className="text-xl font-bold text-amber-accent">{v.value} {v.unit}</span>
                </div>
              ))}
            </div>
            <button onClick={runStep6} className="btn-primary w-full">
              ⚡ Calculate Vth
            </button>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-orbitron text-teal-accent">Vth Derivation</h3>
            <div className="space-y-4">
              {state.vthData?.vth_derivation_steps.map((s, i) => (
                <div key={i} className="equation-card">
                  <p className="text-[10px] text-text-muted uppercase mb-1">{s.step}</p>
                  <p className="text-sm opacity-60">{s.expression}</p>
                  <p className="text-sm opacity-80">{s.substituted}</p>
                  <p className="text-teal-accent font-bold">{s.result}</p>
                </div>
              ))}
            </div>
            <div className="glowing-card text-center">
              <span className="block text-xs text-text-muted uppercase tracking-widest mb-2">Thevenin Equivalent Voltage</span>
              <h2 className="text-4xl font-orbitron text-teal-accent">Vth = {state.vthData?.vth_value} V</h2>
              <p className="text-[10px] text-text-muted mt-4 italic">{state.vthData?.physical_meaning}</p>
            </div>
            <button onClick={recordVth} className="btn-primary w-full">
              📋 Record Vth in Observations
            </button>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 bg-amber-accent/5 border border-amber-accent rounded-xl space-y-4">
              <div className="flex items-center gap-3 text-amber-accent">
                <Zap className="w-6 h-6" />
                <h4 className="font-orbitron">Deactivate Sources</h4>
              </div>
              <p className="text-sm text-text-muted">To find Rth, we must conceptually deactivate all independent sources:</p>
              <ul className="space-y-2 text-xs">
                {state.circuitData?.components.filter(c => c.type.includes('source')).map(c => (
                  <li key={c.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-accent rounded-full" />
                    <span>Replace <strong>{c.id}</strong> with a {c.type === 'voltage_source' ? 'SHORT CIRCUIT (wire)' : 'OPEN CIRCUIT (gap)'}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-xl overflow-hidden border border-border-dark">
              <img src={`data:${state.imageMimeType};base64,${state.imageBase64}`} className="w-full h-auto opacity-40 grayscale" />
              <div className="absolute inset-0 flex items-center justify-center bg-amber-accent/10">
                <span className="px-6 py-2 bg-amber-accent text-bg-dark font-orbitron font-bold text-sm tracking-widest rotate-[-5deg] shadow-xl">
                  SOURCES DEACTIVATED
                </span>
              </div>
            </div>
            <button onClick={runStep8} className="btn-primary w-full">
              ✅ Sources Deactivated — Calculate Rth
            </button>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-orbitron text-teal-accent">Rth Simplification</h3>
            <div className="space-y-4">
              {state.rthData?.simplification_steps.map((s, i) => (
                <div key={i} className="p-4 bg-bg-dark border border-border-dark rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-text-muted uppercase">Step {s.step_number}</span>
                    <span className="text-xs font-bold text-amber-accent">{s.operation}</span>
                  </div>
                  <div className="font-mono text-xs bg-black/40 p-3 rounded border border-border-dark text-text-muted">
                    {s.remaining_network_description}
                  </div>
                  <div className="text-sm font-mono text-teal-accent">
                    {s.expression} = {s.substituted} = {s.result}
                  </div>
                </div>
              ))}
            </div>
            <div className="glowing-card text-center">
              <span className="block text-xs text-text-muted uppercase tracking-widest mb-2">Thevenin Equivalent Resistance</span>
              <h2 className="text-4xl font-orbitron text-teal-accent">Rth = {state.rthData?.rth_value} Ω</h2>
              <p className="text-[10px] text-text-muted mt-4 font-mono">{state.rthData?.rth_formula}</p>
            </div>
            <button onClick={recordRth} className="btn-primary w-full">
              📋 Record Rth in Observations
            </button>
          </div>
        );

      case 9:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-orbitron text-teal-accent">Thevenin Equivalent Circuit</h3>
            <div className="bg-black border border-border-dark rounded-xl p-4 flex justify-center">
              <svg viewBox="0 0 400 300" className="w-full max-w-[400px]">
                {/* Loop */}
                <line x1="80" y1="240" x2="320" y2="240" stroke="#00d4aa" strokeWidth="2" />
                <line x1="80" y1="60" x2="160" y2="60" stroke="#00d4aa" strokeWidth="2" />
                <line x1="240" y1="60" x2="320" y2="60" stroke="#00d4aa" strokeWidth="2" />
                
                {/* Vth */}
                <line x1="80" y1="60" x2="80" y2="130" stroke="#00d4aa" strokeWidth="2" />
                <circle cx="80" cy="150" r="20" fill="#161b22" stroke="#ff6b6b" strokeWidth="2" />
                <text x="75" y="145" fill="#ff6b6b" fontSize="14" fontWeight="bold">+</text>
                <text x="75" y="165" fill="#e6edf3" fontSize="14" fontWeight="bold">−</text>
                <line x1="80" y1="170" x2="80" y2="240" stroke="#00d4aa" strokeWidth="2" />
                <text x="40" y="155" fill="#e6edf3" fontSize="12">Vth</text>
                <text x="40" y="170" fill="#ffd166" fontSize="10">{state.vth}V</text>

                {/* Rth */}
                <path d="M 160 60 L 165 52 L 175 68 L 185 52 L 195 68 L 205 52 L 215 68 L 220 60" fill="none" stroke="#e6edf3" strokeWidth="2" />
                <line x1="220" y1="60" x2="240" y2="60" stroke="#00d4aa" strokeWidth="2" />
                <text x="185" y="40" fill="#e6edf3" fontSize="12">Rth</text>
                <text x="185" y="30" fill="#ffd166" fontSize="10">{state.rth}Ω</text>

                {/* RL */}
                <line x1="320" y1="60" x2="320" y2="130" stroke="#00d4aa" strokeWidth="2" />
                <path d="M 320 130 L 312 135 L 328 145 L 312 155 L 328 165 L 312 175 L 328 185 L 320 190" fill="none" stroke="#ffd166" strokeWidth="2" />
                <line x1="320" y1="190" x2="320" y2="240" stroke="#00d4aa" strokeWidth="2" />
                <text x="340" y="155" fill="#e6edf3" fontSize="12">RL</text>
                <text x="340" y="170" fill="#ffd166" fontSize="10">{rlInput || '?'}Ω</text>

                {/* Terminals */}
                <circle cx="320" cy="60" r="4" fill="#ff6b6b" />
                <circle cx="320" cy="240" r="4" fill="#ff6b6b" />
                <text x="330" y="55" fill="#ff6b6b" fontSize="10" fontWeight="bold">A</text>
                <text x="330" y="255" fill="#ff6b6b" fontSize="10" fontWeight="bold">B</text>
              </svg>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-text-muted uppercase tracking-widest">Enter Load Resistance (RL)</label>
                <input 
                  type="number" 
                  value={rlInput} 
                  onChange={(e) => setRlInput(e.target.value)}
                  placeholder="e.g. 3.0"
                  className="w-full bg-bg-dark border border-border-dark rounded-xl px-4 py-3 text-teal-accent font-mono focus:outline-none focus:border-teal-accent transition-all"
                />
              </div>
              <button 
                onClick={calculateIL} 
                disabled={!rlInput}
                className="btn-primary w-full"
              >
                🔋 Calculate Load Current (IL)
              </button>
            </div>
          </div>
        );

      case 10:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-orbitron text-teal-accent">Load Current Calculation</h3>
            <div className="equation-card">
              <p className="text-sm opacity-60">IL = Vth / (Rth + RL)</p>
              <p className="text-sm opacity-80">IL = {state.vth} / ({state.rth} + {state.rl})</p>
              <p className="text-sm opacity-80">IL = {state.vth} / {(state.rth! + state.rl!).toFixed(2)}</p>
              <p className="text-teal-accent font-bold text-2xl">IL = {state.il?.toFixed(4)} A</p>
            </div>
            <div className="glowing-card border-success-green from-[#0d1f1a] text-center shadow-[0_0_20px_rgba(6,214,160,0.2)]">
              <span className="block text-xs text-text-muted uppercase tracking-widest mb-2">Final Load Current</span>
              <h2 className="text-4xl font-orbitron text-success-green">{(state.il! * 1000).toFixed(2)} mA</h2>
            </div>
            <button onClick={recordIL} className="btn-primary w-full">
              📋 Record IL in Observations
            </button>
          </div>
        );

      case 11:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-orbitron text-teal-accent">Verification Result</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-bg-dark border border-border-dark rounded-xl text-center">
                <span className="text-[10px] text-text-muted uppercase block mb-1">Direct Analysis</span>
                <span className="text-xl font-bold text-amber-accent">{state.verifyData?.il_direct_value.toFixed(4)} A</span>
              </div>
              <div className="p-4 bg-bg-dark border border-border-dark rounded-xl text-center">
                <span className="text-[10px] text-text-muted uppercase block mb-1">Thevenin Method</span>
                <span className="text-xl font-bold text-teal-accent">{state.verifyData?.il_thevenin_value.toFixed(4)} A</span>
              </div>
            </div>
            <div className={`p-6 border-2 rounded-xl text-center ${state.verifyData?.verified ? 'bg-success-green/5 border-success-green shadow-[0_0_20px_rgba(6,214,160,0.1)]' : 'bg-danger-red/5 border-danger-red'}`}>
              <div className="flex items-center justify-center gap-3 mb-3">
                {state.verifyData?.verified ? <CheckCircle2 className="w-8 h-8 text-success-green" /> : <AlertCircle className="w-8 h-8 text-danger-red" />}
                <h4 className={`text-xl font-bold ${state.verifyData?.verified ? 'text-success-green' : 'text-danger-red'}`}>
                  {state.verifyData?.verified ? 'Theorem Verified!' : 'Verification Failed'}
                </h4>
              </div>
              <p className="text-sm text-text-muted mb-4">{state.verifyData?.conclusion}</p>
              <div className="text-[10px] text-text-muted uppercase">Error Margin: {state.verifyData?.percentage_error.toFixed(4)}%</div>
            </div>
            <button onClick={completeExperiment} className="btn-primary w-full">
              🎉 Finish Experiment
            </button>
          </div>
        );

      case 12:
        return (
          <div className="space-y-8 text-center animate-in zoom-in duration-500">
            <h2 className="text-5xl font-orbitron text-teal-accent tracking-tighter">🎉 PROBLEM SOLVED!</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-panel-dark border border-border-dark rounded-xl">
                <span className="text-[10px] text-text-muted uppercase block">Vth</span>
                <span className="text-lg font-bold text-teal-accent">{state.vth}V</span>
              </div>
              <div className="p-4 bg-panel-dark border border-border-dark rounded-xl">
                <span className="text-[10px] text-text-muted uppercase block">Rth</span>
                <span className="text-lg font-bold text-teal-accent">{state.rth}Ω</span>
              </div>
              <div className="p-4 bg-panel-dark border border-border-dark rounded-xl">
                <span className="text-[10px] text-text-muted uppercase block">RL</span>
                <span className="text-lg font-bold text-teal-accent">{state.rl}Ω</span>
              </div>
              <div className="p-4 bg-panel-dark border border-border-dark rounded-xl">
                <span className="text-[10px] text-text-muted uppercase block">IL</span>
                <span className="text-lg font-bold text-teal-accent">{state.il?.toFixed(3)}A</span>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsDrawerOpen(true)} className="flex-1 py-4 bg-panel-dark border border-border-dark text-text-light font-bold rounded-xl hover:bg-white/5 transition-all">
                📄 View Full Report
              </button>
              <button onClick={resetAll} className="flex-1 py-4 bg-teal-accent text-bg-dark font-bold rounded-xl hover:scale-[1.02] transition-all">
                🔄 Solve Another Circuit
              </button>
            </div>
          </div>
        );

      default:
        return <div className="text-center py-12 text-text-muted italic">Initializing analysis engine...</div>;
    }
  };

  // --- Main Layouts ---

  if (screen === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-bg-dark">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl w-full panel p-8 space-y-8 shadow-[0_0_50px_rgba(0,212,170,0.1)] relative"
        >
          <button onClick={onBack} className="absolute top-4 left-4 p-2 hover:bg-white/5 rounded-full text-text-muted transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-orbitron text-teal-accent tracking-widest drop-shadow-[0_0_10px_rgba(0,212,170,0.5)]">THEVENIN SOLVER</h1>
            <p className="text-text-muted text-sm uppercase tracking-widest">AI-Powered Circuit Analysis Engine</p>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${state.imageBase64 ? 'border-teal-accent bg-teal-accent/5' : 'border-border-dark hover:border-teal-accent/50 hover:bg-white/5'}`}
          >
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            
            {state.imageBase64 ? (
              <img src={`data:${state.imageMimeType};base64,${state.imageBase64}`} className="absolute inset-0 w-full h-full object-contain p-4 rounded-2xl" />
            ) : (
              <>
                <Upload className="w-12 h-12 text-text-muted mb-4" />
                <p className="text-sm font-bold text-text-light">Drop your circuit image here</p>
                <p className="text-xs text-text-muted mt-1">or click to upload (PNG, JPG, WEBP)</p>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-text-muted uppercase tracking-widest">
                <Key className="w-3 h-3" /> Gemini API Key
              </div>
              <input 
                type="password" 
                value={state.apiKey}
                onChange={(e) => setState(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Enter your Gemini API Key"
                className="w-full bg-bg-dark border border-border-dark rounded-xl px-4 py-3 text-teal-accent font-mono focus:outline-none focus:border-teal-accent transition-all"
              />
              <p className="text-[10px] text-text-muted italic">Your key is never stored. Used only for this session.</p>
            </div>

            <button 
              onClick={startAnalysis}
              disabled={!state.apiKey || !state.imageBase64}
              className="btn-primary w-full flex items-center justify-center gap-3 py-4"
            >
              <Play className="w-5 h-5" />
              🔬 Begin Analysis
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-dark text-text-light font-mono">
      {/* Header */}
      <header className="bg-panel-dark border-b border-border-dark py-4 px-6 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full text-text-muted transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-orbitron text-teal-accent text-xl tracking-widest flex items-center gap-3">
            <Zap className="w-6 h-6" /> THEVENIN SOLVER
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] text-text-muted uppercase">
            <div className="w-2 h-2 bg-success-green rounded-full animate-pulse" />
            AI Engine Online
          </div>
          <button onClick={resetAll} className="p-2 hover:bg-white/5 rounded-full text-text-muted transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-10 overflow-hidden">
        {/* Left Panel: Circuit Display & Working Space */}
        <div className="lg:col-span-6 flex flex-col border-r border-border-dark overflow-y-auto custom-scrollbar">
          {/* Image Display */}
          <div className="h-[260px] bg-black flex items-center justify-center p-4 border-b border-border-dark relative shrink-0">
            <img src={`data:${state.imageMimeType};base64,${state.imageBase64}`} className="h-full w-auto object-contain" />
            <div className="absolute top-4 right-4 flex gap-2">
              <button className="p-2 bg-bg-dark/80 rounded-lg text-text-muted hover:text-text-light transition-all">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Annotation Panel */}
          <div className="p-4 bg-panel-dark/50 border-b border-border-dark space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">AI Annotations</h4>
              {state.circuitData && <span className="text-[10px] text-success-green font-bold">Topology: {state.circuitData.meshes.length} Meshes</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {state.circuitData?.nodes.map(n => (
                <span key={n.id} className="px-2 py-0.5 bg-border-dark rounded text-[10px] font-bold text-text-light">
                  Node {n.id}
                </span>
              ))}
              {state.circuitData?.meshes.map((m, i) => (
                <span key={m.id} className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${['bg-purple-600', 'bg-orange-600', 'bg-blue-600'][i % 3]}`}>
                  Loop {m.id}
                </span>
              ))}
            </div>
          </div>

          {/* Working Space */}
          <div className="flex-1 p-6 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={state.currentStep}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right Panel: Step Guide */}
        <div className="lg:col-span-4 bg-panel-dark/30 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-4">
            <h3 className="font-orbitron text-sm text-teal-accent flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4" /> SOLVER PIPELINE
            </h3>
            
            <div className="space-y-3">
              {[
                { s: 1, t: "Upload & Configure" },
                { s: 2, t: "Identify Circuit Components" },
                { s: 3, t: "Assign Mesh Currents" },
                { s: 4, t: "Apply KVL Equations" },
                { s: 5, t: "Solve Mesh Currents" },
                { s: 6, t: "Calculate Vth" },
                { s: 7, t: "Deactivate Sources" },
                { s: 8, t: "Calculate Rth" },
                { s: 9, t: "Build Equivalent Circuit" },
                { s: 10, t: "Calculate Load Current" },
                { s: 11, t: "Verify Solution" },
                { s: 12, t: "Experiment Complete" },
              ].map((item) => {
                const isActive = state.currentStep === item.s;
                const isCompleted = state.completedSteps.includes(item.s as any) || state.currentStep > item.s;
                
                return (
                  <div 
                    key={item.s}
                    className={`p-4 rounded-xl border transition-all duration-300 ${
                      isActive 
                        ? 'border-teal-accent bg-teal-accent/5 shadow-[0_0_15px_rgba(0,212,170,0.1)]' 
                        : isCompleted 
                          ? 'border-success-green/30 bg-success-green/5 opacity-80' 
                          : 'border-border-dark opacity-40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive ? 'bg-teal-accent text-bg-dark' : 
                        isCompleted ? 'bg-success-green text-bg-dark' : 'bg-border-dark text-text-muted'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : item.s}
                      </div>
                      <span className={`text-xs font-bold ${isActive ? 'text-teal-accent' : isCompleted ? 'text-success-green' : 'text-text-muted'}`}>
                        {item.t}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Drawer */}
      <div className={`fixed bottom-0 left-0 right-0 bg-panel-dark border-t border-border-dark transition-all duration-500 z-50 ${isDrawerOpen ? 'h-[400px]' : 'h-12'}`}>
        <button 
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="w-full h-12 flex items-center justify-center gap-2 text-text-muted hover:text-teal-accent transition-all"
        >
          {isDrawerOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          <span className="text-[10px] font-bold uppercase tracking-widest">Analysis Dashboard</span>
        </button>

        {isDrawerOpen && (
          <div className="h-[352px] flex flex-col">
            <div className="flex border-b border-border-dark px-6">
              <button 
                onClick={() => setDrawerTab('observations')}
                className={`px-6 py-3 text-xs font-bold transition-all border-b-2 ${drawerTab === 'observations' ? 'border-teal-accent text-teal-accent' : 'border-transparent text-text-muted'}`}
              >
                <TableIcon className="w-4 h-4 inline mr-2" /> Observations
              </button>
              <button 
                onClick={() => setDrawerTab('logs')}
                className={`px-6 py-3 text-xs font-bold transition-all border-b-2 ${drawerTab === 'logs' ? 'border-teal-accent text-teal-accent' : 'border-transparent text-text-muted'}`}
              >
                <MessageSquare className="w-4 h-4 inline mr-2" /> AI Conversation Log
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {drawerTab === 'observations' ? (
                <div className="overflow-hidden rounded-xl border border-border-dark">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-bg-dark text-text-muted uppercase">
                      <tr>
                        <th className="px-4 py-3">Step</th>
                        <th className="px-4 py-3">Parameter</th>
                        <th className="px-4 py-3">Symbol</th>
                        <th className="px-4 py-3">Value</th>
                        <th className="px-4 py-3">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-dark">
                      {state.observations.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted italic">No data recorded yet.</td></tr>
                      ) : (
                        state.observations.map(obs => (
                          <tr key={obs.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3">{obs.step}</td>
                            <td className="px-4 py-3">{obs.parameter}</td>
                            <td className="px-4 py-3 font-bold text-teal-accent">{obs.symbol}</td>
                            <td className="px-4 py-3 font-mono">{obs.value}</td>
                            <td className="px-4 py-3">{obs.unit}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4">
                  {state.apiLog.length === 0 ? (
                    <p className="text-center text-text-muted italic py-8">No API calls logged yet.</p>
                  ) : (
                    state.apiLog.map((log, i) => (
                      <div key={i} className="p-4 bg-bg-dark border border-border-dark rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold">
                          <span className="text-teal-accent">{log.step}</span>
                          <span className="text-text-muted">{log.timestamp}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[8px] text-text-muted uppercase">Prompt</span>
                            <div className="p-2 bg-panel-dark rounded text-[9px] font-mono text-text-muted break-all">
                              {log.promptSnippet}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] text-text-muted uppercase">Response</span>
                            <div className="p-2 bg-panel-dark rounded text-[9px] font-mono text-success-green break-all">
                              {log.responseSnippet}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confetti */}
      {state.currentStep === 12 && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ top: -20, left: `${Math.random() * 100}%`, backgroundColor: ['#00d4aa', '#ffd166', '#ff6b6b', '#06d6a0'][Math.floor(Math.random() * 4)] }}
              animate={{ top: '100vh', rotate: 360, x: (Math.random() - 0.5) * 400 }}
              transition={{ duration: 2 + Math.random() * 3, ease: "linear", repeat: Infinity }}
              className="absolute w-2 h-2 rounded-sm"
            />
          ))}
        </div>
      )}
    </div>
  );
}
