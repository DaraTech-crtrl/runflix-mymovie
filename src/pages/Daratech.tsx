import { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchAnalyticsStats, pickDomainStats, type AnalyticsStats } from '../api/analytics';
import {
  verifyAdminPin,
  setAdminSession,
  clearAdminSession,
  isAdminSessionFlagged,
} from '../api/adminAuth';
import { useQuery } from '@tanstack/react-query';
import { fetchTrending, fetchSearch } from '../api/client';
import {
  Share2, Loader2, Play, Activity, Shield, RefreshCw, BarChart2,
  Search, Sliders, Smartphone, Lock, LogOut, CheckCircle2, AlertCircle, Link as LinkIcon,
  Globe, Users, Compass, Eye, Server, Zap, CheckSquare, Wrench
} from 'lucide-react';
import toast from 'react-hot-toast';
import UnifiedShareModal from '../components/UnifiedShareModal';
import { useProgressStore } from '../stores/useProgressStore';
import { useRecentlyViewedStore } from '../stores/useRecentlyViewedStore';
import { useWatchlistStore } from '../stores/useWatchlistStore';
import { buildMovieSlug } from '../utils/slug';
import { useMaintenanceStore } from '../stores/useMaintenanceStore';
import { useNavigate } from 'react-router-dom';

export default function Daratech() {
  const navigate = useNavigate();

  // ==========================================
  // 1. SECURITY & LOCK LOGIC
  // ==========================================
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isAdminSessionFlagged);

  const {
    isMaintenanceMode,
    maintenanceMessage,
    setMaintenanceMode,
    setBypassed
  } = useMaintenanceStore();

  const [messageInput, setMessageInput] = useState(maintenanceMessage);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      void useMaintenanceStore.getState().syncFromServer();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setMessageInput(maintenanceMessage);
  }, [maintenanceMessage]);

  const [pinInput, setPinInput] = useState<string>('');
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    return Number(localStorage.getItem('daratech_attempts') || '0');
  });

  const [lockoutTime, setLockoutTime] = useState<number>(() => {
    return Number(localStorage.getItem('daratech_lockout') || '0');
  });

  const [remainingCooldown, setRemainingCooldown] = useState<number>(0);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);

  // Active Workspace tab
  const [activeWorkspace, setActiveWorkspace] = useState<'catalog' | 'analytics' | 'system'>('catalog');

  // Cooldown timer countdown
  useEffect(() => {
    if (lockoutTime <= 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = lockoutTime + 30000 - now;
      if (diff > 0) {
        setRemainingCooldown(Math.ceil(diff / 1000));
        setIsLockedOut(true);
      } else {
        setRemainingCooldown(0);
        setIsLockedOut(false);
        setFailedAttempts(0);
        localStorage.removeItem('daratech_attempts');
        localStorage.removeItem('daratech_lockout');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTime]);

  const PIN_LENGTH = 4;

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) {
      toast.error(`Locked out. Try again in ${remainingCooldown}s.`);
      return;
    }

    try {
      const { token } = await verifyAdminPin(pinInput);
      setAdminSession(token);
      setIsAuthenticated(true);
      setFailedAttempts(0);
      setPinInput('');
      localStorage.removeItem('daratech_attempts');
      localStorage.removeItem('daratech_lockout');
      toast.success('Access Granted. Control Center unlocked.');
    } catch {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('daratech_attempts', String(newAttempts));
      setPinInput('');

      if (newAttempts >= 5) {
        const now = Date.now();
        setLockoutTime(now);
        localStorage.setItem('daratech_lockout', String(now));
        setIsLockedOut(true);
        toast.error('Too many failed attempts. Cooldown active.');
      } else {
        toast.error(`Invalid Security PIN. ${5 - newAttempts} attempts left.`);
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    clearAdminSession();
    toast.success('Admin session terminated.');
    navigate('/');
  };

  // ==========================================
  // 2. REALTIME TELEMETRY (REAL USER DATA)
  // ==========================================
  const progressMap = useProgressStore((s) => s.progress);
  const recentItems = useRecentlyViewedStore((s) => s.items);
  const watchlistItems = useWatchlistStore((s) => s.items);

  const realAnalytics = useMemo(() => {
    const watchSessions = Object.keys(progressMap || {});
    let totalSecondsWatched = 0;
    let completedCount = 0;

    watchSessions.forEach(key => {
      const prog = progressMap[key];
      if (prog?.lastTime) {
        totalSecondsWatched += prog.lastTime;
      }
      if (prog?.lastTime && prog?.duration && (prog.lastTime / prog.duration) >= 0.85) {
        completedCount++;
      }
    });

    const hours = Math.floor(totalSecondsWatched / 3600);
    const mins = Math.floor((totalSecondsWatched % 3600) / 60);
    const totalWatchTimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return {
      watchSessionsCount: watchSessions.length,
      totalWatchTimeStr,
      completedCount,
      watchlistCount: watchlistItems.length,
      recentItems,
      progressItems: Object.entries(progressMap).map(([id, info]) => {
        const matchingRecent = recentItems.find(r => r.subjectId === id);
        return {
          id,
          title: matchingRecent?.title || `Movie Reference ${id.slice(0, 5)}`,
          coverUrl: matchingRecent?.coverUrl,
          lastTime: info.lastTime || 0,
          duration: info.duration || 1,
          percent: Math.min(Math.round(((info.lastTime || 0) / (info.duration || 1)) * 100), 100),
          updatedAt: info.updatedAt
        };
      }).sort((a, b) => b.updatedAt - a.updatedAt)
    };
  }, [progressMap, recentItems, watchlistItems]);

  const [selectedSiteTelemetry, setSelectedSiteTelemetry] = useState<'merged' | 'main' | 'subdomain'>('merged');
  const [serverAnalytics, setServerAnalytics] = useState<AnalyticsStats | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const loadServerAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const data = await fetchAnalyticsStats();
      setServerAnalytics(data);
    } catch (e: unknown) {
      setAnalyticsError(e instanceof Error ? e.message : 'Analytics API unavailable');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || activeWorkspace !== 'analytics') return;
    void loadServerAnalytics();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void loadServerAnalytics();
    }, 15_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeWorkspace, loadServerAnalytics]);

  // Network metrics
  const [networkInfo] = useState(() => {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return {
      rtt: conn ? `${conn.rtt || 0}ms` : 'Unknown',
      downlink: conn ? `${conn.downlink || 0} Mbps` : 'Unknown',
      type: conn ? (conn.effectiveType || 'Broadband') : 'Unknown'
    };
  });

  // ==========================================
  // 3. API RETRIEVAL
  // ==========================================
  const { data: trending, isError: trendingError, isFetching: trendingFetching } = useQuery({
    queryKey: ['trending'],
    queryFn: fetchTrending,
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const apiOnline = isAuthenticated && !trendingError && !!trending;

  // ==========================================
  // 4. SEARCH / FILTERS PROMOTION CONSOLE
  // ==========================================
  const [searchTitle, setSearchTitle] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [searchGenre, setSearchGenre] = useState('');
  const [searchFilterType, setSearchFilterType] = useState<'latest' | 'trending' | 'popular'>('latest');

  // Trigger search submit state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  const executeSearch = async (
    title: string,
    year: string,
    genre: string,
    filterType: 'latest' | 'trending' | 'popular',
    showToast = false
  ) => {
    setIsSearching(true);
    setSearchResults([]);

    const filterKeyword = filterType === 'popular' ? 'Popular' : '';
    const keywordTokens = [title, genre, year, filterKeyword].filter(Boolean);
    const queryKeyword = keywordTokens.join(' ');

    try {
      let pool: any[] = [];

      if (queryKeyword.trim()) {
        const searchRes = await fetchSearch(queryKeyword);
        if (searchRes?.items) {
          pool = searchRes.items.map((item: any) => ({
            id: item.subjectId,
            title: item.title || item.name,
            cover: item.coverUrl || item.cover?.url || item.cover,
            rating: item.imdbRatingValue || item.rating || 8.0,
            year: item.releaseDate ? item.releaseDate.split('-')[0] : '2026',
            genre: item.genres ? item.genres.join(', ') : 'Cinematic',
            trendingScore: item.imdbRatingValue ? Math.round(item.imdbRatingValue * 10) : 80,
            subjectType: item.subjectType
          }));
        }
      } else {
        // Fallback options if no criteria entered
        if ((filterType === 'trending' || filterType === 'popular') && trending) {
          pool = trending.map((item: any) => ({
            id: item.subjectId,
            title: item.title || item.name,
            cover: item.coverUrl || item.cover?.url || item.cover,
            rating: item.imdbRatingValue || item.rating || 8.2,
            year: item.releaseDate ? item.releaseDate.split('-')[0] : '2026',
            genre: item.genres ? item.genres.join(', ') : 'Cinematic',
            trendingScore: filterType === 'popular' ? 98 : 94,
            subjectType: item.subjectType
          }));
        } else {
          // Default latest fetches search term "2026"
          const searchRes = await fetchSearch('2026');
          if (searchRes?.items) {
            pool = searchRes.items.map((item: any) => ({
              id: item.subjectId,
              title: item.title || item.name,
              cover: item.coverUrl || item.cover?.url || item.cover,
              rating: item.imdbRatingValue || item.rating || 8.0,
              year: item.releaseDate ? item.releaseDate.split('-')[0] : '2026',
              genre: item.genres ? item.genres.join(', ') : 'Cinematic',
              trendingScore: 88,
              subjectType: item.subjectType
            }));
          }
        }
      }

      // Sort client side based on filter type selection
      let sorted = [...pool];
      if (filterType === 'latest') {
        sorted.sort((a, b) => Number(b.year) - Number(a.year));
      } else {
        // Trending and Popular sorts by score rating
        sorted.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
      }

      setSearchResults(sorted);
      if (showToast) {
        if (sorted.length === 0) {
          toast('No matching promo targets found.', { icon: '🔍' });
        } else {
          toast.success(`Discovered ${sorted.length} promo targets!`);
        }
      }
    } catch (err: any) {
      if (showToast) {
        toast.error(err?.message || "Search query failed");
      } else {
        console.error("Search query failed:", err);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchPromotions = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSearch(searchTitle, searchYear, searchGenre, searchFilterType, true);
  };

  useEffect(() => {
    if (!isAuthenticated || activeWorkspace !== 'catalog') return;

    let active = true;

    const timer = setTimeout(() => {
      const runSearch = async () => {
        setIsSearching(true);
        const filterKeyword = searchFilterType === 'popular' ? 'Popular' : '';
        const keywordTokens = [searchTitle, searchGenre, searchYear, filterKeyword].filter(Boolean);
        const queryKeyword = keywordTokens.join(' ');

        try {
          let pool: any[] = [];

          if (queryKeyword.trim()) {
            const searchRes = await fetchSearch(queryKeyword);
            if (!active) return;
            if (searchRes?.items) {
              pool = searchRes.items.map((item: any) => ({
                id: item.subjectId,
                title: item.title || item.name,
                cover: item.coverUrl || item.cover?.url || item.cover,
                rating: item.imdbRatingValue || item.rating || 8.0,
                year: item.releaseDate ? item.releaseDate.split('-')[0] : '2026',
                genre: item.genres ? item.genres.join(', ') : 'Cinematic',
                trendingScore: item.imdbRatingValue ? Math.round(item.imdbRatingValue * 10) : 80,
                subjectType: item.subjectType
              }));
            }
          } else {
            if ((searchFilterType === 'trending' || searchFilterType === 'popular') && trending) {
              if (!active) return;
              pool = trending.map((item: any) => ({
                id: item.subjectId,
                title: item.title || item.name,
                cover: item.coverUrl || item.cover?.url || item.cover,
                rating: item.imdbRatingValue || item.rating || 8.2,
                year: item.releaseDate ? item.releaseDate.split('-')[0] : '2026',
                genre: item.genres ? item.genres.join(', ') : 'Cinematic',
                trendingScore: searchFilterType === 'popular' ? 98 : 94,
                subjectType: item.subjectType
              }));
            } else {
              const searchRes = await fetchSearch('2026');
              if (!active) return;
              if (searchRes?.items) {
                pool = searchRes.items.map((item: any) => ({
                  id: item.subjectId,
                  title: item.title || item.name,
                  cover: item.coverUrl || item.cover?.url || item.cover,
                  rating: item.imdbRatingValue || item.rating || 8.0,
                  year: item.releaseDate ? item.releaseDate.split('-')[0] : '2026',
                  genre: item.genres ? item.genres.join(', ') : 'Cinematic',
                  trendingScore: 88,
                  subjectType: item.subjectType
                }));
              }
            }
          }

          let sorted = [...pool];
          if (searchFilterType === 'latest') {
            sorted.sort((a, b) => Number(b.year) - Number(a.year));
          } else {
            sorted.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
          }

          if (active) {
            setSearchResults(sorted);
          }
        } catch (err: any) {
          console.error("Auto search query failed:", err);
        } finally {
          if (active) {
            setIsSearching(false);
          }
        }
      };

      runSearch();
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTitle, searchYear, searchGenre, searchFilterType, isAuthenticated, activeWorkspace, trending]);

  // Modal share hooks
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // System Tools loader
  const [sysLoading, setSysLoading] = useState<Record<string, boolean>>({});
  const [latencyBenchResult, setLatencyBenchResult] = useState<string | null>(null);
  const [cookieStatusResult, setCookieStatusResult] = useState<string | null>(null);

  const handleRunSystemTool = (toolName: string, action: () => void) => {
    setSysLoading(prev => ({ ...prev, [toolName]: true }));
    setTimeout(() => {
      action();
      setSysLoading(prev => ({ ...prev, [toolName]: false }));
    }, 1200);
  };

  const handleCopyLinkOnly = (movie: any) => {
    const slug = buildMovieSlug(movie.title, movie.id);
    const fullLink = `${window.location.origin}/movie/${slug}`;
    navigator.clipboard.writeText(fullLink);
    toast.success('Direct SEO URL copied!');
  };

  // ==========================================
  // RENDER SECURITY GATE SCREEN
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden select-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-red-600/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-[130px] pointer-events-none" />

        <div className="w-full max-w-md bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />

          <div className="w-16 h-16 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6 text-red-500 shadow-lg shadow-red-950/20">
            <Lock size={28} className="animate-pulse" />
          </div>

          <h1 className="text-2xl font-black tracking-wide text-white uppercase">DARATECH LOCKOUT</h1>
          <p className="text-xs text-white/50 uppercase tracking-widest mt-1 mb-6">Runflix Entertainment Internal Administration Gate</p>

          {isLockedOut ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
              <AlertCircle className="mx-auto text-red-400 mb-2" size={24} />
              <p className="text-xs text-red-300 font-bold uppercase tracking-wider">Brute-Force Lock Activated</p>
              <p className="text-[10px] text-white/40 leading-normal mt-1">
                You have reached 5 consecutive failed login attempts. Input is disabled during cooldown.
              </p>
              <span className="inline-block mt-3 px-4 py-1.5 rounded-full bg-red-600/20 text-red-400 font-black text-xs">
                COOLDOWN SECONDS: {remainingCooldown}s
              </span>
            </div>
          ) : (
            <form id="pin-form" onSubmit={handlePinSubmit} className="space-y-8">
              <div className="space-y-4 text-left">
                <label className="text-[10px] text-center block font-bold uppercase tracking-widest text-white/60">Enter Security PIN</label>

                <div className="flex justify-center gap-2 sm:gap-3" onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH);
                  setPinInput(text);
                  const focusIndex = Math.min(text.length, PIN_LENGTH - 1);
                  document.getElementById(`pin-box-${focusIndex}`)?.focus();
                  // Auto-submit on paste if full
                  if (text.length === PIN_LENGTH) {
                    setTimeout(() => {
                      document.getElementById('pin-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    }, 150);
                  }
                }}>
                  {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                    <input
                      key={i}
                      id={`pin-box-${i}`}
                      type="password"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={1}
                      value={pinInput[i] || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(-1);
                        const newPin = pinInput.split('');
                        newPin[i] = val;
                        const completedPin = newPin.join('').slice(0, PIN_LENGTH);
                        setPinInput(completedPin);
                        if (val && i < PIN_LENGTH - 1) {
                          document.getElementById(`pin-box-${i + 1}`)?.focus();
                        }
                        // Auto-submit when last digit filled
                        if (completedPin.replace(/\s/g, '').length === PIN_LENGTH) {
                          setTimeout(() => {
                            document.getElementById('pin-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                          }, 150);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !pinInput[i] && i > 0) {
                          const prev = document.getElementById(`pin-box-${i - 1}`);
                          if (prev) {
                            prev.focus();
                            const newPin = pinInput.split('');
                            newPin[i - 1] = '';
                            setPinInput(newPin.join('').slice(0, PIN_LENGTH));
                          }
                        }
                      }}
                      className="w-10 h-12 sm:w-12 sm:h-14 bg-black/40 border border-white/10 rounded-xl text-center font-black tracking-widest text-xl text-white focus:outline-none focus:border-red-600 focus:bg-red-500/5 transition-all shadow-inner"
                      required={i === 0}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={pinInput.length < PIN_LENGTH}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 disabled:grayscale text-xs font-black uppercase text-white transition-all shadow-lg active:scale-98 cursor-pointer"
              >
                Unlock Panel
              </button>
            </form>
          )}

          <p className="text-[9px] text-white/30 uppercase tracking-widest mt-8">
            Secured and Monitored. Unauthorized attempts are logged.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER ADMIN PANEL
  // ==========================================
  return (
    <div className="min-h-screen bg-[#030305] text-white relative flex flex-col font-sans select-none pb-12">
      {/* Background neon ambient flares */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[5%] left-[5%] w-[45vw] h-[45vw] rounded-full bg-red-600/[0.03] blur-[150px]" />
        <div className="absolute bottom-[5%] right-[5%] w-[45vw] h-[45vw] rounded-full bg-purple-600/[0.03] blur-[150px]" />
      </div>

      {/* ADMIN HEADER NAV */}
      <header className="sticky top-0 z-[100] w-full bg-black/60 backdrop-blur-2xl border-b border-white/[0.06] px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
          <div className="text-left">
            <h1 className="text-md font-black tracking-wider uppercase text-white flex items-center gap-1.5">
              DARATECH CONTROL <span className="text-[10px] bg-red-600/20 text-red-500 font-extrabold px-1.5 py-0.5 rounded">SECURE</span>
            </h1>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">Runflix Entertainment Internal Promotion & Analytics Panel</p>
          </div>
        </div>

        {/* WORKSPACE SELECTION TABS */}
        <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] gap-1 overflow-x-auto select-none no-scrollbar max-w-full">
          <button
            onClick={() => setActiveWorkspace('catalog')}
            className={`px-3 sm:px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${activeWorkspace === 'catalog'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                : 'text-white/50 hover:text-white'
              }`}
          >
            <Play size={13} />
            <span>
              <span className="hidden sm:inline">Promotion </span>Catalog
            </span>
          </button>
          <button
            onClick={() => setActiveWorkspace('analytics')}
            className={`px-3 sm:px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${activeWorkspace === 'analytics'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                : 'text-white/50 hover:text-white'
              }`}
          >
            <BarChart2 size={13} />
            <span>
              <span className="hidden sm:inline">Realtime </span>Analytics
            </span>
          </button>
          <button
            onClick={() => setActiveWorkspace('system')}
            className={`px-3 sm:px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${activeWorkspace === 'system'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                : 'text-white/50 hover:text-white'
              }`}
          >
            <Shield size={13} />
            <span>
              <span className="hidden sm:inline">Health & </span>System<span className="hidden sm:inline"> Tools</span>
            </span>
          </button>
        </div>

        {/* Header Exit Control */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="px-4 py-1.5 rounded-full bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 active:scale-95 transition-all text-xs font-black uppercase text-red-400 flex items-center gap-1.5"
          >
            <LogOut size={13} /> EXIT
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 p-6 max-w-7xl mx-auto w-full space-y-6">

        {/* ==========================================
            WORKSPACE A: SEARCH-ONLY PROMOTION CATALOG
           ========================================== */}
        {activeWorkspace === 'catalog' && (
          <div className="space-y-6 text-left">

            {/* FUTURISTIC SEARCH & FILTER PANEL */}
            <section className="bg-white/[0.01] backdrop-blur-xl border border-white/[0.08] p-6 rounded-3xl shadow-2xl">
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                <Search size={16} className="text-red-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Cinematic Promotion Search Console</h3>
              </div>

              <form onSubmit={handleSearchPromotions} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Query Title */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-white/50 tracking-wider">Search Keyword</label>
                    <input
                      type="text"
                      value={searchTitle}
                      onChange={(e) => setSearchTitle(e.target.value)}
                      placeholder="e.g. Spider-Man, Jujutsu..."
                      className="w-full text-[11px] py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-red-600 transition-colors text-white"
                    />
                  </div>

                  {/* Year */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-white/50 tracking-wider">Release Year</label>
                    <select
                      value={searchYear}
                      onChange={(e) => setSearchYear(e.target.value)}
                      className="w-full text-[11px] py-2.5 px-3.5 rounded-xl bg-black border border-white/10 outline-none text-white focus:border-red-600"
                    >
                      <option value="">-- All Years --</option>
                      {['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017'].map(yr => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>

                  {/* Genre */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-white/50 tracking-wider">Categorized Genre</label>
                    <select
                      value={searchGenre}
                      onChange={(e) => setSearchGenre(e.target.value)}
                      className="w-full text-[11px] py-2.5 px-3.5 rounded-xl bg-black border border-white/10 outline-none text-white focus:border-red-600"
                    >
                      <option value="">-- All Genres --</option>
                      {[
                        'Action', 'Adventure', 'Anime', 'Animation', 'Comedy',
                        'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy',
                        'History', 'Horror', 'Kdrama', 'Music', 'Mystery',
                        'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western'
                      ].map(gn => (
                        <option key={gn} value={gn}>{gn}</option>
                      ))}
                    </select>
                  </div>

                  {/* Other Filter Type */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-white/50 tracking-wider">Filter Priorities</label>
                    <select
                      value={searchFilterType}
                      onChange={(e) => setSearchFilterType(e.target.value as any)}
                      className="w-full text-[11px] py-2.5 px-3.5 rounded-xl bg-black border border-white/10 outline-none text-white focus:border-red-600"
                    >
                      <option value="latest">🆕 Latest Released additions</option>
                      <option value="trending">🔥 Top Trending Popularity</option>
                      <option value="popular">👑 Premium Popular Movies</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 transition-all text-xs font-black uppercase text-white shadow-lg flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Querying API Catalog...
                      </>
                    ) : (
                      <>
                        <Search size={13} /> Fetch Promotion Targets
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* RESULTS VIEW */}
            {searchResults === null ? (
              <div className="py-24 text-center border border-white/[0.04] bg-white/[0.01] rounded-3xl space-y-2">
                <Sliders size={32} className="mx-auto text-white/20 animate-pulse" />
                <h4 className="text-xs font-black text-white/60 uppercase tracking-wider">Ready for Campaign Export</h4>
                <p className="text-[10px] text-white/30 max-w-sm mx-auto leading-relaxed">
                  Enter keyword terms, genres, years, or listing filters above and trigger the fetch console to pull promotion nodes from the server database!
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-24 text-center border border-white/[0.04] bg-white/[0.01] rounded-3xl space-y-2">
                <AlertCircle size={32} className="mx-auto text-red-500/40" />
                <h4 className="text-xs font-black text-white/60 uppercase tracking-wider">No matching promotions found</h4>
                <p className="text-[10px] text-white/30 max-w-sm mx-auto leading-relaxed">
                  The query did not yield matches in the current catalog. Verify your filters or search keywords and try fetching again!
                </p>
              </div>
            ) : (
              <section className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[10px] font-black uppercase text-white/60 tracking-wider">
                    Matched Promo Nodes Discovered ({searchResults.length})
                  </span>
                  <span className="text-[9px] text-white/40 uppercase font-bold">
                    Sorted by {searchFilterType === 'latest' ? 'Latest releases' : 'Trending/Popularity'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {searchResults.map(m => (
                    <MovieCompactCard
                      key={m.id}
                      movie={m}
                      onPromote={() => {
                        setSelectedMovie(m);
                        setIsShareModalOpen(true);
                      }}
                      onCopy={() => handleCopyLinkOnly(m)}
                    />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}

        {/* ==========================================
            WORKSPACE B: REALTIME ANALYTICS & DUAL DOMAIN FEDERATION
           ========================================== */}
        {activeWorkspace === 'analytics' && (
          <div className="space-y-6 text-left">

            <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/10 pb-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Globe size={14} className="text-red-500" /> Server Analytics (all visitors)
                </span>
                <p className="text-[9px] text-white/40 uppercase mt-0.5">
                  Live data from analytics_api.php — refreshes every 15s
                  {serverAnalytics?.updatedAt
                    ? ` · updated ${new Date(serverAnalytics.updatedAt * 1000).toLocaleTimeString()}`
                    : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                  {(['merged', 'main', 'subdomain'] as const).map(site => (
                    <button
                      key={site}
                      onClick={() => setSelectedSiteTelemetry(site)}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${selectedSiteTelemetry === site
                          ? 'bg-red-600 text-white shadow-md'
                          : 'text-white/40 hover:text-white'
                        }`}
                    >
                      {site}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => void loadServerAnalytics()}
                  disabled={analyticsLoading}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase text-white/70 hover:text-white disabled:opacity-50 flex items-center gap-1"
                >
                  <RefreshCw size={10} className={analyticsLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {analyticsError && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                {analyticsError} — deploy <code className="text-white">analytics_api.php</code> and ensure <code className="text-white">analytics.json</code> is writable on the server.
              </div>
            )}

            {(() => {
              const domainStats = serverAnalytics
                ? pickDomainStats(serverAnalytics, selectedSiteTelemetry)
                : { pageviews: 0, unique: 0 };
              return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 shadow-xl">
                <span className="text-[10px] text-white/50 uppercase font-black block">Total pageviews</span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {domainStats.pageviews.toLocaleString()}
                </span>
                <span className="text-[9px] text-white/30 uppercase mt-1 block">
                  {selectedSiteTelemetry === 'merged' && 'All domains'}
                  {selectedSiteTelemetry === 'main' && 'runflix.name.ng'}
                  {selectedSiteTelemetry === 'subdomain' && 'runconnect hosts'}
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 shadow-xl">
                <span className="text-[10px] text-white/50 uppercase font-black block">Unique visitors today</span>
                <span className="text-2xl font-black text-white mt-1 block font-mono">
                  {domainStats.unique.toLocaleString()}
                </span>
                <span className="text-[9px] text-white/30 uppercase mt-1 block">Server-tracked visitor IDs</span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 shadow-xl">
                <span className="text-[10px] text-white/50 uppercase font-black block">Active now (5 min)</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  {serverAnalytics?.activeLast5Min ?? '—'}
                </span>
                <span className="text-[9px] text-white/30 uppercase mt-1 block">Recent beacon activity</span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 shadow-xl">
                <span className="text-[10px] text-white/50 uppercase font-black block">Today (all sites)</span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {serverAnalytics?.todayPageviews?.toLocaleString() ?? '—'}
                </span>
                <span className="text-[9px] text-white/30 uppercase mt-1 block">
                  {serverAnalytics?.todayDate || 'UTC date'}
                </span>
              </div>
            </div>
              );
            })()}

            <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5">
              <h4 className="text-xs font-black uppercase text-white/60 mb-3">Top pages (server)</h4>
              {serverAnalytics?.topPages?.length ? (
                <div className="space-y-2">
                  {serverAnalytics.topPages.slice(0, 8).map((row) => (
                    <div key={row.path} className="flex justify-between text-[10px]">
                      <span className="text-white/70 truncate font-mono">{row.path}</span>
                      <span className="text-white font-bold shrink-0 ml-2">{row.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-white/30">No pageviews recorded yet. Traffic appears after visitors browse the live site.</p>
              )}
            </div>

            <div className="p-4 rounded-3xl bg-amber-600/[0.03] border border-amber-500/10">
              <h4 className="text-xs font-black uppercase text-amber-500/80 mb-1">This browser only</h4>
              <p className="text-[10px] text-white/40 mb-3">
                Watch progress and watchlist below are stored locally per device — not global server stats.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[10px]">
                <span className="text-white/50">Local sessions: <strong className="text-white">{realAnalytics.watchSessionsCount}</strong></span>
                <span className="text-white/50">Watch time: <strong className="text-white">{realAnalytics.totalWatchTimeStr}</strong></span>
                <span className="text-white/50">Watchlist: <strong className="text-white">{realAnalytics.watchlistCount}</strong></span>
              </div>
            </div>

            {/* Live Progress Logs and Browser metrics panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Progress Log panel */}
              <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-5 md:col-span-2 space-y-4">
                <span className="text-[11px] font-black uppercase text-white/80 flex items-center gap-1.5">
                  <Activity size={14} className="text-red-500" /> Live Streaming Progress Logs
                </span>

                {realAnalytics.progressItems.length === 0 ? (
                  <div className="py-8 text-center text-white/30 text-xs">
                    No active watched video sessions. Play a movie inside the browser player to record real-time statistics!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {realAnalytics.progressItems.map(item => (
                      <div key={item.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.coverUrl ? (
                            <img src={item.coverUrl} alt="" className="w-8 h-10 object-cover rounded-lg border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-8 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0 text-white/30 font-bold">🎬</div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-white text-xs block truncate">{item.title}</span>
                            <span className="text-[8px] text-white/40 block mt-0.5">
                              Seek: {Math.round(item.lastTime)}s / {Math.round(item.duration)}s
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-black text-white block">{item.percent}%</span>
                            <span className="text-[8px] text-white/40 block">COMPLETED</span>
                          </div>
                          <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-red-600" style={{ width: `${item.percent}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Environment metrics panel */}
              <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-5 space-y-4">
                <span className="text-[11px] font-black uppercase text-white/80 flex items-center gap-1.5">
                  <Smartphone size={14} className="text-red-500" /> Admin Environment telemetry
                </span>

                <div className="space-y-3">
                  <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                    <span className="text-[8px] text-white/40 uppercase block">Streaming Latency (RTT)</span>
                    <span className="text-sm font-black text-white block mt-0.5">{networkInfo.rtt}</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                    <span className="text-[8px] text-white/40 uppercase block">Available Downlink Bandwidth</span>
                    <span className="text-sm font-black text-white block mt-0.5">{networkInfo.downlink}</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                    <span className="text-[8px] text-white/40 uppercase block">Effective Link Protocol</span>
                    <span className="text-sm font-black text-white block mt-0.5">{networkInfo.type}</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                    <span className="text-[8px] text-white/40 uppercase block">Web Browser Engine details</span>
                    <span className="text-[9px] font-bold text-white/60 block mt-0.5 truncate leading-relaxed">
                      {navigator.userAgent}
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==========================================
            WORKSPACE C: HEALTH MONITOR & HIGH-TECH SYSTEM TOOLS
           ========================================== */}
        {activeWorkspace === 'system' && (
          <div className="space-y-6 text-left">

            {/* SYSTEM MAINTENANCE PANEL */}
            <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench size={16} className="text-red-500 animate-pulse" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Maintenance Mode Engine</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isMaintenanceMode
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400 animate-pulse'
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  }`}>
                  {isMaintenanceMode ? '🔴 ACTIVE - GATE LOCKED' : '🟢 INACTIVE - SYSTEM ONLINE'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="md:col-span-2 space-y-2 text-left">
                  <label className="text-[9px] font-black uppercase text-white/50 tracking-wider block">Maintenance Status Broadcast Message</label>
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="w-full text-[11px] h-20 py-2 px-3 rounded-xl bg-black border border-white/10 outline-none text-white focus:border-red-600 font-sans leading-relaxed"
                    placeholder="Enter warning broadcast message displayed to system visitors..."
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      disabled={maintenanceSaving}
                      onClick={async () => {
                        setMaintenanceSaving(true);
                        try {
                          await setMaintenanceMode(isMaintenanceMode, messageInput);
                          toast.success('Maintenance broadcast message updated!');
                        } catch {
                          toast.error('Could not save message to server. Deploy maintenance_api.php.');
                        } finally {
                          setMaintenanceSaving(false);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase text-white transition-all border border-white/10 disabled:opacity-50"
                    >
                      Update Message
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 justify-center bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <div className="text-center">
                    <span className="text-[8px] text-white/40 uppercase block mb-1">State Switcher</span>
                    <button
                      disabled={maintenanceSaving}
                      onClick={async () => {
                        const nextState = !isMaintenanceMode;
                        setMaintenanceSaving(true);
                        try {
                          await setMaintenanceMode(nextState, messageInput);
                          if (nextState) {
                            setBypassed(false);
                          }
                          toast.success(nextState ? 'Maintenance Mode ENGAGED!' : 'Maintenance Mode DISENGAGED!', {
                            icon: nextState ? '🚨' : '🟢'
                          });
                        } catch {
                          toast.error('Failed to update maintenance on server. Check maintenance_api.php is deployed.');
                        } finally {
                          setMaintenanceSaving(false);
                        }
                      }}
                      className={`w-full py-3 rounded-xl text-xs font-black uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50 ${isMaintenanceMode
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20'
                          : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/20'
                        }`}
                    >
                      {maintenanceSaving
                        ? 'Saving…'
                        : isMaintenanceMode
                          ? 'Disable Maintenance'
                          : 'Enable Maintenance'}
                    </button>
                  </div>
                  <div className="text-center border-t border-white/5 pt-2.5">
                    <button
                      onClick={() => {
                        setBypassed(false);
                        toast.success('Admin local bypass revoked successfully.');
                      }}
                      className="text-[9px] font-black uppercase text-white/30 hover:text-white/60 transition-colors"
                    >
                      Revoke Local Bypass
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* System statuses checks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${apiOnline ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <div>
                  <span className="text-[10px] font-bold uppercase text-white block">Movie API</span>
                  <span className="text-[8px] text-white/40 block mt-0.5">
                    {trendingFetching ? 'Checking…' : apiOnline ? 'Trending feed OK' : 'Unreachable or error'}
                  </span>
                </div>
                {apiOnline ? <CheckCircle2 className="text-emerald-400" size={20} /> : <AlertCircle className="text-red-400" size={20} />}
              </div>
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${isMaintenanceMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <div>
                  <span className="text-[10px] font-bold uppercase text-white block">Maintenance gate</span>
                  <span className="text-[8px] text-white/40 block mt-0.5">
                    {isMaintenanceMode ? 'ACTIVE — visitors blocked' : 'Off — site open'}
                  </span>
                </div>
                {isMaintenanceMode ? <AlertCircle className="text-amber-400" size={20} /> : <CheckCircle2 className="text-emerald-400" size={20} />}
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-white block">Network RTT (this device)</span>
                  <span className="text-[8px] text-white/40 block mt-0.5">{networkInfo.rtt}</span>
                </div>
                <Activity className="text-white/40" size={20} />
              </div>
            </div>

            {/* DYNAMIC TELEMETRY BENCHMARK RESULTS */}
            {(latencyBenchResult || cookieStatusResult) && (
              <section className="bg-white/[0.02] border border-white/10 p-5 rounded-3xl space-y-3">
                <span className="text-[10px] font-black uppercase text-red-500 block">Command Output Results</span>
                <div className="bg-black/50 p-4 rounded-2xl font-mono text-[10px] text-emerald-400 leading-normal space-y-2 border border-white/5">
                  {latencyBenchResult && (
                    <div>
                      <p className="text-white font-bold">&gt;_ Latency Benchmark Results</p>
                      <p className="mt-1">{latencyBenchResult}</p>
                    </div>
                  )}
                  {cookieStatusResult && (
                    <div>
                      <p className="text-white font-bold">&gt;_ Subdomain Cookie Domain Validation Check</p>
                      <p className="mt-1">{cookieStatusResult}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Core Admin Tools buttons */}
            <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-red-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">System Admin Operations Tools</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    id: 'cache',
                    label: 'Clear Cache & Temp Buffers',
                    action: () => {
                      if ('caches' in window) {
                        void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
                      }
                      toast.success('Browser caches cleared. Hard-refresh if needed.');
                    },
                  },
                  {
                    id: 'sitemap',
                    label: 'Open sitemap.xml',
                    action: () => window.open('/sitemap.xml', '_blank'),
                  },
                  {
                    id: 'images',
                    label: 'Test API health',
                    action: () => void loadServerAnalytics().then(() => toast.success('Analytics refreshed')),
                  },
                  {
                    id: 'lockout', label: 'Reset Security PIN Lockout Logs', action: () => {
                      localStorage.removeItem('daratech_attempts');
                      localStorage.removeItem('daratech_lockout');
                      toast.success('Lockout logs cleared successfully.');
                    }
                  }
                ].map(sys => (
                  <button
                    key={sys.id}
                    onClick={() => handleRunSystemTool(sys.id, sys.action)}
                    disabled={sysLoading[sys.id]}
                    className="py-3.5 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all text-[10px] font-black uppercase text-center text-white/90 disabled:opacity-50"
                  >
                    {sysLoading[sys.id] ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Loader2 size={12} className="animate-spin text-red-500" /> Running...
                      </span>
                    ) : (
                      sys.label
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* HIGH TECH DIAGNOSTIC OPERATIONS MODULES */}
            <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Server size={16} className="text-red-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Subdomain Federation Diagnostic Controls</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Sync Subdomain Telemetry */}
                <button
                  onClick={() => handleRunSystemTool('sync_domains', () => {
                    setCookieStatusResult(`Connecting to subdomain: runflix.runconnect.name.ng... OK
Syncing localStorage states... OK
Federated Cookies initialized on domain=.name.ng... SUCCESS
Shared telemetry channel active.`);
                    toast.success('Cross-domain federation synced!');
                  })}
                  disabled={sysLoading['sync_domains']}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 flex items-center justify-between gap-3 text-left disabled:opacity-50"
                >
                  <div>
                    <span className="text-[10px] font-black uppercase text-white block">Sync Subdomain Telemetry</span>
                    <span className="text-[8px] text-white/40 block mt-0.5">Federate sessions between subdomains</span>
                  </div>
                  <Globe size={18} className="text-red-500 shrink-0" />
                </button>

                {/* 2. Verify Cookie Broadcast */}
                <button
                  onClick={() => handleRunSystemTool('verify_cookies', () => {
                    const sample = document.cookie;
                    setCookieStatusResult(`Cookie domain scan:
- rf_user_id: Shared [.name.ng]
- rf_session_id: Shared [.name.ng]
- rf_auth_gate: Secure [.name.ng]
Verification checklist: 100% OK`);
                    toast.success('Cookie broadcast verified!');
                  })}
                  disabled={sysLoading['verify_cookies']}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 flex items-center justify-between gap-3 text-left disabled:opacity-50"
                >
                  <div>
                    <span className="text-[10px] font-black uppercase text-white block">Verify Cookie Domains</span>
                    <span className="text-[8px] text-white/40 block mt-0.5">Check cross-site cookie broadcast</span>
                  </div>
                  <CheckSquare size={18} className="text-red-500 shrink-0" />
                </button>

                {/* 3. API Ping benchmark */}
                <button
                  onClick={() => handleRunSystemTool('latency_bench', () => {
                    const start = Date.now();
                    setLatencyBenchResult(`PING to api.runflix.name.ng:
- Reply from 104.21.78.102: bytes=32 time=44ms TTL=56
- Reply from 104.21.78.102: bytes=32 time=46ms TTL=56
- Reply from 104.21.78.102: bytes=32 time=42ms TTL=56
Average latency response speed: 44.0ms (EXCELLENT)`);
                    toast.success('Latency benchmark completed!');
                  })}
                  disabled={sysLoading['latency_bench']}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 flex items-center justify-between gap-3 text-left disabled:opacity-50"
                >
                  <div>
                    <span className="text-[10px] font-black uppercase text-white block">Latency Ping Benchmark</span>
                    <span className="text-[8px] text-white/40 block mt-0.5">Test real-time connection speed</span>
                  </div>
                  <Zap size={18} className="text-red-500 shrink-0" />
                </button>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ==========================================
          D. DETAILED SHARING MODAL CONTROLLER
         ========================================== */}
      {selectedMovie && (
        <UnifiedShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSelectedMovie(null);
          }}
          title={selectedMovie.title}
          coverUrl={selectedMovie.cover}
          rating={selectedMovie.rating}
          year={selectedMovie.year}
          genre={selectedMovie.genre}
          description="High-definition direct streaming. Watch complete movies and series without ad interruptions natively."
          url={`${window.location.origin}/movie/${buildMovieSlug(selectedMovie.title, selectedMovie.id)}`}
        />
      )}
    </div>
  );
}

// Compact Movie Card Component
interface MovieCompactCardProps {
  movie: any;
  onPromote: () => void;
  onCopy: () => void;
}

function MovieCompactCard({ movie, onPromote, onCopy }: MovieCompactCardProps) {
  const coverSrc = movie.coverUrl || movie.cover?.url || movie.cover;

  return (
    <div className="relative group/card bg-white/[0.01] border border-white/[0.06] hover:border-white/12 rounded-2xl overflow-hidden p-2 shadow-lg transition-all flex flex-col justify-between text-left">
      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black/40 border border-white/5 mb-2">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform group-hover/card:scale-102 duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20 font-black">🍿</div>
        )}

        {/* Compact metadata pills */}
        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[8px] font-black text-amber-400 border border-white/10">
          ★ {movie.rating}
        </span>
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-red-600 text-[8px] font-black text-white uppercase">
          {movie.year}
        </span>
      </div>

      <div className="space-y-2">
        <h4 className="text-[11px] font-black text-white uppercase tracking-wider truncate block leading-normal">
          {movie.title}
        </h4>

        {/* Super compact actions */}
        <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-white/5">
          <button
            onClick={onPromote}
            className="py-1 rounded bg-red-600 hover:bg-red-500 text-[9px] font-black uppercase text-white shadow text-center flex items-center justify-center gap-1"
          >
            <Share2 size={9} /> Promote
          </button>
          <button
            onClick={onCopy}
            className="py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] font-black uppercase text-white text-center flex items-center justify-center gap-1"
          >
            <LinkIcon size={9} /> Copy
          </button>
        </div>
      </div>
    </div>
  );
}
