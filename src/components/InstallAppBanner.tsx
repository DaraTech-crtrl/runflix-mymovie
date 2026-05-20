import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, Share, PlusSquare } from 'lucide-react';
import { isIOS, isMobileDevice, isStandalonePWA } from '../utils/platform';

const DISMISS_KEY = 'rf-install-banner-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallAppBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    if (isStandalonePWA()) return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    if (!isMobileDevice()) return;

    const timer = window.setTimeout(() => setVisible(true), 4000);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBip);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBip);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
    setShowIOSSteps(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      dismiss();
      return;
    }

    if (isIOS()) {
      setShowIOSSteps(true);
      return;
    }

    dismiss();
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 z-[180] px-4 pointer-events-none"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-white/10 bg-[#0c0c11]/95 backdrop-blur-xl shadow-2xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
            <img src="/favicon.png" alt="" className="w-7 h-7 object-contain" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold leading-tight">
              Install Runflix Entertainment
            </p>
            <p className="text-white/50 text-[11px] mt-0.5 leading-snug">
              {showIOSSteps
                ? 'Tap Share, then Add to Home Screen for a full-screen app experience.'
                : 'Add to your home screen for faster access, full screen, and smoother sharing.'}
            </p>

            {showIOSSteps && (
              <div className="mt-2 flex items-center gap-2 text-[10px] text-white/60">
                <Share size={12} className="text-blue-400 shrink-0" />
                <span>Share</span>
                <span className="text-white/30">→</span>
                <PlusSquare size={12} className="text-white/80 shrink-0" />
                <span>Add to Home Screen</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white shrink-0"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold uppercase tracking-wide transition-colors"
          >
            {deferredPrompt ? 'Install App' : isIOS() ? 'How to Install' : 'Got it'}
          </button>
          {!showIOSSteps && (
            <button
              type="button"
              onClick={dismiss}
              className="h-10 px-4 rounded-xl border border-white/10 text-white/60 text-[11px] font-bold uppercase"
            >
              Later
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
