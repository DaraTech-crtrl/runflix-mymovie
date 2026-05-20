import { useQuery } from '@tanstack/react-query';
import { fetchHomepage, fetchTrending } from '../api/client';
import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Film, Tv, Clapperboard, Sparkles, SlidersHorizontal, Star, Calendar, Globe, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MovieCardGrid } from '../components/MovieCard';
import { GridSkeleton } from '../components/ui/Skeleton';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { cn } from '../utils/cn';
import { useSEO } from '../hooks/useSEO';

const FILTER_TABS = [
  { key: 'all', label: 'All', icon: Clapperboard },
  { key: 'movies', label: 'Movies', icon: Film },
  { key: 'series', label: 'TV Series', icon: Tv },
] as const;

const SORT_OPTIONS = [
  { key: 'default', label: 'Default' },
  { key: 'rating-high', label: 'Rating ↓' },
  { key: 'rating-low', label: 'Rating ↑' },
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'a-z', label: 'A → Z' },
  { key: 'z-a', label: 'Z → A' },
] as const;


export default function Explore() {
  const seoSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Explore Movies & TV Series - Runflix Entertainment",
    "description": "Browse and filter the best movies and TV series by genre, rating, year, and popularity on RUNFlix. Download in HD with subtitles.",
    "url": "https://runflix.name.ng/explore"
  };

  useSEO({ 
    title: 'Explore Movies & TV Series', 
    description: 'Browse and filter the best movies and TV series by genre, rating, year, and popularity on RUNFlix. Download in HD with subtitles.',
    schema: seoSchema
  });

  const { data: hpData, isLoading: hpLoading } = useQuery<any>({
    queryKey: ['homepage'],
    queryFn: fetchHomepage,
    staleTime: 10 * 60 * 1000,
  });

  const { data: trending, isLoading: trendLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: fetchTrending,
    staleTime: 10 * 60 * 1000,
  });

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [yearRange, setYearRange] = useState<string>('');
  const [minRating, setMinRating] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(18);

  // Reset page limit on filter changes
  useEffect(() => {
    setVisibleCount(18);
  }, [activeFilter, sortBy, selectedGenre, yearRange, minRating]);

  // Extract categories
  const categories = useMemo(() => {
    if (!hpData?.operatingList) return [];
    const filterSection = hpData.operatingList.find((op: any) => op.type === 'FILTER');
    return filterSection?.filters || [];
  }, [hpData]);

  // Deduplicated movie list
  const allMovies = useMemo(() => {
    const movies: any[] = [];
    const seen = new Set<string>();

    const add = (m: any) => {
      if (m.subjectId && !seen.has(m.subjectId)) {
        seen.add(m.subjectId);
        movies.push({
          ...m,
          imdbRatingValue: Number(m.imdbRatingValue || m.rating || 0)
        });
      }
    };

    if (hpData?.operatingList) {
      for (const section of hpData.operatingList) {
        if (section.subjects) {
          for (const m of section.subjects) {
            add(m);
          }
        }
      }
    }

    if (trending) {
      for (const m of trending) {
        add(m);
      }
    }

    return movies;
  }, [hpData, trending]);

  // Extract available years and genres for filter dropdowns
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allMovies.forEach((m) => {
      if (m.releaseDate) years.add(m.releaseDate.substring(0, 4));
    });
    return [...years].sort().reverse();
  }, [allMovies]);

  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    allMovies.forEach((m) => {
      if (m.genre) {
        m.genre.split(',').forEach((g: string) => {
          const trimmed = g.trim();
          if (trimmed) genres.add(trimmed);
        });
      }
    });
    return [...genres].sort();
  }, [allMovies]);

  // Apply all filters
  const filteredMovies = useMemo(() => {
    let result = [...allMovies];

    // Type filter
    if (activeFilter === 'movies') result = result.filter((m) => m.subjectType === 1);
    if (activeFilter === 'series') result = result.filter((m) => m.subjectType === 2);

    // Genre filter
    if (selectedGenre) {
      result = result.filter((m) => (m.genre || '').toLowerCase().includes(selectedGenre.toLowerCase()));
    }

    // Year filter
    if (yearRange) {
      result = result.filter((m) => (m.releaseDate || '').startsWith(yearRange));
    }

    // Rating filter
    if (minRating) {
      const min = parseFloat(minRating);
      result = result.filter((m) => (m.imdbRatingValue || 0) >= min);
    }

    // Sort
    switch (sortBy) {
      case 'rating-high': result.sort((a, b) => (b.imdbRatingValue || 0) - (a.imdbRatingValue || 0)); break;
      case 'rating-low': result.sort((a, b) => (a.imdbRatingValue || 0) - (b.imdbRatingValue || 0)); break;
      case 'newest': result.sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || '')); break;
      case 'oldest': result.sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || '')); break;
      case 'a-z': result.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
      case 'z-a': result.sort((a, b) => (b.title || '').localeCompare(a.title || '')); break;
    }

    return result;
  }, [allMovies, activeFilter, selectedGenre, yearRange, minRating, sortBy]);

  const hasActiveFilters = selectedGenre || yearRange || minRating;

  const clearFilters = () => {
    setSelectedGenre('');
    setYearRange('');
    setMinRating('');
    setSortBy('default');
  };

  const isLoading = hpLoading || trendLoading;

  if (isLoading) {
    return (
      <div className="px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 max-w-[1600px] mx-auto w-full py-4 md:py-8">
        <div className="space-y-3 mb-8">
          <div className="skeleton h-8 w-40 rounded-lg" />
          <div className="skeleton h-4 w-64 rounded-lg" />
        </div>
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-10 w-24 rounded-full" />)}
        </div>
        <GridSkeleton count={12} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 max-w-[1600px] mx-auto w-full py-4 md:py-8"
    >
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2">
          <Sparkles size={24} className="text-[var(--rf-red)]" />
          Explore
        </h1>
        <p className="text-sm text-[var(--rf-text-dim)]">
          Discover movies and TV shows from around the world
        </p>
      </div>


      {/* ============ API CATEGORIES ============ */}
      {categories.length > 0 && (
        <section className="mb-8">
          <h3 className="text-xs font-bold text-[var(--rf-text-muted)] uppercase tracking-wider mb-3">
            Featured Categories
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {categories.map((cat: any) => (
              <div
                key={cat.title}
                className="relative h-24 md:h-28 rounded-2xl overflow-hidden movie-card cursor-pointer group"
              >
                {cat.image?.url && (
                  <OptimizedImage
                    src={cat.image.url}
                    alt={cat.title}
                    className="w-full h-full opacity-50 group-hover:opacity-70 transition-all duration-500 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3.5 z-[2]">
                  <span className="text-white font-bold text-sm tracking-tight">{cat.title}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============ FILTER BAR ============ */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* Type tabs */}
        <div className="flex items-center gap-1 p-0.5 glass-2 rounded-xl">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0',
                  isActive ? 'text-white' : 'text-[var(--rf-text-muted)] hover:text-white'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="explore-filter"
                    className="absolute inset-0 bg-[var(--rf-red)] rounded-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <tab.icon size={13} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Advanced filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
            showFilters || hasActiveFilters
              ? 'bg-[var(--rf-red)]/10 text-[var(--rf-red)] border border-[var(--rf-red)]/20'
              : 'glass-2 text-[var(--rf-text-muted)] hover:text-white'
          )}
        >
          <SlidersHorizontal size={13} />
          Filters
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-[var(--rf-red)] text-white text-[9px] flex items-center justify-center font-bold">!</span>
          )}
        </button>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-[#0e0e14] px-3 py-2 rounded-lg text-xs text-white border-none outline-none cursor-pointer ml-auto"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key} className="bg-[#0e0e14] text-white">{o.label}</option>
          ))}
        </select>

        <span className="text-xs text-[var(--rf-text-dim)] shrink-0">
          {filteredMovies.length} titles
        </span>
      </div>

      {/* ============ ADVANCED FILTERS PANEL ============ */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-5"
          >
            <div className="glass-2 rounded-xl p-4 flex flex-wrap items-end gap-4">
              {/* Genre */}
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] font-bold text-[var(--rf-text-dim)] uppercase tracking-wider mb-1.5">
                  <Globe size={10} className="inline mr-1" />Genre
                </label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full bg-[#0e0e14] px-3 py-2 rounded-lg text-xs text-white border border-[var(--rf-border)] outline-none"
                >
                  <option value="" className="bg-[#0e0e14] text-white">All Genres</option>
                  {availableGenres.map((g) => (
                    <option key={g} value={g} className="bg-[#0e0e14] text-white">{g}</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] font-bold text-[var(--rf-text-dim)] uppercase tracking-wider mb-1.5">
                  <Calendar size={10} className="inline mr-1" />Year
                </label>
                <select
                  value={yearRange}
                  onChange={(e) => setYearRange(e.target.value)}
                  className="w-full bg-[#0e0e14] px-3 py-2 rounded-lg text-xs text-white border border-[var(--rf-border)] outline-none"
                >
                  <option value="" className="bg-[#0e0e14] text-white">All Years</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y} className="bg-[#0e0e14] text-white">{y}</option>
                  ))}
                </select>
              </div>

              {/* Min Rating */}
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] font-bold text-[var(--rf-text-dim)] uppercase tracking-wider mb-1.5">
                  <Star size={10} className="inline mr-1" />Min Rating
                </label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="w-full bg-[#0e0e14] px-3 py-2 rounded-lg text-xs text-white border border-[var(--rf-border)] outline-none"
                >
                  <option value="" className="bg-[#0e0e14] text-white">Any Rating</option>
                  {['9', '8', '7', '6', '5', '4'].map((r) => (
                    <option key={r} value={r} className="bg-[#0e0e14] text-white">{r}+ stars</option>
                  ))}
                </select>
              </div>

              {/* Clear */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--rf-red)] hover:bg-[var(--rf-red)]/10 transition-colors"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ MOVIES GRID ============ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeFilter}-${sortBy}-${selectedGenre}-${yearRange}-${minRating}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4"
        >
          {filteredMovies.slice(0, visibleCount).map((movie: any, idx: number) => (
            <MovieCardGrid
              key={`${movie.subjectId}-${idx}`}
              movie={movie}
              index={idx}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* See More Button */}
      {filteredMovies.length > visibleCount && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + 18)}
            className="btn-glass px-8 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 hover:bg-white/10 active:scale-95 text-white border border-white/[0.08]"
          >
            See More Titles
          </button>
        </div>
      )}

      {/* ============ EMPTY STATE ============ */}
      {filteredMovies.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl glass-2 flex items-center justify-center mx-auto mb-4 text-[var(--rf-text-dim)]">
            <Film size={28} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Content Found</h3>
          <p className="text-sm text-[var(--rf-text-dim)] mb-4">
            No titles match your filters. Try adjusting them.
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn-primary px-6 py-3 text-sm inline-flex">
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
