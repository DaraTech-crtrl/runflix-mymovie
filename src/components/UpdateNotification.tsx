import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';

export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleUpdate = (registration: ServiceWorkerRegistration) => {
      // Check if there is already a waiting worker
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowUpdate(true);
        return;
      }

      // Listen for new service workers installing and waiting
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowUpdate(true);
          }
        });
      });
    };

    // Find active registration or register new one
    navigator.serviceWorker.ready.then((registration) => {
      handleUpdate(registration);
    });

    // Check for service worker updates periodically (every 5 minutes)
    const checkInterval = setInterval(() => {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
      });
    }, 5 * 60 * 1000);

    // Listen for controllerchange event (reload the page when new worker takes control)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    return () => clearInterval(checkInterval);
  }, []);

  const handleUpdateApp = () => {
    if (waitingWorker) {
      // Tell the waiting worker to activate
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Fallback reload
      window.location.reload();
    }
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-[380px] z-50 animate-fade-in-up">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c14]/95 p-4 pr-10 shadow-2xl shadow-black/80 backdrop-blur-xl">
        {/* Glow Effects */}
        <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-red-600/10 blur-xl" />
        <div className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full bg-purple-600/10 blur-xl" />

        <div className="flex gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20 text-red-500">
            <Sparkles size={18} className="animate-pulse" />
          </div>

          <div className="min-w-0">
            <h4 className="text-white text-xs font-black uppercase tracking-wider mb-0.5">
              Update Available
            </h4>
            <p className="text-white/60 text-[11px] leading-relaxed mb-3">
              A new version of Runflix Entertainment is ready! Update now to experience the latest cinematic features and speed optimizations.
            </p>

            <button
              onClick={handleUpdateApp}
              className="flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold uppercase transition-all shadow-md shadow-red-950/20"
            >
              <RefreshCw size={11} className="animate-spin" style={{ animationDuration: '3s' }} />
              Update Now
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => setShowUpdate(false)}
          className="absolute top-3 right-3 text-white/40 hover:text-white/70 transition-colors p-1"
          aria-label="Dismiss update notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
