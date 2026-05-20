import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, KeyRound, Wrench, RefreshCw, Compass, Mail, ExternalLink, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMaintenanceStore } from '../stores/useMaintenanceStore';
import { verifyAdminPin } from '../api/adminAuth';

export default function Maintenance() {
  const { maintenanceMessage, setBypassed, syncFromServer } = useMaintenanceStore();

  useEffect(() => {
    void syncFromServer();
  }, [syncFromServer]);
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [bypassPin, setBypassPin] = useState('');

  const handleAdminBypassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyAdminPin(bypassPin);
      setBypassed(true);
      toast.success('Bypass Activated! Welcome back, Admin.', { icon: '🔑' });
      window.location.reload();
    } catch {
      toast.error('Invalid Administrator Access PIN');
      setBypassPin('');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#030305] text-white p-6 relative overflow-hidden">
      {/* Background Animated Ambient Lights */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-red-600/[0.04] blur-[130px] animate-float-slow" />
        <div className="absolute -bottom-[15%] -right-[15%] w-[55vw] h-[55vw] rounded-full bg-purple-600/[0.04] blur-[140px] animate-float-mid" />
      </div>

      <div className="relative z-10 w-full max-w-[620px] flex flex-col items-center text-center">
        {/* Pulsing server status header */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1">
            <Activity size={10} className="animate-pulse" /> CORE UPGRADES IN PROGRESS
          </span>
        </motion.div>

        {/* Brand logo */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex items-center gap-3 mb-6"
        >
          <img src="/favicon.png" alt="Runflix Entertainment Icon" className="w-10 h-10 object-contain animate-spin-slow" />
          <img src="/logo.png" alt="Runflix Entertainment Brand" className="h-6 w-auto object-contain" />
        </motion.div>

        {/* Under Maintenance Headline */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-white leading-tight"
        >
          SYSTEM MAINTENANCE
        </motion.h1>

        {/* Main interactive glass card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-2xl p-6 sm:p-8 shadow-2xl mb-8 flex flex-col gap-6"
        >
          {/* Main message */}
          <p className="text-white/70 text-sm leading-relaxed font-medium">
            {maintenanceMessage}
          </p>

          {/* Subsystem status indicators */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.01] border border-white/5 text-left">
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <Wrench size={16} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-white/50 tracking-wider">Catalog API</h4>
                <p className="text-[11px] font-bold text-orange-400">Upgrading</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.01] border border-white/5 text-left">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Activity size={16} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-white/50 tracking-wider">CDN Servers</h4>
                <p className="text-[11px] font-bold text-emerald-400">100% Operational</p>
              </div>
            </div>
          </div>

          {/* Estimated downtime banner */}
          <div className="py-2.5 px-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
            <span className="text-white/40 font-semibold uppercase tracking-wider text-[10px]">Upgrade Schedule</span>
            <span className="text-white/80 font-bold flex items-center gap-1.5">
              <RefreshCw size={12} className="animate-spin text-red-500" /> Back Online Shortly
            </span>
          </div>
        </motion.div>

        {/* Footer Support and Bypass controls */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col items-center gap-4 w-full"
        >
          <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-white/40 font-bold">
            <a 
              href="mailto:support@runflix.name.ng" 
              className="hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Mail size={14} /> Contact Support
            </a>
            <span className="text-white/10">|</span>
            <a 
              href="https://whatsapp.com/channel/0029Vb8esUv3GJP6ymXaNF3g" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Compass size={14} /> Official Channel <ExternalLink size={10} />
            </a>
          </div>

          {/* Toggle admin portal bypass */}
          <div className="pt-4 w-full max-w-[320px]">
            {!showAdminPortal ? (
              <button 
                onClick={() => setShowAdminPortal(true)}
                className="text-[10px] font-black uppercase tracking-wider text-white/20 hover:text-white/60 transition-colors flex items-center gap-1.5 mx-auto"
              >
                <KeyRound size={12} /> Administrator Access Portal
              </button>
            ) : (
              <motion.form 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleAdminBypassSubmit}
                className="flex flex-col gap-2.5 p-4 rounded-[24px] border border-white/10 bg-black/40 backdrop-blur-md"
              >
                <div className="flex items-center gap-2 mb-1 justify-center">
                  <ShieldAlert size={12} className="text-red-500" />
                  <h4 className="text-[10px] font-black uppercase text-white/60 tracking-wider">Security Access Required</h4>
                </div>
                <input 
                  type="password" 
                  value={bypassPin}
                  onChange={(e) => setBypassPin(e.target.value)}
                  placeholder="Enter Security Bypass PIN" 
                  className="w-full text-center text-xs py-2 px-3 rounded-xl bg-black border border-white/10 outline-none text-white focus:border-red-600 transition-colors"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => { setShowAdminPortal(false); setBypassPin(''); }}
                    className="flex-1 py-2 rounded-xl border border-white/5 text-[10px] font-black uppercase text-white/50 hover:text-white/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-[10px] font-black uppercase text-white transition-all shadow-md shadow-red-950/30"
                  >
                    Verify Access
                  </button>
                </div>
              </motion.form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
