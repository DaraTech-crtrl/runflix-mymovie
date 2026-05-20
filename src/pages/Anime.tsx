import { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTrending, fetchHomepage, fetchSearch } from '../api/client';
import { motion, AnimatePresence } from 'motion/react';
import {
  Film,
  Tv,
  Clapperboard,
  Star,
  SlidersHorizontal,
  Zap,
  TrendingUp,
  Globe,
  Search,
  X,
} from 'lucide-react';
import { MovieCardGrid } from '../components/MovieCard';
import { MovieRow } from '../components/MovieRow';
import { MovieCard } from '../components/MovieCard';
import { GridSkeleton } from '../components/ui/Skeleton';
import { useSEO } from '../hooks/useSEO';
import { cn } from '../utils/cn';

/* ─── Constants ─────────────────────────────────────────────── */

const ANIME_KEYWORDS = ['anime', 'animation', 'cartoon'];

const ANIME_SEARCH_TERMS = [
  'anime',
  'naruto',
  'one piece',
  'dragon ball',
  'attack on titan',
  'demon slayer',
  'jujutsu kaisen',
  'bleach',
  'fullmetal alchemist',
  'sword art online',
];

const SORT_OPTIONS = [
  { key: 'default', label: 'Default' },
  { key: 'rating', label: 'Top Rated' },
  { key: 'newest', label: 'Newest' },
] as const;

const TYPE_FILTERS = [
  { key: 'all', label: 'All', icon: Clapperboard },
  { key: 'movies', label: 'Movies', icon: Film },
  { key: 'series', label: 'Series', icon: Tv },
] as const;

const GENRE_TABS = [
  'All',
  'Action',
  'Adventure',
  'Fantasy',
  'Romance',
  'Sci-Fi',
  'Horror',
  'Sports',
  'Mecha',
];

const DISCORD_INVITE = 'https://discord.gg/runflix'; // replace with real link



/* ─── Main Page ──────────────────────────────────────────────── */
export default function Anime() {
  const seoSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Anime Movies & Series - Runflix Entertainment",
    "description": "Browse the best anime movies and series on RUNFlix. Discover trending, top-rated, and classic anime titles with HD downloads.",
    "url": "https://runflix.name.ng/anime"
  };

  useSEO({
    title: 'Anime Movies & Series — Stream & Download',
    description: 'Browse the best anime movies and series on RUNFlix. Discover trending, top-rated, and classic anime titles with HD downloads.',
    schema: seoSchema
  });

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [activeGenre, setActiveGenre] = useState('All');
  const [visibleCount, setVisibleCount] = useState<number>(18);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // Reset page limit on filter changes
  useEffect(() => {
    setVisibleCount(18);
  }, [typeFilter, sortBy, activeGenre]);

  /* ── Data fetching ── */
  const { data: trending, isLoading: tl } = useQuery({
    queryKey: ['trending'],
    queryFn: fetchTrending,
    staleTime: 10 * 60 * 1000,
  });

  const { data: hpData, isLoading: hl } = useQuery<any>({
    queryKey: ['homepage'],
    queryFn: fetchHomepage,
    staleTime: 10 * 60 * 1000,
  });

  const { data: animeSearch, isLoading: sl } = useQuery({
    queryKey: ['anime-search'],
    queryFn: async () => {
      const results = await Promise.all(
        ANIME_SEARCH_TERMS.map((term) => fetchSearch(term, 1).catch(() => ({ items: [] })))
      );
      return results.flatMap((r) => r.items || []);
    },
    staleTime: 15 * 60 * 1000,
  });

  /* ── Combine + deduplicate ── */
  const allAnime = useMemo(() => {
    const movies: any[] = [];
    const seen = new Set<string>();

    const addMovie = (m: any) => {
      if (m?.subjectId && !seen.has(m.subjectId)) {
        seen.add(m.subjectId);
        movies.push(m);
      }
    };

    if (hpData?.operatingList) {
      for (const section of hpData.operatingList) {
        if (section.subjects) section.subjects.forEach(addMovie);
      }
    }

    trending?.forEach(addMovie);

    animeSearch?.forEach((item: any) => {
      addMovie({
        ...item,
        cover: typeof item.cover === 'string' ? { url: item.cover } : item.cover,
        imdbRatingValue: item.rating || item.imdbRatingValue,
      });
    });

    return movies.filter((m: any) => {
      const genre = (m.genre || '').toLowerCase();
      const title = (m.title || m.name || '').toLowerCase();

      // Strictly require it to be animated/anime to prevent live-action Asian media leaking in
      return (
        ANIME_KEYWORDS.some((kw) => genre.includes(kw)) ||
        title.includes('anime')
      );
    });
  }, [trending, hpData, animeSearch]);

  /* ── Filter + sort ── */
  const filteredAnime = useMemo(() => {
    let filtered = [...allAnime];

    if (typeFilter === 'movies') filtered = filtered.filter((m) => m.subjectType === 1);
    if (typeFilter === 'series') filtered = filtered.filter((m) => m.subjectType === 2);

    if (activeGenre !== 'All') {
      filtered = filtered.filter((m) =>
        (m.genre || '').toLowerCase().includes(activeGenre.toLowerCase())
      );
    }

    if (sortBy === 'rating') filtered.sort((a, b) => (b.imdbRatingValue || 0) - (a.imdbRatingValue || 0));
    if (sortBy === 'newest') filtered.sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''));

    return filtered;
  }, [allAnime, typeFilter, sortBy, activeGenre]);

  /* ── Derived lists ── */
  const trendingAnime = useMemo(
    () => [...allAnime].sort((a, b) => (b.imdbRatingValue || 0) - (a.imdbRatingValue || 0)).slice(0, 15),
    [allAnime]
  );

  const newReleasesAnime = useMemo(
    () => [...allAnime].sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || '')).slice(0, 12),
    [allAnime]
  );

  const isLoading = tl || hl || sl;

  // Infinite Scroll: autoload more titles as you scroll near the bottom of the page
  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          setVisibleCount((prev) => {
            if (prev < filteredAnime.length) {
              return prev + 18;
            }
            return prev;
          });
        }
      },
      { threshold: 0.1, rootMargin: '150px' }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [filteredAnime.length]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">

      {/* ══════════════════════════════════════════
          ANIME HERO
      ══════════════════════════════════════════ */}
      <div className="relative py-14 md:py-24 px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 overflow-hidden">
        {/* Layered animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-[var(--rf-black)] to-pink-900/30" />
        <motion.div
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-pink-600/10 blur-[140px] rounded-full"
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full"
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        {/* Floating kanji / emoji decorations */}
        {['🎌', '⛩️', '🗾', '🌸', '⚔️', '🐉'].map((emoji, i) => (
          <motion.span
            key={i}
            className="absolute text-2xl select-none pointer-events-none opacity-10"
            style={{ left: `${10 + i * 15}%`, top: `${15 + (i % 2) * 50}%` }}
            animate={{ y: [-8, 8, -8], rotate: [-5, 5, -5] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
          >
            {emoji}
          </motion.span>
        ))}

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Title */}
          <div className="flex items-center gap-4 mb-5">
            <motion.div
              className="w-14 h-14 md:w-18 md:h-18 rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 flex items-center justify-center text-3xl shadow-2xl shadow-pink-500/30"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              🎌
            </motion.div>
            <div>
              <motion.h1
                className="text-4xl md:text-5xl lg:text-6xl font-black text-white"
                style={{
                  background: 'linear-gradient(135deg, #fff 30%, #f0abfc 60%, #c084fc 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Anime
              </motion.h1>
              <motion.p
                className="text-sm md:text-base text-[var(--rf-text-muted)] mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                Stream &amp; download the best anime — free, HD, always updated
              </motion.p>
            </div>
          </div>



          {/* Quick feature badges */}
          <motion.div
            className="flex flex-wrap gap-2 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            {['HD Downloads', 'Subtitles', 'No Ads', 'Fast Streams', 'Weekly Updates'].map((feat) => (
              <span key={feat} className="flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-pink-500/20 text-[11px] font-semibold text-pink-300">
                <Zap size={9} className="fill-pink-400 text-pink-400" />
                {feat}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          TOP RATED ROW
      ══════════════════════════════════════════ */}
      {trendingAnime.length > 0 && (
        <div className="-mt-4">
          <MovieRow
            title="⭐ Top Rated Anime"
            subtitle="Highest-rated anime titles across all genres"
          >
            {trendingAnime.map((movie: any, idx: number) => (
              <div key={`anime-top-${movie.subjectId}-${idx}`} className="snap-start">
                <MovieCard movie={movie} index={idx} size="md" />
              </div>
            ))}
          </MovieRow>
        </div>
      )}



      {/* ══════════════════════════════════════════
          NEW RELEASES ROW
      ══════════════════════════════════════════ */}
      {newReleasesAnime.length > 0 && (
        <div className="mb-4">
          <MovieRow
            title="🆕 New Releases"
            subtitle="Recently added anime titles"
          >
            {newReleasesAnime.map((movie: any, idx: number) => (
              <div key={`anime-new-${movie.subjectId}-${idx}`} className="snap-start">
                <MovieCard movie={movie} index={idx} size="md" />
              </div>
            ))}
          </MovieRow>
        </div>
      )}

      {/* ══════════════════════════════════════════
          GENRE TABS + TYPE FILTERS + FULL GRID
      ══════════════════════════════════════════ */}
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 py-6">

        {/* Genre Scroll Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
          {GENRE_TABS.map((genre) => (
            <button
              key={genre}
              onClick={() => setActiveGenre(genre)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border',
                activeGenre === genre
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-transparent shadow-lg shadow-pink-500/20'
                  : 'glass-2 text-[var(--rf-text-muted)] border-transparent hover:text-white hover:border-pink-500/20'
              )}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Type + Sort + Search controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Type pills */}
          <div className="flex items-center gap-1 p-0.5 glass-2 rounded-xl">
            {TYPE_FILTERS.map((tab) => {
              const isActive = typeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setTypeFilter(tab.key)}
                  className={cn(
                    'relative px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                    isActive ? 'text-white' : 'text-[var(--rf-text-muted)] hover:text-white'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="anime-type-pill"
                      className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <tab.icon size={12} /> {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <SlidersHorizontal size={13} className="text-[var(--rf-text-dim)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#0e0e14] px-3 py-2 rounded-lg text-xs text-white border-none outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key} className="bg-[#0e0e14] text-white">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <GridSkeleton count={12} />
        ) : filteredAnime.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${typeFilter}-${sortBy}-${activeGenre}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="anime-card grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4"
            >
              {filteredAnime.slice(0, visibleCount).map((movie: any, idx: number) => (
                <MovieCardGrid key={`anime-${movie.subjectId}-${idx}`} movie={movie} index={idx} />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24"
          >
            <div className="text-6xl mb-4">🎌</div>
            <h3 className="text-xl font-bold text-white mb-2">No anime found</h3>
            <p className="text-sm text-[var(--rf-text-dim)] mb-6">Try adjusting your filters.</p>
            <button
              onClick={() => { setTypeFilter('all'); setSortBy('default'); setActiveGenre('All'); }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Reset Filters
            </button>
          </motion.div>
        )}

        {/* Infinite scroll loader sentinel */}
        <div ref={loaderRef} className="h-10 flex items-center justify-center mt-6">
          {filteredAnime.length > visibleCount && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-6 h-6 border-2 border-[var(--rf-red)] border-t-transparent rounded-full"
            />
          )}
        </div>
      </div>


    </motion.div>
  );
}
