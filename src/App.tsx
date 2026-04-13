import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Target, 
  Cpu,
  ArrowRight,
  Info
} from 'lucide-react';
import VirtualExperiment from './components/VirtualExperiment';
import TheveninSolver from './components/TheveninSolver';

type AppMode = 'landing' | 'virtual' | 'solver';

export default function App() {
  const [mode, setMode] = useState<AppMode>('landing');

  if (mode === 'virtual') {
    return <VirtualExperiment onBack={() => setMode('landing')} />;
  }

  if (mode === 'solver') {
    return <TheveninSolver onBack={() => setMode('landing')} />;
  }

  return (
    <div className="min-h-screen bg-bg-dark text-text-light font-mono selection:bg-teal-accent/30 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-accent rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-accent rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl w-full space-y-12 relative z-10"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-3 px-4 py-1.5 bg-teal-accent/10 border border-teal-accent/30 rounded-full text-teal-accent text-[10px] font-bold uppercase tracking-[0.2em] mb-4"
          >
            <Zap className="w-3 h-3 animate-pulse" /> Advanced Electrical Engineering Suite
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-orbitron font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(0,212,170,0.3)]">
            THEVENIN <span className="text-teal-accent">LABS</span>
          </h1>
          <p className="text-text-muted max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            A unified platform for mastering Thevenin's Theorem through interactive simulation and AI-powered circuit analysis.
          </p>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Virtual Experiment Card */}
          <motion.div 
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode('virtual')}
            className="group relative p-8 rounded-3xl bg-panel-dark border border-border-dark hover:border-teal-accent transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target className="w-32 h-32 text-teal-accent" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="w-16 h-16 bg-teal-accent/10 rounded-2xl flex items-center justify-center border border-teal-accent/30">
                <Target className="w-8 h-8 text-teal-accent" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-orbitron text-white">Virtual Experiment</h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  Hands-on laboratory simulator. Adjust components, measure voltages, and verify the theorem step-by-step in a controlled environment.
                </p>
              </div>
              <div className="flex items-center gap-2 text-teal-accent text-xs font-bold uppercase tracking-widest group-hover:gap-4 transition-all">
                Enter Laboratory <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>

          {/* Thevenin Solver Card */}
          <motion.div 
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode('solver')}
            className="group relative p-8 rounded-3xl bg-panel-dark border border-border-dark hover:border-amber-accent transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Cpu className="w-32 h-32 text-amber-accent" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="w-16 h-16 bg-amber-accent/10 rounded-2xl flex items-center justify-center border border-amber-accent/30">
                <Cpu className="w-8 h-8 text-amber-accent" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-orbitron text-white">Solver Engine</h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  AI-powered analysis. Upload a photo of any circuit diagram and let the Gemini Vision engine solve it using Thevenin's Theorem.
                </p>
              </div>
              <div className="flex items-center gap-2 text-amber-accent text-xs font-bold uppercase tracking-widest group-hover:gap-4 transition-all">
                Launch AI Engine <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer Info */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 pt-8 border-t border-border-dark/30">
          <div className="flex items-center gap-3 text-[10px] text-text-muted uppercase tracking-widest">
            <Info className="w-4 h-4 text-teal-accent" />
            <span>Interactive Learning</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-text-muted uppercase tracking-widest">
            <Zap className="w-4 h-4 text-amber-accent" />
            <span>AI-Driven Analysis</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-text-muted uppercase tracking-widest">
            <Cpu className="w-4 h-4 text-success-green" />
            <span>Real-time Verification</span>
          </div>
        </div>
      </motion.div>

      {/* Version Tag */}
      <div className="absolute bottom-6 right-6 text-[10px] text-text-muted font-bold uppercase tracking-widest opacity-50">
        v2.4.0-BETA // THEVENIN LABS
      </div>
    </div>
  );
}
