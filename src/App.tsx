/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, lazy, Suspense } from 'react';
import { resetBodyScroll } from './utils/scrollLock';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import UpdateNotification from './components/UpdateNotification';
import InstallAppBanner from './components/InstallAppBanner';
import PwaNetworkBanner from './components/PwaNetworkBanner';

import Home from './pages/Home';
import Maintenance from './pages/Maintenance';
import MovieDetails from './pages/MovieDetails';
import Watch from './pages/Watch';

const Explore = lazy(() => import('./pages/Explore'));
const Search = lazy(() => import('./pages/Search'));
const Downloads = lazy(() => import('./pages/Downloads'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const HistoryPage = lazy(() => import('./pages/History'));
const Anime = lazy(() => import('./pages/Anime'));
const Kdrama = lazy(() => import('./pages/Kdrama'));
const Sports = lazy(() => import('./pages/Sports'));
const Genre = lazy(() => import('./pages/Genre'));
const GenreIndex = lazy(() => import('./pages/GenreIndex'));
const Trending = lazy(() => import('./pages/Trending'));
const Actor = lazy(() => import('./pages/Actor'));
const Collections = lazy(() => import('./pages/Collections'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Contact = lazy(() => import('./pages/Contact'));
const DMCA = lazy(() => import('./pages/DMCA'));
const RunMode = lazy(() => import('./pages/RunMode'));
const Daratech = lazy(() => import('./pages/Daratech'));
const NotFound = lazy(() => import('./pages/NotFound'));
import { useMaintenanceStore } from './stores/useMaintenanceStore';
import { useProgressStore } from './stores/useProgressStore';
import AnalyticsBeacon from './components/AnalyticsBeacon';

/* Minimal fallback — heavy routes (movie/watch) load eagerly */
const PageLoader = () => null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    resetBodyScroll();
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppContent() {
  const location = useLocation();
  const isWatchPage = location.pathname.startsWith('/watch');
  const isAdminPage = location.pathname === '/daratech';

  const { isMaintenanceMode, isBypassed, isSynced, syncFromServer } = useMaintenanceStore();

  // Global maintenance flag lives on the server — sync on load; poll only when tab visible
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === 'visible') {
        void syncFromServer();
      }
    };
    sync();
    const interval = setInterval(sync, 60_000);
    const onVisible = () => sync();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [syncFromServer]);

  // Sync admin bypass across tabs (local only)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'rf-maintenance') {
        useMaintenanceStore.persist.rehydrate();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync watch progress across devices (same visitor ID as analytics)
  useEffect(() => {
    void useProgressStore.getState().syncFromServer();
  }, []);

  // Preload common route chunks during idle time for faster navigation
  useEffect(() => {
    const preload = () => {
      void import('./pages/Explore');
      void import('./pages/Search');
      void import('./pages/Watchlist');
    };
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(preload, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(preload, 1200);
    return () => clearTimeout(t);
  }, []);

  if (!isSynced && !isAdminPage) {
    return <div className="min-h-screen bg-[#030305]" aria-hidden="true" />;
  }

  if (isMaintenanceMode && !isBypassed && !isAdminPage) {
    return <Maintenance />;
  }

  return (
    <div className="min-h-screen flex flex-col text-white antialiased relative bg-[#030305]">
      {/* Dynamic Cinematic Ambient Glow Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-[var(--rf-red)]/[0.03] blur-[80px]" />
        <div className="absolute -bottom-[15%] -right-[15%] w-[65vw] h-[65vw] rounded-full bg-purple-600/[0.03] blur-[80px]" />
        <div className="absolute top-[35%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-blue-600/[0.02] blur-[70px]" />
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="top-center"
        containerStyle={{
          top: 'calc(12px + env(safe-area-inset-top, 0px))',
        }}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#111118',
            color: '#e8e8ed',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontSize: '13px',
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          success: {
            iconTheme: { primary: '#e50914', secondary: '#fff' },
          },
        }}
      />

      {/* PWA / Web Update Notification Auto-Detector */}
      <UpdateNotification />
      <PwaNetworkBanner />
      <InstallAppBanner />

      {!isAdminPage && <Navbar />}

      <main className={`flex-1 w-full relative z-10 ${isAdminPage
          ? 'pt-0 pb-0'
          : isWatchPage
            ? 'pt-2 pb-6'
            : 'pt-[calc(56px+var(--safe-top))] md:pt-[calc(72px+var(--safe-top))] pb-[calc(80px+var(--safe-bottom))] md:pb-0'
        }`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/search" element={<Search />} />
            <Route path="/movie/:slug" element={<MovieDetails />} />
            <Route path="/watch/:slug" element={<Watch />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/anime" element={<Anime />} />
            <Route path="/kdrama" element={<Kdrama />} />
            <Route path="/sports" element={<Sports />} />
            <Route path="/genre" element={<GenreIndex />} />
            <Route path="/genre/:name" element={<Genre />} />
            <Route path="/trending" element={<Trending />} />
            <Route path="/actor/:name" element={<Actor />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/dmca" element={<DMCA />} />
            <Route path="/run-mode" element={<RunMode />} />
            <Route path="/daratech" element={<Daratech />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {!isWatchPage && !isAdminPage && (
        <Footer />
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <AnalyticsBeacon />
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
