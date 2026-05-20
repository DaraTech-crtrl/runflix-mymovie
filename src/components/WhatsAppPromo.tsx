import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, ExternalLink, Flame, Check } from 'lucide-react';

export default function WhatsAppPromo() {
  const [showModal, setShowModal] = useState(false);
  const [showFloatingBadge, setShowFloatingBadge] = useState(false);
  const location = useLocation();

  const hideFloatingButtons =
    location.pathname.startsWith('/watch') ||
    location.pathname.startsWith('/player');

  useEffect(() => {
    if (hideFloatingButtons) return;
    // Check if the user has already joined/dismissed
    const status = localStorage.getItem('rf_wa_joined_or_dismissed');
    if (!status) {
      // Delay showing the pop-up modal by 3 seconds for a smoother first-visit experience
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      // Always show the floating badge if they dismissed or joined previously
      setShowFloatingBadge(true);
    }
  }, []);

  const handleJoin = () => {
    localStorage.setItem('rf_wa_joined_or_dismissed', 'true');
    setShowModal(false);
    setShowFloatingBadge(true);
    window.open('https://chat.whatsapp.com/ELsCys35etk4I268yoxe6c', '_blank', 'noopener,noreferrer');
  };

  const handleDismiss = () => {
    localStorage.setItem('rf_wa_joined_or_dismissed', 'true');
    setShowModal(false);
    setShowFloatingBadge(true);
  };

  if (hideFloatingButtons) return null;

  return (
    <>
      {/* 1. FIRST VISIT CENTERED GLASSMORPHIC MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-b from-[#111116] to-[#08080c] border border-emerald-500/20 p-8 text-center shadow-2xl"
            >
              {/* Radial background green glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/10 blur-[60px] pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-green-500/10 blur-[60px] pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all text-white/50 hover:text-white"
                aria-label="Dismiss prompt"
              >
                <X size={16} />
              </button>

              {/* WhatsApp Premium Icon */}
              <div className="relative w-18 h-18 mx-auto mb-6 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 text-white shadow-lg shadow-emerald-950/40">
                <MessageSquare size={36} className="fill-white/10" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[8px] font-black text-white items-center justify-center">1</span>
                </span>
              </div>

              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider mb-3">
                <Flame size={10} className="animate-pulse" /> Runflix Entertainment Picks
              </span>

              {/* Text */}
              <h2 className="text-xl font-black tracking-wide text-white uppercase">Unlock Daily Movie Picks</h2>
              <p className="text-xs text-white/60 leading-relaxed mt-2 mb-6 max-w-sm mx-auto">
                Get handpicked movie recommendations, trending anime highlights, and instant premium updates sent directly to your WhatsApp channel!
              </p>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleJoin}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-xs font-black uppercase tracking-wider text-white transition-all shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 active:scale-98"
                >
                  Join Telegram/WhatsApp Channel <ExternalLink size={14} />
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full py-2.5 text-xs font-black uppercase text-white/40 hover:text-white/70 tracking-wider transition-colors"
                >
                  Maybe Later
                </button>
              </div>

              {/* Footer text */}
              <p className="text-[9px] text-white/30 uppercase tracking-widest mt-6">
                100% Free • No spam • Cancel anytime
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. PERSISTENT FLOATING ACCORDION ACCENT FLOATER */}
      <AnimatePresence>
        {showFloatingBadge && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed bottom-6 right-6 z-[999] select-none pointer-events-auto"
          >
            <a
              href="https://whatsapp.com/channel/0029Vb8esUv3GJP6ymXaNF3g"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-xl shadow-black/40 border border-emerald-400/20 active:scale-95 transition-all group/badge"
            >
              {/* Pulsing Dot */}
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>

              {/* Icon */}
              <MessageSquare size={16} className="fill-white/10 shrink-0" />

              {/* Hoverable Pill expansion */}
              <span className="max-w-0 overflow-hidden group-hover/badge:max-w-xs transition-all duration-300 ease-out text-[10px] font-black uppercase tracking-wider block whitespace-nowrap">
                Runflix Entertainment Picks 🍿
              </span>
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
