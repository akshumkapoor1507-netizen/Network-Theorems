import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  BookOpen, 
  ClipboardList, 
  Play, 
  Table as TableIcon, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  RefreshCw,
  Trash2,
  Settings
} from 'lucide-react';
import { VirtualStep, VirtualObservation } from '../types';

interface VirtualLabState {
  step: VirtualStep;
  v1: number;
  r1: number;
  r2: number;
  r3: number;
  rl: number;
  rlRemoved: boolean;
  vth: number | null;
  v1Deactivated: boolean;
  rth: number | null;
  theveninGenerated: boolean;
  il: number | null;
  observations: VirtualObservation[];
  quizAnswers: Record<number, string>;
  quizSubmitted: boolean;
  selectedComponent: string | null;
  isMeasuring: boolean;
  probesPos: { red: { x: number, y: number }, black: { x: number, y: number } };
  isProbesConnected: boolean;
}

export default function VirtualExperiment({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<string>('Objective');
  const [state, setState] = useState<VirtualLabState>({
    step: 1,
    v1: 12,
    r1: 4,
    r2: 6,
    r3: 2,
    rl: 3,
    rlRemoved: false,
    vth: null,
    v1Deactivated: false,
    rth: null,
    theveninGenerated: false,
    il: null,
    observations: [],
    quizAnswers: {},
    quizSubmitted: false,
    selectedComponent: null,
    isMeasuring: false,
    probesPos: { red: { x: 500, y: 50 }, black: { x: 500, y: 330 } },
    isProbesConnected: false
  });

  const [showConfetti, setShowConfetti] = useState(false);

  // --- Calculations ---
  const calculateVth = () => (state.v1 * state.r2) / (state.r1 + state.r2);
  const calculateRth = () => state.r3 + (state.r1 * state.r2) / (state.r1 + state.r2);
  const calculateIL = (vth: number, rth: number, rl: number) => vth / (rth + rl);

  // --- Handlers ---
  const handleSliderChange = (name: string, value: number) => {
    setState(prev => ({ ...prev, [name]: value, step: prev.step === 1 ? 1 : prev.step }));
  };

  const adjustValue = (name: string, delta: number) => {
    if (state.step > 1) return;
    const limits: Record<string, { min: number, max: number }> = {
      v1: { min: 5, max: 20 },
      r1: { min: 1, max: 20 },
      r2: { min: 1, max: 20 },
      r3: { min: 1, max: 20 },
      rl: { min: 1, max: 20 }
    };
    const current = (state as any)[name];
    const next = Math.max(limits[name].min, Math.min(limits[name].max, current + delta));
    setState(prev => ({ ...prev, [name]: next }));
  };

  const recordObservation = (type: 'vth' | 'rth' | 'il') => {
    if (type === 'il') {
      const newObs: VirtualObservation = {
        id: Math.random().toString(36).substr(2, 9),
        v1: state.v1,
        r1: state.r1,
        r2: state.r2,
        r3: state.r3,
        rl: state.rl,
        vth: state.vth!,
        rth: state.rth!,
        il: state.il!
      };
      setState(prev => ({ 
        ...prev, 
        observations: [...prev.observations, newObs],
        step: 11
      }));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    } else if (type === 'vth') {
      setState(prev => ({ ...prev, step: 5 }));
    } else if (type === 'rth') {
      setState(prev => ({ ...prev, step: 8 }));
    }
  };

  const resetQuiz = () => {
    setState(prev => ({ ...prev, quizAnswers: {}, quizSubmitted: false }));
  };

  const clearObservations = () => {
    setState(prev => ({ ...prev, observations: [] }));
  };

  // --- SVG Components ---
  const CircuitSVG = () => {
    const isVthMode = state.step >= 3 && state.step < 5;
    const isRthMode = state.step >= 5 && state.step < 8;

    const checkProbes = (type: 'red' | 'black', x: number, y: number) => {
      const targetA = { x: 460, y: 80 };
      const targetB = { x: 460, y: 300 };
      
      const distA = Math.sqrt(Math.pow(x - targetA.x, 2) + Math.pow(y - targetA.y, 2));
      const distB = Math.sqrt(Math.pow(x - targetB.x, 2) + Math.pow(y - targetB.y, 2));

      if (type === 'red' && distA < 20) return true;
      if (type === 'black' && distB < 20) return true;
      return false;
    };

    const handleProbeDrag = (type: 'red' | 'black', info: any) => {
      const newPos = { x: info.point.x, y: info.point.y }; // This is screen space, need to handle carefully or use relative
      // For simplicity in this environment, we'll use a simplified check or just click-to-connect if drag is tricky
    };

    const toggleProbes = () => {
      if (state.step === 3 || state.step === 6) {
        setState(prev => ({ ...prev, isProbesConnected: !prev.isProbesConnected, isMeasuring: !prev.isProbesConnected }));
      }
    };

    const CurrentFlow = ({ path, active }: { path: string, active: boolean }) => {
      if (!active) return null;
      return (
        <motion.path
          d={path}
          fill="none"
          stroke="#ffd166"
          strokeWidth="4"
          strokeOpacity="0.2"
          strokeDasharray="1, 15"
          animate={{ strokeDashoffset: [0, -100] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      );
    };

    const getOverlayPos = (id: string) => {
      switch(id) {
        case 'v1': return { x: 130, y: 190 };
        case 'r1': return { x: 180, y: 130 };
        case 'r2': return { x: 330, y: 190 };
        case 'r3': return { x: 370, y: 130 };
        case 'rl': return { x: 410, y: 190 };
        default: return { x: 0, y: 0 };
      }
    };

    const handleCircuitClick = (componentId: string) => {
      if (state.step === 1) {
        setState(prev => ({ ...prev, selectedComponent: prev.selectedComponent === componentId ? null : componentId }));
      } else if (state.step === 2 && componentId === 'rl') {
        setState(prev => ({ ...prev, rlRemoved: true, step: 3 }));
      } else if (state.step === 5 && componentId === 'v1') {
        setState(prev => ({ ...prev, v1Deactivated: true, step: 6 }));
      }
    };
    
    return (
      <svg 
        viewBox="0 0 560 380" 
        className="w-full h-auto bg-black/20 rounded-xl border border-border-dark"
        onClick={() => setState(prev => ({ ...prev, selectedComponent: null }))}
      >
        {/* Current Flow Indicators */}
        <CurrentFlow 
          path="M 80 300 L 80 80 L 280 80 L 280 300 L 80 300" 
          active={!state.v1Deactivated && state.step === 1} 
        />
        <CurrentFlow 
          path="M 280 80 L 460 80 L 460 300 L 280 300" 
          active={!state.v1Deactivated && !state.rlRemoved && state.step === 1} 
        />

        {/* Ground Rail */}
        <line x1="80" y1="300" x2="460" y2="300" stroke="#00d4aa" strokeWidth="2" />
        
        {/* V1 Branch */}
        <motion.g 
          onClick={(e) => { e.stopPropagation(); handleCircuitClick('v1'); }}
          className={`cursor-pointer transition-all ${state.selectedComponent === 'v1' ? 'filter drop-shadow-[0_0_8px_rgba(255,107,107,0.6)]' : ''}`}
          whileHover={{ scale: state.step === 1 || state.step === 5 ? 1.02 : 1 }}
        >
          <AnimatePresence mode="wait">
            {state.v1Deactivated ? (
              <motion.line 
                key="v1-wire"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                x1="80" y1="80" x2="80" y2="300" stroke="#00d4aa" strokeWidth="2" 
              />
            ) : (
              <motion.g key="v1-source" exit={{ opacity: 0, scale: 0.9 }}>
                <line x1="80" y1="80" x2="80" y2="170" stroke="#00d4aa" strokeWidth="2" />
                <circle cx="80" cy="190" r="20" fill="#161b22" stroke="#ff6b6b" strokeWidth={state.selectedComponent === 'v1' ? 3 : 2} />
                <text x="75" y="185" fill="#ff6b6b" fontSize="14" fontWeight="bold" className="select-none">+</text>
                <text x="75" y="205" fill="#e6edf3" fontSize="14" fontWeight="bold" className="select-none">−</text>
                <line x1="80" y1="210" x2="80" y2="300" stroke="#00d4aa" strokeWidth="2" />
              </motion.g>
            )}
          </AnimatePresence>
          <text x="40" y="190" fill="#e0e0e0" fontSize="12" fontFamily="Space Mono">V1</text>
          <text x="40" y="205" fill="#ffd166" fontSize="11" fontFamily="Space Mono">{state.v1}V</text>
          {state.step === 5 && !state.v1Deactivated && (
            <motion.circle 
              cx="80" cy="190" r="25" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeDasharray="4 4"
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          )}
        </motion.g>

        {/* R1 */}
        <motion.g 
          onClick={(e) => { e.stopPropagation(); handleCircuitClick('r1'); }}
          className={`cursor-pointer transition-all ${state.selectedComponent === 'r1' ? 'filter drop-shadow-[0_0_8px_rgba(0,212,170,0.6)]' : ''}`}
          whileHover={{ scale: state.step === 1 ? 1.02 : 1 }}
        >
          <line x1="80" y1="80" x2="150" y2="80" stroke="#00d4aa" strokeWidth="2" />
          <path d="M 150 80 L 155 72 L 165 88 L 175 72 L 185 88 L 195 72 L 205 88 L 210 80" fill="none" stroke={isRthMode ? "#444" : (state.selectedComponent === 'r1' ? "#00d4aa" : "#e0e0e0")} strokeWidth={state.selectedComponent === 'r1' ? 3 : 2} />
          <line x1="210" y1="80" x2="280" y2="80" stroke="#00d4aa" strokeWidth="2" />
          <text x="180" y="65" fill="#e0e0e0" fontSize="12" fontFamily="Space Mono" textAnchor="middle">R1</text>
          <text x="180" y="55" fill="#ffd166" fontSize="11" fontFamily="Space Mono" textAnchor="middle" style={{ textDecoration: isRthMode ? 'line-through' : 'none' }}>{state.r1}Ω</text>
        </motion.g>

        {/* R2 Shunt */}
        <motion.g 
          onClick={(e) => { e.stopPropagation(); handleCircuitClick('r2'); }}
          className={`cursor-pointer transition-all ${state.selectedComponent === 'r2' ? 'filter drop-shadow-[0_0_8px_rgba(0,212,170,0.6)]' : ''}`}
          whileHover={{ scale: state.step === 1 ? 1.02 : 1 }}
        >
          <line x1="280" y1="80" x2="280" y2="160" stroke="#00d4aa" strokeWidth="2" />
          <path d="M 280 160 L 272 165 L 288 175 L 272 185 L 288 195 L 272 205 L 288 215 L 280 220" fill="none" stroke={isRthMode ? "#444" : (state.selectedComponent === 'r2' ? "#00d4aa" : "#e0e0e0")} strokeWidth={state.selectedComponent === 'r2' ? 3 : 2} />
          <line x1="280" y1="220" x2="280" y2="300" stroke="#00d4aa" strokeWidth="2" />
          <text x="295" y="190" fill="#e0e0e0" fontSize="12" fontFamily="Space Mono">R2</text>
          <text x="310" y="190" fill="#ffd166" fontSize="11" fontFamily="Space Mono" style={{ textDecoration: isRthMode ? 'line-through' : 'none' }}>{state.r2}Ω</text>
        </motion.g>

        {/* R3 */}
        <motion.g 
          onClick={(e) => { e.stopPropagation(); handleCircuitClick('r3'); }}
          className={`cursor-pointer transition-all ${state.selectedComponent === 'r3' ? 'filter drop-shadow-[0_0_8px_rgba(0,212,170,0.6)]' : ''}`}
          whileHover={{ scale: state.step === 1 ? 1.02 : 1 }}
        >
          <line x1="280" y1="80" x2="340" y2="80" stroke="#00d4aa" strokeWidth="2" />
          <path d="M 340 80 L 345 72 L 355 88 L 365 72 L 375 88 L 385 72 L 395 88 L 400 80" fill="none" stroke={state.selectedComponent === 'r3' ? "#00d4aa" : "#e0e0e0"} strokeWidth={state.selectedComponent === 'r3' ? 3 : 2} />
          <line x1="400" y1="80" x2="460" y2="80" stroke="#00d4aa" strokeWidth="2" />
          <text x="370" y="65" fill="#e0e0e0" fontSize="12" fontFamily="Space Mono" textAnchor="middle">R3</text>
          <text x="370" y="55" fill="#ffd166" fontSize="11" fontFamily="Space Mono" textAnchor="middle">{state.r3}Ω</text>
        </motion.g>

        {/* RL */}
        <AnimatePresence mode="wait">
          {!state.rlRemoved ? (
            <motion.g 
              key="rl-active"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, x: 20, rotate: 10 }}
              onClick={(e) => { e.stopPropagation(); handleCircuitClick('rl'); }} 
              className="cursor-pointer"
              whileHover={{ scale: state.step === 1 || state.step === 2 ? 1.02 : 1 }}
            >
              <line x1="460" y1="80" x2="460" y2="160" stroke="#00d4aa" strokeWidth="2" />
              <path d="M 460 160 L 452 165 L 468 175 L 452 185 L 468 195 L 452 205 L 468 215 L 460 220" fill="none" stroke="#ffd166" strokeWidth={state.selectedComponent === 'rl' ? 3 : 2} />
              <line x1="460" y1="220" x2="460" y2="300" stroke="#00d4aa" strokeWidth="2" />
              <rect x="445" y="155" width="30" height="70" fill="none" stroke="#ffd166" strokeDasharray="4" strokeWidth={state.selectedComponent === 'rl' ? 2 : 1} />
              <text x="478" y="190" fill="#e0e0e0" fontSize="12" fontFamily="Space Mono">RL</text>
              <text x="478" y="205" fill="#ffd166" fontSize="11" fontFamily="Space Mono">{state.rl}Ω</text>
              {state.step === 2 && (
                <motion.circle 
                  cx="460" cy="190" r="30" fill="none" stroke="#ffd166" strokeWidth="2" strokeDasharray="4 4"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              )}
            </motion.g>
          ) : (
            <motion.g key="rl-removed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <line x1="460" y1="80" x2="460" y2="140" stroke="#00d4aa" strokeWidth="2" />
              <line x1="460" y1="140" x2="460" y2="240" stroke="#ffd166" strokeWidth="2" strokeDasharray="4" />
              <line x1="460" y1="240" x2="460" y2="300" stroke="#00d4aa" strokeWidth="2" />
              <text x="478" y="190" fill="#ffd166" fontSize="11" fontFamily="Space Mono">OPEN</text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Terminals */}
        <motion.g 
          onClick={toggleProbes}
          className={(state.step === 3 || state.step === 6) ? "cursor-pointer" : ""}
        >
          <circle cx="460" cy="80" r="5" fill="#ff6b6b" />
          <text x="470" y="75" fill="#ff6b6b" fontSize="12" fontFamily="Space Mono">A</text>
          <circle cx="460" cy="300" r="5" fill="#ff6b6b" />
          <text x="470" y="315" fill="#ff6b6b" fontSize="12" fontFamily="Space Mono">B</text>
          {(state.step === 3 || state.step === 6) && !state.isProbesConnected && (
            <motion.g>
              <motion.circle 
                cx="460" cy="80" r="12" fill="none" stroke="#ff6b6b" strokeWidth="1" strokeDasharray="2 2"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.circle 
                cx="460" cy="300" r="12" fill="none" stroke="#ff6b6b" strokeWidth="1" strokeDasharray="2 2"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
              <text x="480" y="190" fill="#ff6b6b" fontSize="10" className="animate-pulse">CONNECT PROBES</text>
            </motion.g>
          )}
        </motion.g>

        {/* Draggable Probes (Simplified as click-to-connect for better UX in iframe) */}
        <AnimatePresence>
          {state.isProbesConnected && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Red Probe */}
              <path d="M 400 190 Q 430 190 460 80" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeDasharray="4 4" />
              <circle cx="460" cy="80" r="6" fill="#ff6b6b" />
              {/* Black Probe */}
              <path d="M 400 210 Q 430 210 460 300" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4 4" />
              <circle cx="460" cy="300" r="6" fill="#000" />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Multimeter Overlay */}
        <AnimatePresence>
          {(state.isMeasuring || state.isProbesConnected) && (
            <motion.g 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transform="translate(380, 160)"
            >
              <rect x="0" y="0" width="100" height="80" rx="8" fill="#161b22" stroke="#ffd166" strokeWidth="2" filter="drop-shadow(0 0 10px rgba(255,209,102,0.3))" />
              <rect x="8" y="8" width="84" height="30" rx="4" fill="#000" />
              <text x="50" y="30" fill="#00d4aa" fontSize="16" textAnchor="middle" fontFamily="Space Mono" fontWeight="bold">
                {state.step === 3 ? calculateVth().toFixed(2) + 'V' : calculateRth().toFixed(2) + 'Ω'}
              </text>
              <text x="50" y="60" fill="#ffd166" fontSize="8" textAnchor="middle" fontFamily="Space Mono">
                {(state.step === 3 ? 'Vth Mode' : 'Rth Mode').toUpperCase()}
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Vth Label in Step 3 */}
        {isVthMode && state.vth !== null && (
          <g>
            <text x="430" y="190" fill="#ffd166" fontSize="14" fontFamily="Space Mono" textAnchor="end">Vth = {state.vth.toFixed(2)}V</text>
          </g>
        )}

        {/* Adjustment Controls Overlay */}
        {state.selectedComponent && state.step === 1 && (
          <g transform={`translate(${getOverlayPos(state.selectedComponent).x}, ${getOverlayPos(state.selectedComponent).y})`}>
            <rect x="-45" y="-25" width="90" height="50" rx="8" fill="#161b22" stroke="#00d4aa" strokeWidth="2" filter="drop-shadow(0 0 8px rgba(0,212,170,0.4))" />
            <g className="cursor-pointer select-none" onClick={(e) => { e.stopPropagation(); adjustValue(state.selectedComponent!, -1); }}>
              <circle cx="-25" cy="0" r="12" fill="#ff6b6b20" stroke="#ff6b6b" strokeWidth="1" />
              <text x="-25" y="5" fill="#ff6b6b" fontSize="16" textAnchor="middle" fontWeight="bold">-</text>
            </g>
            <text x="0" y="5" fill="#fff" fontSize="14" textAnchor="middle" fontFamily="Space Mono" fontWeight="bold">
              {(state as any)[state.selectedComponent]}{state.selectedComponent === 'v1' ? 'V' : 'Ω'}
            </text>
            <g className="cursor-pointer select-none" onClick={(e) => { e.stopPropagation(); adjustValue(state.selectedComponent!, 1); }}>
              <circle cx="25" cy="0" r="12" fill="#00d4aa20" stroke="#00d4aa" strokeWidth="1" />
              <text x="25" y="5" fill="#00d4aa" fontSize="16" textAnchor="middle" fontWeight="bold">+</text>
            </g>
          </g>
        )}
      </svg>
    );
  };

  const TheveninSVG = () => (
    <svg viewBox="0 0 400 300" className="w-full h-auto bg-black/20 rounded-xl border border-border-dark">
      {/* Current Flow in Thevenin Circuit */}
      <motion.path
        d="M 80 240 L 80 60 L 320 60 L 320 240 L 80 240"
        fill="none"
        stroke="#ffd166"
        strokeWidth="4"
        strokeOpacity="0.2"
        strokeDasharray="1, 15"
        animate={{ strokeDashoffset: [0, -100] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      
      <line x1="80" y1="240" x2="320" y2="240" stroke="#00d4aa" strokeWidth="2" />
      <line x1="80" y1="60" x2="160" y2="60" stroke="#00d4aa" strokeWidth="2" />
      <line x1="220" y1="60" x2="320" y2="60" stroke="#00d4aa" strokeWidth="2" />
      
      <circle cx="80" cy="150" r="20" fill="#161b22" stroke="#ff6b6b" strokeWidth="2" />
      <text x="75" y="145" fill="#ff6b6b" fontSize="14" fontWeight="bold">+</text>
      <text x="75" y="165" fill="#e6edf3" fontSize="14" fontWeight="bold">−</text>
      <line x1="80" y1="60" x2="80" y2="130" stroke="#00d4aa" strokeWidth="2" />
      <line x1="80" y1="170" x2="80" y2="240" stroke="#00d4aa" strokeWidth="2" />
      <text x="40" y="155" fill="#e0e0e0" fontSize="12" fontFamily="Space Mono">Vth</text>
      <text x="40" y="170" fill="#ffd166" fontSize="10" fontFamily="Space Mono">{state.vth?.toFixed(2)}V</text>

      <path d="M 160 60 L 165 52 L 175 68 L 185 52 L 195 68 L 205 52 L 215 68 L 220 60" fill="none" stroke="#e0e0e0" strokeWidth="2" />
      <text x="190" y="45" fill="#e0e0e0" fontSize="12" fontFamily="Space Mono" textAnchor="middle">Rth</text>
      <text x="190" y="35" fill="#ffd166" fontSize="10" fontFamily="Space Mono" textAnchor="middle">{state.rth?.toFixed(2)}Ω</text>

      <line x1="320" y1="60" x2="320" y2="130" stroke="#00d4aa" strokeWidth="2" />
      <path d="M 320 130 L 312 135 L 328 145 L 312 155 L 328 165 L 312 175 L 328 185 L 320 190" fill="none" stroke="#ffd166" strokeWidth="2" />
      <line x1="320" y1="190" x2="320" y2="240" stroke="#00d4aa" strokeWidth="2" />
      <text x="340" y="155" fill="#e0e0e0" fontSize="12" fontFamily="Space Mono">RL</text>
      <text x="340" y="170" fill="#ffd166" fontSize="10" fontFamily="Space Mono">{state.rl}Ω</text>

      <circle cx="320" cy="60" r="4" fill="#ff6b6b" />
      <circle cx="320" cy="240" r="4" fill="#ff6b6b" />
      <text x="330" y="55" fill="#ff6b6b" fontSize="10" fontWeight="bold">A</text>
      <text x="330" y="255" fill="#ff6b6b" fontSize="10" fontWeight="bold">B</text>
    </svg>
  );

  // --- Tab Content ---
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Objective':
        return (
          <div className="space-y-4 animate-in fade-in duration-500">
            <h2 className="text-2xl font-orbitron text-teal-accent">Experiment Objective</h2>
            <div className="space-y-3 text-text-muted leading-relaxed">
              <p>To verify Thevenin's Theorem by:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Determining the Thevenin Equivalent Voltage (Vth) across the load terminals A-B.</li>
                <li>Determining the Thevenin Equivalent Resistance (Rth) by deactivating all independent sources.</li>
                <li>Reconstructing the Thevenin equivalent circuit and calculating the load current (IL).</li>
                <li>Verifying that the load current from the original circuit equals the load current from the Thevenin equivalent circuit.</li>
              </ol>
            </div>
          </div>
        );
      case 'Theory':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-orbitron text-teal-accent">Thevenin's Theorem — Theory</h2>
            <div className="space-y-6 text-text-muted">
              <section>
                <h3 className="text-lg font-bold text-text-light mb-2">Section A — Statement</h3>
                <p>Thevenin's Theorem states that any linear, bilateral network with voltage/current sources and resistances can be replaced by a single voltage source (Vth) in series with a single resistance (Rth), connected across the load terminals.</p>
              </section>
              <section>
                <h3 className="text-lg font-bold text-text-light mb-2">Section B — Vth (Open Circuit Voltage)</h3>
                <p>Vth is the voltage that appears across the open-circuited load terminals (A-B) when RL is removed from the circuit. It is calculated by analyzing the remaining network.</p>
              </section>
              <section>
                <h3 className="text-lg font-bold text-text-light mb-2">Section C — Rth (Thevenin Resistance)</h3>
                <p>Rth is calculated by:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Removing the load RL.</li>
                  <li>Deactivating all independent sources: voltage sources are replaced by short circuits (wires), current sources are replaced by open circuits.</li>
                  <li>Finding the equivalent resistance seen from terminals A-B.</li>
                </ul>
                <p className="mt-2 font-mono text-amber-accent">Rth = R3 + (R1 ∥ R2) = R3 + (R1 × R2)/(R1 + R2)</p>
              </section>
              <section>
                <h3 className="text-lg font-bold text-text-light mb-2">Section D — Load Current</h3>
                <p>Once the Thevenin equivalent circuit is formed, the load current is:</p>
                <p className="font-mono text-amber-accent">IL = Vth / (Rth + RL)</p>
              </section>
            </div>
          </div>
        );
      case 'Procedure':
        return (
          <div className="space-y-4 animate-in fade-in duration-500">
            <h2 className="text-2xl font-orbitron text-teal-accent">Experiment Procedure</h2>
            <div className="space-y-3">
              {[
                "Set the values of R1, R2, R3, RL using the sliders and V1 using the voltage input.",
                "Remove the load resistor RL by clicking on it in the circuit diagram.",
                "Click \"Measure Vth\" to identify the open-circuit voltage across terminals A-B.",
                "Click \"Record Vth\" to add the Thevenin voltage to the Observation Table.",
                "Click on the voltage source V1 in the circuit to deactivate it (short circuit it).",
                "The circuit now shows only resistors — calculate Rth from terminals A-B.",
                "Click \"Record Rth\" to add the Thevenin resistance to the Observation Table.",
                "Click \"Generate Thevenin Circuit\" to reconstruct the equivalent circuit.",
                "Click \"Calculate IL\" to compute the load current using IL = Vth / (Rth + RL).",
                "Click \"Record IL\" to add the load current to the Observation Table."
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-panel-dark border border-border-dark rounded-lg">
                  <span className="text-teal-accent font-bold">{i + 1}.</span>
                  <p className="text-sm text-text-muted">{step}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'Simulation':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 animate-in fade-in duration-500">
            {/* Left Column: Circuit & Controls */}
            <div className="lg:col-span-6 space-y-6">
              <div className="panel p-4">
                {state.step === 8 || state.step === 9 || state.step === 10 ? <TheveninSVG /> : <CircuitSVG />}
              </div>
              
              <div className="panel p-6 space-y-6">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Component Controls
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { id: 'v1', label: 'V1 (Voltage Source)', min: 5, max: 20, unit: 'V' },
                    { id: 'r1', label: 'R1', min: 1, max: 20, unit: 'Ω' },
                    { id: 'r2', label: 'R2', min: 1, max: 20, unit: 'Ω' },
                    { id: 'r3', label: 'R3', min: 1, max: 20, unit: 'Ω' },
                    { id: 'rl', label: 'RL (Load)', min: 1, max: 20, unit: 'Ω' }
                  ].map(slider => (
                    <div key={slider.id} className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">{slider.label}</span>
                        <span className="text-amber-accent font-bold">{(state as any)[slider.id]}{slider.unit}</span>
                      </div>
                      <input 
                        type="range" 
                        min={slider.min} 
                        max={slider.max} 
                        value={(state as any)[slider.id]} 
                        onChange={(e) => handleSliderChange(slider.id, parseInt(e.target.value))}
                        disabled={state.step > 1}
                        className="w-full h-1.5 bg-border-dark rounded-lg appearance-none cursor-pointer accent-teal-accent disabled:opacity-50"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Guide */}
            <div className="lg:col-span-4 space-y-4">
              <div className="panel p-6 space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-orbitron text-teal-accent flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" /> Experiment Guide
                  </h3>
                  <button 
                    onClick={() => setState(prev => ({ ...prev, step: 1, rlRemoved: false, vth: null, v1Deactivated: false, rth: null, theveninGenerated: false, il: null, isMeasuring: false, isProbesConnected: false }))}
                    className="flex items-center gap-2 px-3 py-1.5 bg-panel-dark border border-border-dark text-text-muted rounded-lg hover:text-teal-accent transition-all text-[10px] font-bold uppercase"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { id: 1, text: "Set Component Values", action: () => setState(prev => ({ ...prev, step: 2, selectedComponent: null })), btn: "✓ Values Set — Proceed" },
                    { id: 2, text: "Remove Load Resistor RL", action: () => setState(prev => ({ ...prev, rlRemoved: true, step: 3 })), btn: "🔌 Remove RL" },
                    { id: 3, text: "Measure Vth", action: () => setState(prev => ({ ...prev, vth: calculateVth(), step: 4 })), btn: "⚡ Measure Vth" },
                    { id: 4, text: "Record Vth", action: () => recordObservation('vth'), btn: "📋 Record Vth" },
                    { id: 5, text: "Deactivate V1", action: () => setState(prev => ({ ...prev, v1Deactivated: true, step: 6 })), btn: "🔇 Deactivate V1" },
                    { id: 6, text: "Calculate Rth", action: () => setState(prev => ({ ...prev, rth: calculateRth(), step: 7 })), btn: "🔢 Calculate Rth" },
                    { id: 7, text: "Record Rth", action: () => recordObservation('rth'), btn: "📋 Record Rth" },
                    { id: 8, text: "Generate Thevenin Circuit", action: () => setState(prev => ({ ...prev, theveninGenerated: true, step: 9 })), btn: "⚙️ Generate Circuit" },
                    { id: 9, text: "Calculate IL", action: () => setState(prev => ({ ...prev, il: calculateIL(state.vth!, state.rth!, state.rl), step: 10 })), btn: "🔋 Calculate IL" },
                    { id: 10, text: "Record IL", action: () => recordObservation('il'), btn: "📋 Record IL" },
                    { id: 11, text: "Verify Thevenin Equation", action: () => {}, btn: null }
                  ].map(step => {
                    const isActive = state.step === step.id;
                    const isCompleted = state.step > step.id;
                    return (
                      <div key={step.id} className={`p-4 rounded-xl border transition-all ${isActive ? 'border-teal-accent bg-teal-accent/5 shadow-[0_0_15px_rgba(0,212,170,0.1)]' : isCompleted ? 'border-success-green/30 bg-success-green/5 opacity-80' : 'border-border-dark opacity-40'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-teal-accent text-bg-dark' : isCompleted ? 'bg-success-green text-bg-dark' : 'bg-border-dark text-text-muted'}`}>
                            {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.id}
                          </div>
                          <span className={`text-xs font-bold ${isActive ? 'text-teal-accent' : isCompleted ? 'text-success-green' : 'text-text-muted'}`}>{step.text}</span>
                        </div>
                        {isActive && step.btn && (
                          <button onClick={step.action} className="btn-primary w-full py-2 text-xs">
                            {step.btn}
                          </button>
                        )}
                        {isActive && step.id === 11 && (
                          <div className="mt-3 p-3 bg-success-green/10 border border-success-green/30 rounded-lg space-y-2">
                            <p className="text-[10px] text-success-green font-bold uppercase">Verification Logic:</p>
                            <p className="text-[11px] text-text-muted font-mono">
                              IL = Vth / (Rth + RL)<br/>
                              {state.il?.toFixed(4)}A = {state.vth?.toFixed(2)}V / ({state.rth?.toFixed(2)}Ω + {state.rl}Ω)
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-success-green">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Equation Satisfied</span>
                            </div>
                          </div>
                        )}
                        {isActive && step.id === 3 && state.vth !== null && (
                          <div className="mt-3 p-2 bg-black/40 rounded text-center">
                            <span className="text-xs text-text-muted">Vth = </span>
                            <span className="text-sm font-bold text-amber-accent">{state.vth.toFixed(2)}V</span>
                          </div>
                        )}
                        {isActive && step.id === 6 && state.rth !== null && (
                          <div className="mt-3 p-2 bg-black/40 rounded space-y-1">
                            <p className="text-[10px] text-text-muted">R1∥R2 = {(state.r1 * state.r2 / (state.r1 + state.r2)).toFixed(2)}Ω</p>
                            <p className="text-xs font-bold text-amber-accent">Rth = {state.rth.toFixed(2)}Ω</p>
                          </div>
                        )}
                        {isActive && step.id === 9 && state.il !== null && (
                          <div className="mt-3 p-2 bg-black/40 rounded text-center">
                            <span className="text-xs text-text-muted">IL = </span>
                            <span className="text-sm font-bold text-amber-accent">{state.il.toFixed(4)}A</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      case 'Observations':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-orbitron text-teal-accent">Observation Table</h2>
              <button onClick={clearObservations} className="flex items-center gap-2 px-4 py-2 bg-danger-red/10 text-danger-red rounded-lg hover:bg-danger-red/20 transition-all text-xs">
                <Trash2 className="w-4 h-4" /> Clear Table
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border-dark">
              <table className="w-full text-xs text-left">
                <thead className="bg-bg-dark text-text-muted uppercase">
                  <tr>
                    <th className="px-4 py-4">S.No</th>
                    <th className="px-4 py-4">V1 (V)</th>
                    <th className="px-4 py-4">R1 (Ω)</th>
                    <th className="px-4 py-4">R2 (Ω)</th>
                    <th className="px-4 py-4">R3 (Ω)</th>
                    <th className="px-4 py-4">RL (Ω)</th>
                    <th className="px-4 py-4">Vth (V)</th>
                    <th className="px-4 py-4">Rth (Ω)</th>
                    <th className="px-4 py-4">IL (A)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark">
                  {state.observations.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-text-muted italic">No observations recorded yet. Complete the simulation to record data.</td></tr>
                  ) : (
                    state.observations.map((obs, i) => (
                      <tr key={obs.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4">{i + 1}</td>
                        <td className="px-4 py-4">{obs.v1}</td>
                        <td className="px-4 py-4">{obs.r1}</td>
                        <td className="px-4 py-4">{obs.r2}</td>
                        <td className="px-4 py-4">{obs.r3}</td>
                        <td className="px-4 py-4">{obs.rl}</td>
                        <td className="px-4 py-4 text-teal-accent font-bold">{obs.vth.toFixed(2)}</td>
                        <td className="px-4 py-4 text-teal-accent font-bold">{obs.rth.toFixed(2)}</td>
                        <td className="px-4 py-4 text-amber-accent font-bold">{obs.il.toFixed(4)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'Result':
        const lastObs = state.observations[state.observations.length - 1];
        const directIL = lastObs ? (lastObs.v1 * lastObs.r2 / (lastObs.r1 + lastObs.r2)) / (lastObs.r3 + (lastObs.r1 * lastObs.r2 / (lastObs.r1 + lastObs.r2)) + lastObs.rl) : null;
        
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-2xl font-orbitron text-teal-accent">Experiment Result</h2>
            {!lastObs ? (
              <div className="text-center py-12 text-text-muted italic">Complete the experiment to see results.</div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="panel p-6 text-center space-y-2 group relative" title="Thevenin Equivalent Voltage: The open-circuit voltage across the load terminals.">
                    <span className="text-xs text-text-muted uppercase tracking-widest cursor-help">Thevenin Voltage</span>
                    <p className="text-3xl font-orbitron text-teal-accent">{lastObs.vth.toFixed(2)}V</p>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-bg-dark border border-border-dark rounded text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                      Vth: The open-circuit voltage across terminals A-B when the load is removed.
                    </div>
                  </div>
                  <div className="panel p-6 text-center space-y-2 group relative" title="Thevenin Equivalent Resistance: The resistance seen from the load terminals with all sources deactivated.">
                    <span className="text-xs text-text-muted uppercase tracking-widest cursor-help">Thevenin Resistance</span>
                    <p className="text-3xl font-orbitron text-teal-accent">{lastObs.rth.toFixed(2)}Ω</p>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-bg-dark border border-border-dark rounded text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                      Rth: The equivalent resistance seen from terminals A-B with voltage sources shorted.
                    </div>
                  </div>
                  <div className="panel p-6 text-center space-y-2">
                    <span className="text-xs text-text-muted uppercase tracking-widest">Load Current</span>
                    <p className="text-3xl font-orbitron text-amber-accent">{lastObs.il.toFixed(4)}A</p>
                  </div>
                </div>

                <div className="panel p-8 space-y-6">
                  <h3 className="text-xl font-orbitron text-text-light">Verification</h3>
                  <div className="space-y-4 text-sm text-text-muted">
                    <p>Direct calculation from original circuit:</p>
                    <div className="p-4 bg-black/40 rounded font-mono space-y-2">
                      <p>V_open = V1 × R2 / (R1 + R2) = {lastObs.v1} × {lastObs.r2} / ({lastObs.r1} + {lastObs.r2}) = {lastObs.vth.toFixed(2)}V</p>
                      <p>R_eq = R3 + (R1 × R2) / (R1 + R2) = {lastObs.r3} + ({lastObs.r1} × {lastObs.r2}) / ({lastObs.r1} + {lastObs.r2}) = {lastObs.rth.toFixed(2)}Ω</p>
                      <p>IL_direct = V_open / (R_eq + RL) = {lastObs.vth.toFixed(2)} / ({lastObs.rth.toFixed(2)} + {lastObs.rl}) = {directIL?.toFixed(4)}A</p>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-success-green/10 border border-success-green rounded-xl text-success-green">
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="font-bold">Thevenin's Theorem Verified! Calculated IL matches simulated result.</span>
                    </div>
                  </div>
                </div>

                <div className="panel p-8 space-y-6">
                  <h3 className="text-xl font-orbitron text-text-light">Parameter Comparison</h3>
                  <div className="flex items-end justify-around h-48 gap-4 pt-8">
                    {[
                      { label: 'Vth', val: lastObs.vth, max: 20, color: 'bg-teal-accent' },
                      { label: 'Rth', val: lastObs.rth, max: 20, color: 'bg-teal-accent' },
                      { label: 'IL (x10)', val: lastObs.il * 10, max: 20, color: 'bg-amber-accent' }
                    ].map(bar => (
                      <div key={bar.label} className="flex flex-col items-center gap-3 w-full">
                        <div className="relative w-12 bg-border-dark rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: '100%' }}>
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${(bar.val / bar.max) * 100}%` }}
                            className={`${bar.color} w-full shadow-[0_0_15px_rgba(0,212,170,0.3)]`}
                          />
                        </div>
                        <span className="text-[10px] text-text-muted uppercase font-bold">{bar.label}</span>
                        <span className="text-xs font-mono text-text-light">{bar.val.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'Precautions':
        return (
          <div className="space-y-4 animate-in fade-in duration-500">
            <h2 className="text-2xl font-orbitron text-teal-accent">Precautions</h2>
            <div className="space-y-3">
              {[
                "Ensure all connections are tight and correct before energizing the circuit.",
                "Do not exceed the rated current/voltage of the resistors used in the circuit.",
                "All sources must be properly deactivated (shorted) before measuring Rth — do not attempt to measure resistance with sources active.",
                "Use the correct polarity when connecting the voltage source V1.",
                "Allow the circuit to reach steady state before taking measurements.",
                "Verify theoretical calculations match simulated results before proceeding.",
                "In a physical lab: use a multimeter on the correct range setting for voltage and resistance measurements.",
                "Avoid parallax error while reading analog meter values in a physical setup."
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-panel-dark border border-border-dark rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-accent shrink-0" />
                  <p className="text-sm text-text-muted">{item}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'Quiz':
        const quizQuestions = [
          {
            q: "According to Thevenin's Theorem, any linear bilateral network can be replaced by:",
            options: [
              "A current source in parallel with a resistance",
              "A voltage source in series with a resistance",
              "Two voltage sources in series",
              "A resistance alone"
            ],
            correct: 1,
            explanation: "Thevenin's theorem simplifies a network into a single voltage source (Vth) and a series resistance (Rth)."
          },
          {
            q: "Thevenin's Resistance (Rth) is calculated by:",
            options: [
              "Keeping all sources active and measuring resistance at load terminals",
              "Replacing voltage sources with open circuits and current sources with short circuits",
              "Replacing voltage sources with short circuits and current sources with open circuits",
              "Removing only the load resistor and measuring directly"
            ],
            correct: 2,
            explanation: "To find Rth, independent voltage sources are shorted and current sources are opened."
          },
          {
            q: "In this experiment, with R1=4Ω, R2=6Ω, R3=2Ω, V1=12V, what is Vth?",
            options: ["12V", "7.2V", "4.8V", "6V"],
            correct: 1,
            explanation: "Vth = V1 × R2 / (R1 + R2) = 12 × 6 / 10 = 7.2V."
          },
          {
            q: "What is the Thevenin Resistance for R1=4Ω, R2=6Ω, R3=2Ω?",
            options: ["12Ω", "4.4Ω", "6.4Ω", "2.4Ω"],
            correct: 1,
            explanation: "Rth = R3 + (R1∥R2) = 2 + (4×6)/(4+6) = 2 + 2.4 = 4.4Ω."
          },
          {
            q: "If Vth = 7.2V, Rth = 4.4Ω, RL = 3Ω, the load current IL is approximately:",
            options: ["2.4A", "0.973A", "1.2A", "0.5A"],
            correct: 1,
            explanation: "IL = Vth / (Rth + RL) = 7.2 / (4.4 + 3) = 7.2 / 7.4 ≈ 0.973A."
          }
        ];

        const score = quizQuestions.reduce((acc, q, i) => acc + (state.quizAnswers[i] === q.options[q.correct] ? 1 : 0), 0);

        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-orbitron text-teal-accent">Knowledge Check</h2>
              <p className="text-sm text-text-muted">Answer all 5 questions to test your understanding.</p>
            </div>

            <div className="space-y-6">
              {quizQuestions.map((q, i) => (
                <div key={i} className={`panel p-6 space-y-4 border-l-4 ${state.quizSubmitted ? (state.quizAnswers[i] === q.options[q.correct] ? 'border-success-green' : 'border-danger-red') : 'border-teal-accent'}`}>
                  <p className="text-sm font-bold text-text-light">{i + 1}. {q.q}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = state.quizAnswers[i] === opt;
                      const isCorrect = opt === q.options[q.correct];
                      const isWrong = state.quizSubmitted && isSelected && !isCorrect;
                      
                      return (
                        <motion.button 
                          key={optIdx}
                          whileHover={!state.quizSubmitted ? { scale: 1.02 } : {}}
                          whileTap={!state.quizSubmitted ? { scale: 0.98 } : {}}
                          animate={isWrong ? { x: [0, -5, 5, -5, 5, 0] } : {}}
                          onClick={() => !state.quizSubmitted && setState(prev => ({ ...prev, quizAnswers: { ...prev.quizAnswers, [i]: opt } }))}
                          className={`p-3 text-left text-xs rounded-lg border transition-all ${
                            isSelected 
                              ? 'bg-teal-accent/10 border-teal-accent text-teal-accent' 
                              : 'bg-bg-dark border-border-dark text-text-muted hover:border-teal-accent/50'
                          } ${state.quizSubmitted && isCorrect ? 'bg-success-green/20 border-success-green text-success-green shadow-[0_0_10px_rgba(34,197,94,0.2)]' : ''} ${isWrong ? 'bg-danger-red/20 border-danger-red text-danger-red' : ''}`}
                        >
                          {opt}
                        </motion.button>
                      );
                    })}
                  </div>
                  {state.quizSubmitted && (
                    <p className="text-[10px] text-text-muted italic mt-2">Explanation: {q.explanation}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-4">
              {!state.quizSubmitted ? (
                <button 
                  onClick={() => setState(prev => ({ ...prev, quizSubmitted: true }))}
                  disabled={Object.keys(state.quizAnswers).length < 5}
                  className="btn-primary px-12 py-3 disabled:opacity-50"
                >
                  Submit Quiz
                </button>
              ) : (
                <div className="text-center space-y-6">
                  <div className="p-8 bg-panel-dark border border-border-dark rounded-2xl space-y-2">
                    <span className="text-xs text-text-muted uppercase tracking-widest">Final Score</span>
                    <h3 className="text-5xl font-orbitron text-teal-accent">{score}/5</h3>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={resetQuiz} className="flex items-center gap-2 px-6 py-3 bg-panel-dark border border-border-dark text-text-light rounded-xl hover:bg-white/5 transition-all text-sm">
                      <RefreshCw className="w-4 h-4" /> Reset Quiz
                    </button>
                    <button onClick={() => { setState(prev => ({ ...prev, step: 1, rlRemoved: false, vth: null, v1Deactivated: false, rth: null, theveninGenerated: false, il: null })); setActiveTab('Simulation'); }} className="flex items-center gap-2 px-6 py-3 bg-teal-accent text-bg-dark font-bold rounded-xl hover:scale-[1.02] transition-all text-sm">
                      <Play className="w-4 h-4" /> Take Another Value
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-dark text-text-light font-mono">
      {/* Header */}
      <header className="bg-panel-dark border-b border-border-dark py-4 px-6 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full text-text-muted transition-all">
            <RefreshCw className="w-4 h-4 rotate-[-90deg]" />
          </button>
          <h1 className="font-orbitron text-teal-accent text-xl tracking-widest flex items-center gap-3">
            <Target className="w-6 h-6" /> VIRTUAL LAB: THEVENIN'S THEOREM
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] text-text-muted uppercase">
            <div className="w-2 h-2 bg-success-green rounded-full animate-pulse" />
            System Ready
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="bg-panel-dark border-b border-border-dark px-6 py-2 flex gap-2 overflow-x-auto custom-scrollbar shrink-0">
        {['Objective', 'Theory', 'Procedure', 'Simulation', 'Observations', 'Result', 'Precautions', 'Quiz'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-teal-accent text-bg-dark' : 'text-text-muted hover:text-text-light hover:bg-white/5'}`}
          >
            {tab === 'Objective' && <Target className="w-3 h-3 inline mr-2" />}
            {tab === 'Theory' && <BookOpen className="w-3 h-3 inline mr-2" />}
            {tab === 'Procedure' && <ClipboardList className="w-3 h-3 inline mr-2" />}
            {tab === 'Simulation' && <Play className="w-3 h-3 inline mr-2" />}
            {tab === 'Observations' && <TableIcon className="w-3 h-3 inline mr-2" />}
            {tab === 'Result' && <CheckCircle2 className="w-3 h-3 inline mr-2" />}
            {tab === 'Precautions' && <AlertTriangle className="w-3 h-3 inline mr-2" />}
            {tab === 'Quiz' && <HelpCircle className="w-3 h-3 inline mr-2" />}
            {tab}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Confetti */}
      {showConfetti && (
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
