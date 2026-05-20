import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Compass, Download, Heart, Menu, X, Tv,
  Trophy, Clock, Radio, ChevronDown, Sparkles, Shield,
  MessageSquare, Library, FileText, HelpCircle, Search,
  Flame, Layers
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { fetchSearch } from '../api/client';
import { buildMoviePath } from '../utils/slug';
import { useQuery } from '@tanstack/react-query';

const mobileNavLinks = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Explore', path: '/explore', icon: Compass },
  { name: 'Search', path: '/search', icon: Search },
  { name: 'Watchlist', path: '/watchlist', icon: Heart },
  { name: 'History', path: '/history', icon: Clock },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 180);

  // Desktop Dropdown Open States
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  // Mobile Sidebar Collapsible Accordion States
  const [mobileChannelsOpen, setMobileChannelsOpen] = useState(true);
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
  const [mobileSupportOpen, setMobileSupportOpen] = useState(false);

  // Dropdown Refs for Click Outside Close
  const channelsRef = useRef<HTMLDivElement>(null);
  const libraryRef = useRef<HTMLDivElement>(null);
  const supportRef = useRef<HTMLDivElement>(null);

  // Handle outside clicks to close desktop dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (channelsRef.current && !channelsRef.current.contains(target)) {
        setChannelsOpen(false);
      }
      if (libraryRef.current && !libraryRef.current.contains(target)) {
        setLibraryOpen(false);
      }
      if (supportRef.current && !supportRef.current.contains(target)) {
        setSupportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Monitor scroll height to adjust style (throttled via rAF)
  useEffect(() => {
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setScrolled(window.scrollY > 20);
      });
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Reset overlays on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setChannelsOpen(false);
    setLibraryOpen(false);
    setSupportOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  useEffect(() => {
    if (!searchOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [searchOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [mobileMenuOpen]);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['global-dialog-search', debouncedSearch],
    queryFn: () => fetchSearch(debouncedSearch, 1),
    enabled: searchOpen && debouncedSearch.trim().length > 1,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Hide navbar on watch and player pages
  if (location.pathname.startsWith('/watch') || location.pathname.startsWith('/player')) {
    return null;
  }

  return (
    <>
      {/* ============ DESKTOP & LAPTOP HEADER ============ */}
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500 pt-[var(--safe-top)]',
          scrolled
            ? 'py-2.5 pt-[max(0.625rem,var(--safe-top))] bg-black/25 backdrop-blur-lg border-b border-white/[0.06] shadow-lg'
            : 'py-4.5 pt-[max(1.125rem,var(--safe-top))] bg-transparent border-b border-transparent'
        )}
      >
        <div className="max-w-[1440px] mx-auto px-5 lg:px-8 xl:px-10 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group shrink-0"
            aria-label="Runflix Entertainment Home"
          >
            <img
              src="/logo.png"
              alt="Runflix Entertainment"
              className="h-8 lg:h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-103"
            />
          </Link>

          {/* Desktop Nav Links (Grouped into interactive dropdowns) */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2">

            {/* Direct Home Link */}
            <Link
              to="/"
              className={cn(
                'relative px-4 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all duration-300',
                location.pathname === '/' ? 'text-white' : 'text-[var(--rf-text-muted)] hover:text-white'
              )}
            >
              {location.pathname === '/' && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-white/[0.06] border border-white/[0.08]"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5"><Home size={14} /> Home</span>
            </Link>

            {/* 1. Explore Channels Dropdown */}
            <div
              ref={channelsRef}
              className="relative"
              onMouseEnter={() => {
                setChannelsOpen(true);
                setLibraryOpen(false);
                setSupportOpen(false);
              }}
              onMouseLeave={() => setChannelsOpen(false)}
            >
              <button
                onClick={() => setChannelsOpen(!channelsOpen)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all duration-300 flex items-center gap-1.5 text-[var(--rf-text-muted)] hover:text-white',
                  (channelsOpen || ['/anime', '/kdrama', '/sports', '/run-mode', '/explore'].includes(location.pathname)) && 'text-white bg-white/[0.04]'
                )}
              >
                <Compass size={14} />
                <span>Channels</span>
                <ChevronDown size={12} className={cn('transition-transform duration-300', channelsOpen && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {channelsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-[calc(100%+8px)] left-0 w-72 bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-0.5"
                  >
                    {[
                      { name: 'Anime Channel', path: '/anime', emoji: '🎌', color: 'text-fuchsia-400', desc: 'Hot new anime releases' },
                      { name: 'KDrama Spot', path: '/kdrama', emoji: '🇰🇷', color: 'text-rose-400', desc: 'Popular Korean dramas' },
                      { name: 'Sports Hub', path: '/sports', emoji: '🏆', color: 'text-emerald-400', desc: 'Live sports streaming' },
                      { name: 'RUN Mode Live', path: '/run-mode', emoji: '📺', color: 'text-[var(--rf-red)]', desc: 'Non-stop movie channels' },
                      { name: 'Trending Now', path: '/trending', emoji: '🔥', color: 'text-orange-400', desc: 'What everyone is watching' },
                      { name: 'Featured Collections', path: '/collections', emoji: '🗂️', color: 'text-blue-400', desc: 'Handpicked themed collections' },
                      { name: 'Browse by Genre', path: '/genre', emoji: '🎬', color: 'text-purple-400', desc: 'Find movies by category' },
                      { name: 'Explore Categories', path: '/explore', emoji: '🧭', color: 'text-cyan-400', desc: 'Browse all movies & genres' },
                    ].map((item) => (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setChannelsOpen(false)}
                        className="flex items-start gap-3.5 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
                      >
                        <span className="text-base mt-0.5 shrink-0 select-none">{item.emoji}</span>
                        <div>
                          <h5 className="text-xs font-bold text-white group-hover:text-[var(--rf-red)] transition-colors">{item.name}</h5>
                          <p className="text-[10px] text-[var(--rf-text-dim)]">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2. Personal Library Dropdown */}
            <div
              ref={libraryRef}
              className="relative"
              onMouseEnter={() => {
                setLibraryOpen(true);
                setChannelsOpen(false);
                setSupportOpen(false);
              }}
              onMouseLeave={() => setLibraryOpen(false)}
            >
              <button
                onClick={() => setLibraryOpen(!libraryOpen)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all duration-300 flex items-center gap-1.5 text-[var(--rf-text-muted)] hover:text-white',
                  (libraryOpen || ['/watchlist', '/history', '/downloads'].includes(location.pathname)) && 'text-white bg-white/[0.04]'
                )}
              >
                <Library size={14} />
                <span>Library</span>
                <ChevronDown size={12} className={cn('transition-transform duration-300', libraryOpen && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {libraryOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-[calc(100%+8px)] left-0 w-64 bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-0.5"
                  >
                    {[
                      { name: 'Watchlist', path: '/watchlist', icon: Heart, color: 'text-rose-400', desc: 'Saved movies & shows' },
                      { name: 'History Logs', path: '/history', icon: Clock, color: 'text-blue-400', desc: 'Your viewing history' },
                      { name: 'Offline Downloads', path: '/downloads', icon: Download, color: 'text-emerald-400', desc: 'Saved file downloads list' },
                    ].map((item) => (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setLibraryOpen(false)}
                        className="flex items-start gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors group"
                      >
                        <item.icon size={15} className={cn('mt-0.5 shrink-0', item.color)} />
                        <div>
                          <h5 className="text-xs font-bold text-white group-hover:text-[var(--rf-red)] transition-colors">{item.name}</h5>
                          <p className="text-[10px] text-[var(--rf-text-dim)]">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. Support & Legal Dropdown */}
            <div
              ref={supportRef}
              className="relative"
              onMouseEnter={() => {
                setSupportOpen(true);
                setChannelsOpen(false);
                setLibraryOpen(false);
              }}
              onMouseLeave={() => setSupportOpen(false)}
            >
              <button
                onClick={() => setSupportOpen(!supportOpen)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all duration-300 flex items-center gap-1.5 text-[var(--rf-text-muted)] hover:text-white',
                  (supportOpen || ['/contact', '/dmca', '/privacy'].includes(location.pathname)) && 'text-white bg-white/[0.04]'
                )}
              >
                <HelpCircle size={14} />
                <span>Support</span>
                <ChevronDown size={12} className={cn('transition-transform duration-300', supportOpen && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {supportOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-[calc(100%+8px)] right-0 w-64 bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-0.5"
                  >
                    {[
                      { name: 'Contact Support', path: '/contact', icon: MessageSquare, color: 'text-blue-400', desc: 'Get in touch with support' },
                      { name: 'DMCA Take-down', path: '/dmca', icon: Shield, color: 'text-amber-400', desc: 'Copyright policy & requests' },
                      { name: 'Privacy Policy', path: '/privacy', icon: FileText, color: 'text-emerald-400', desc: 'User privacy & data details' },
                    ].map((item) => (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setSupportOpen(false)}
                        className="flex items-start gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors group"
                      >
                        <item.icon size={15} className={cn('mt-0.5 shrink-0', item.color)} />
                        <div>
                          <h5 className="text-xs font-bold text-white group-hover:text-[var(--rf-red)] transition-colors">{item.name}</h5>
                          <p className="text-[10px] text-[var(--rf-text-dim)]">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Desktop Right Panel Utility */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 rounded-xl glass-2 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-white/80 hover:text-white"
              aria-label="Search Catalog"
            >
              <Search size={16} />
            </button>
            <div className="relative w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden bg-black/40 shadow-lg shadow-black/30">
              <img src="/apple-touch-icon.png" alt="Runflix Entertainment" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Mobile Menu & Search Trigger Button */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 rounded-xl glass-2 flex items-center justify-center text-white/80"
              aria-label="Search"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-9 h-9 rounded-xl glass-2 flex items-center justify-center text-white/80"
              aria-label="Open menu"
            >
              <Menu size={16} />
            </button>
          </div>

        </div>
      </nav>

      {/* ============ MOBILE FLOATING TAB NAV ============ */}
      <nav
        className="md:hidden mobile-nav"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around">
          {mobileNavLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            const isAnime = link.path === '/anime';
            const isSearch = link.name === 'Search';

            const buttonContent = (
              <>
                {isActive && !isSearch && (
                  <motion.div
                    layoutId="mobile-nav-active"
                    className={cn(
                      'absolute inset-0 rounded-xl',
                      isAnime
                        ? 'bg-fuchsia-500/10 border border-fuchsia-500/20'
                        : 'bg-[var(--rf-red)]/10 border border-[var(--rf-red)]/20'
                    )}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex flex-col items-center gap-0.5">
                  {isAnime ? (
                    <span className="text-lg leading-none"
                      style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(232,121,249,0.6))' } : {}}
                    >🎌</span>
                  ) : (
                    <Icon
                      size={18}
                      className={cn(
                        'transition-all duration-300',
                        isActive && !isSearch && 'drop-shadow-[0_0_6px_rgba(229,9,20,0.5)]'
                      )}
                      fill={isActive && !isSearch ? 'currentColor' : 'none'}
                    />
                  )}
                  <span className="text-[9px] font-bold tracking-tight">{link.name}</span>
                </span>
              </>
            );

            if (isSearch) {
              return (
                <button
                  key={link.name}
                  onClick={() => setSearchOpen(true)}
                  className="relative flex flex-col items-center justify-center py-1.5 px-3.5 rounded-xl transition-all duration-300 text-[var(--rf-text-dim)] active:scale-90"
                  aria-label={link.name}
                >
                  <span className="flex flex-col items-center gap-0.5">
                    <Icon size={18} />
                    <span className="text-[9px] font-bold tracking-tight">{link.name}</span>
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={link.name}
                to={link.path}
                className={cn(
                  'relative flex flex-col items-center justify-center py-1.5 px-3.5 rounded-xl transition-all duration-300',
                  isActive
                    ? isAnime ? 'text-fuchsia-400' : 'text-[var(--rf-red)]'
                    : 'text-[var(--rf-text-dim)] active:scale-90'
                )}
                aria-label={link.name}
                aria-current={isActive ? 'page' : undefined}
              >
                {buttonContent}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ============ MOBILE SIDEBAR PANEL ============ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md md:hidden"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 z-[200] w-4/5 max-w-sm bg-gradient-to-b from-[#0a0a0f] to-[#040406] border-l border-white/[0.08] shadow-2xl p-6 flex flex-col md:hidden overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg border border-white/[0.08] flex items-center justify-center overflow-hidden bg-black/40 shadow-md">
                    <img src="/apple-touch-icon.png" alt="Runflix Entertainment" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm font-bold tracking-tight text-white">Menu Navigation</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-lg glass-2 flex items-center justify-center text-white/60 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Accordion List Container */}
              <div className="space-y-4 flex-1">

                {/* 1. Discover Channels Accordion */}
                <div className="border border-white/[0.04] bg-white/[0.01] rounded-2xl p-2.5 transition-all">
                  <button
                    onClick={() => setMobileChannelsOpen(!mobileChannelsOpen)}
                    className="flex items-center justify-between w-full px-2 py-1 text-[10px] font-bold text-[var(--rf-text-dim)] uppercase tracking-wider select-none"
                  >
                    <span>Discover Channels</span>
                    <ChevronDown size={12} className={cn("transition-transform duration-300", mobileChannelsOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence initial={false}>
                    {mobileChannelsOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-1 mt-1.5"
                      >
                        {[
                          { name: 'Home', path: '/', emoji: '🏠' },
                          { name: 'Explore Categories', path: '/explore', emoji: '🧭' },
                          { name: 'Trending Now', path: '/trending', emoji: '🔥', badge: 'HOT', badgeColor: 'bg-orange-500/20 text-orange-300' },
                          { name: 'Featured Collections', path: '/collections', emoji: '🗂️' },
                          { name: 'Browse by Genre', path: '/genre', emoji: '🎬' },
                          { name: 'Anime Channel', path: '/anime', emoji: '🎌', badge: 'NEW', badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300' },
                          { name: 'KDrama Spot', path: '/kdrama', emoji: '🇰🇷', badge: 'HOT', badgeColor: 'bg-rose-500/20 text-rose-300' },
                          { name: 'Sports Hub', path: '/sports', emoji: '🏆', badge: 'LIVE', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
                          { name: 'RUN Mode Streams', path: '/run-mode', emoji: '📺', badge: 'TV', badgeColor: 'bg-red-500/20 text-red-300' },
                        ].map((item) => {
                          const isActive = location.pathname === item.path;
                          return (
                            <Link
                              key={item.name}
                              to={item.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border",
                                isActive
                                  ? "bg-white/[0.04] text-white border-white/[0.08]"
                                  : "text-[var(--rf-text-muted)] hover:text-white border-transparent hover:bg-white/[0.02]"
                              )}
                            >
                              <span className="text-sm shrink-0">{item.emoji}</span>
                              <span>{item.name}</span>
                              {item.badge && (
                                <span className={cn("ml-auto px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider uppercase scale-90", item.badgeColor)}>
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 2. Personal Space Accordion */}
                <div className="border border-white/[0.04] bg-white/[0.01] rounded-2xl p-2.5 transition-all">
                  <button
                    onClick={() => setMobileLibraryOpen(!mobileLibraryOpen)}
                    className="flex items-center justify-between w-full px-2 py-1 text-[10px] font-bold text-[var(--rf-text-dim)] uppercase tracking-wider select-none"
                  >
                    <span>Your Space</span>
                    <ChevronDown size={12} className={cn("transition-transform duration-300", mobileLibraryOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence initial={false}>
                    {mobileLibraryOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-1 mt-1.5"
                      >
                        {[
                          { name: 'Watchlist', path: '/watchlist', icon: Heart, color: 'text-rose-400' },
                          { name: 'History Logs', path: '/history', icon: Clock, color: 'text-blue-400' },
                          { name: 'Offline Downloads', path: '/downloads', icon: Download, color: 'text-emerald-400' },
                        ].map((item) => {
                          const isActive = location.pathname === item.path;
                          return (
                            <Link
                              key={item.name}
                              to={item.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border",
                                isActive
                                  ? "bg-white/[0.04] text-white border-white/[0.08]"
                                  : "text-[var(--rf-text-muted)] hover:text-white border-transparent hover:bg-white/[0.02]"
                              )}
                            >
                              <item.icon size={14} className={cn("shrink-0", item.color)} />
                              <span>{item.name}</span>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 3. Support & Legal Accordion */}
                <div className="border border-white/[0.04] bg-white/[0.01] rounded-2xl p-2.5 transition-all">
                  <button
                    onClick={() => setMobileSupportOpen(!mobileSupportOpen)}
                    className="flex items-center justify-between w-full px-2 py-1 text-[10px] font-bold text-[var(--rf-text-dim)] uppercase tracking-wider select-none"
                  >
                    <span>Support & legal</span>
                    <ChevronDown size={12} className={cn("transition-transform duration-300", mobileSupportOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence initial={false}>
                    {mobileSupportOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-1 mt-1.5"
                      >
                        {[
                          { name: 'Contact Support', path: '/contact', icon: MessageSquare, color: 'text-blue-400' },
                          { name: 'DMCA Policy', path: '/dmca', icon: Shield, color: 'text-amber-400' },
                          { name: 'Privacy Policy', path: '/privacy', icon: FileText, color: 'text-emerald-400' },
                        ].map((item) => {
                          const isActive = location.pathname === item.path;
                          return (
                            <Link
                              key={item.name}
                              to={item.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border",
                                isActive
                                  ? "bg-white/[0.04] text-white border-white/[0.08]"
                                  : "text-[var(--rf-text-muted)] hover:text-white border-transparent hover:bg-white/[0.02]"
                              )}
                            >
                              <item.icon size={14} className={cn("shrink-0", item.color)} />
                              <span>{item.name}</span>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>

              {/* Footer details */}
              <div className="mt-8 pt-6 text-center border-t border-white/[0.04]">
                <p className="text-[8px] text-white/20 uppercase tracking-widest font-black">
                  Runflix Entertainment v1.4.0 • Premium Entertainment
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============ INSTANT SEARCH DIALOG OVERLAY ============ */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col p-4 md:p-8"
          >
            {/* Header / Top row */}
            <div className="max-w-5xl w-full mx-auto flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden bg-black/40 shadow-lg shadow-black/40">
                  <img src="/apple-touch-icon.png" alt="Runflix Entertainment" className="w-full h-full object-cover" />
                </div>
                <h2 className="text-xl font-bold text-white hidden sm:block">Instant Search</h2>
              </div>
              <button
                onClick={() => setSearchOpen(false)}
                className="w-10 h-10 rounded-xl glass-2 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-[var(--rf-text-muted)] hover:text-white"
                aria-label="Close search"
              >
                <X size={20} />
              </button>
            </div>

            {/* Large Search Input */}
            <div className="max-w-5xl w-full mx-auto relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[var(--rf-text-dim)]">
                <Search size={22} className="text-white/40" />
              </div>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies, anime, series..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-4.5 pl-14 pr-12 text-lg text-white placeholder-white/30 focus:outline-none focus:border-[var(--rf-red)]/50 focus:ring-1 focus:ring-[var(--rf-red)]/40 transition-all font-medium glass-3 shadow-2xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-4 flex items-center text-[var(--rf-text-dim)] hover:text-white p-2 rounded transition-colors"
                  aria-label="Clear search"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Results Grid Container */}
            <div className="max-w-5xl w-full mx-auto flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-8 h-8 border-3 border-[var(--rf-red)] border-t-transparent rounded-full mb-4"
                  />
                  <p className="text-sm text-[var(--rf-text-dim)]">Searching database...</p>
                </div>
              ) : searchQuery.trim().length <= 1 ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4 opacity-30">🍿</div>
                  <h3 className="text-lg font-bold text-white mb-1">Discover Something New</h3>
                  <p className="text-xs text-[var(--rf-text-dim)] max-w-sm mx-auto">
                    Type a movie name, animated anime, TV series, or genre keywords to find what you want instantly.
                  </p>
                </div>
              ) : searchResults?.items && searchResults.items.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-12"
                >
                  {searchResults.items.map((movie, idx) => (
                    <Link
                      key={`${movie.subjectId}-${idx}`}
                      to={buildMoviePath(movie.title || movie.name, movie.subjectId)}
                      onClick={() => setSearchOpen(false)}
                      className="group flex items-center gap-4 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-[var(--rf-red)]/30 rounded-2xl p-2.5 transition-all duration-300 active:scale-[0.99]"
                    >
                      {/* Left cover image */}
                      <div className="w-16 h-22 sm:w-20 sm:h-26 rounded-xl overflow-hidden shrink-0 bg-white/[0.02] border border-white/[0.04]">
                        <img
                          src={typeof movie.cover === 'object' && movie.cover ? (movie.cover as any).url : (movie.cover || '')}
                          alt={movie.title || movie.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>

                      {/* Right details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="text-sm sm:text-base font-bold text-white line-clamp-1 group-hover:text-[var(--rf-red)] transition-colors">
                          {movie.title || movie.name}
                        </h4>

                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[var(--rf-text-muted)] font-medium">
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] text-white/70 font-semibold uppercase tracking-wider">
                            {movie.subjectType === 2 ? '📺 Series' : '🎬 Movie'}
                          </span>
                          {movie.releaseDate && (
                            <span>{movie.releaseDate.substring(0, 4)}</span>
                          )}
                          {movie.genre && (
                            <span className="text-[10px] text-white/40 truncate max-w-[120px] sm:max-w-none">
                              • {movie.genre}
                            </span>
                          )}
                        </div>

                        {(() => {
                          const rawRating = movie.rating || movie.imdbRatingValue;
                          const ratingNum = Number(rawRating);
                          if (!rawRating || isNaN(ratingNum) || ratingNum <= 0) return null;
                          return (
                            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-[var(--rf-gold)]">
                              <span>★</span>
                              <span>{ratingNum.toFixed(1)}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </Link>
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-lg font-bold text-white mb-1">No Results Found</h3>
                  <p className="text-xs text-[var(--rf-text-dim)]">
                    We couldn't find any match for "{searchQuery}". Try different keywords.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
