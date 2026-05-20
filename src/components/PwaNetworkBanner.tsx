import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { isStandalonePWA } from '../utils/platform';

export default function PwaNetworkBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void queryClient.resumePausedMutations();
      void queryClient.invalidateQueries();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [queryClient]);

  const handleRetry = async () => {
    setRefreshing(true);
    try {
      if (!navigator.onLine) {
        window.location.reload();
        return;
      }
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries({ type: 'active' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          className="fixed inset-x-0 z-[190] px-4 pointer-events-none"
          style={{ top: 'calc(8px + env(safe-area-inset-top, 0px))' }}
        >
          <motion.div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-amber-500/30 bg-[#1a1408]/95 backdrop-blur-xl px-4 py-3 flex items-center gap-3 shadow-xl">
            <WifiOff size={18} className="text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold">You're offline</p>
              <p className="text-white/50 text-[10px] leading-snug mt-0.5">
                {isStandalonePWA()
                  ? 'Check your connection, then tap Retry to refresh this page.'
                  : 'Some pages need a connection. Retry when you are back online.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleRetry()}
              disabled={refreshing}
              className="shrink-0 h-9 px-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-[10px] font-bold uppercase flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw
                size={12}
                className={refreshing ? 'animate-spin' : ''}
              />
              Retry
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
