import { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTrending, fetchHomepage, fetchSearch } from '../api/client';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Film, Tv, Clapperboard, SlidersHorizontal, Star, Calendar } from 'lucide-react';
import { MovieCardGrid } from '../components/MovieCard';
import { GridSkeleton } from '../components/ui/Skeleton';
import { useSEO } from '../hooks/useSEO';
import { cn } from '../utils/cn';

/* Genre metadata for rich visuals */
const GENRE_META: Record<string, { emoji: string; gradient: string; description: string }> = {
  trending: { emoji: '🔥', gradient: 'from-orange-600/30 to-red-900/30', description: 'Currently trending movies and series' },
  popular: { emoji: '⭐', gradient: 'from-yellow-500/30 to-amber-700/30', description: 'Most watched entertainment right now' },
  'top-rated': { emoji: '🏆', gradient: 'from-amber-600/30 to-yellow-800/30', description: 'Highest-rated movies and TV shows' },
  action: { emoji: '💥', gradient: 'from-red-600/30 to-orange-900/30', description: 'Explosive fights and thrilling action' },
  adventure: { emoji: '🗺️', gradient: 'from-emerald-600/30 to-teal-800/30', description: 'Epic journeys and daring quests' },
  anime: { emoji: '🌸', gradient: 'from-pink-500/30 to-rose-800/30', description: 'Top anime movies and series' },
  animation: { emoji: '✨', gradient: 'from-violet-500/30 to-fuchsia-800/30', description: 'Animated adventures and family favorites' },
  comedy: { emoji: '😂', gradient: 'from-yellow-400/30 to-orange-600/30', description: 'Laugh-out-loud entertainment' },
  crime: { emoji: '🕵️', gradient: 'from-zinc-700/30 to-slate-900/30', description: 'Crime, gangs and investigations' },
  drama: { emoji: '🎭', gradient: 'from-indigo-600/30 to-purple-900/30', description: 'Emotional stories and powerful performances' },
  fantasy: { emoji: '🧙', gradient: 'from-purple-600/30 to-indigo-900/30', description: 'Magical realms and mythical legends' },
  family: { emoji: '👨‍👩‍👧‍👦', gradient: 'from-sky-500/30 to-blue-700/30', description: 'Family-friendly movies and shows' },
  horror: { emoji: '👻', gradient: 'from-gray-800/50 to-red-950/30', description: 'Terrifying horror and supernatural fear' },
  mystery: { emoji: '🔍', gradient: 'from-amber-700/30 to-stone-800/30', description: 'Mysteries and shocking twists' },
  romance: { emoji: '💕', gradient: 'from-pink-400/30 to-rose-700/30', description: 'Romantic stories and unforgettable love' },
  thriller: { emoji: '🔪', gradient: 'from-slate-700/30 to-red-800/30', description: 'Suspenseful thrillers and tension' },
  'sci-fi': { emoji: '🚀', gradient: 'from-cyan-600/30 to-blue-900/30', description: 'Future technology and space adventures' },
  superhero: { emoji: '🦸', gradient: 'from-blue-600/30 to-indigo-900/30', description: 'Heroes, powers and epic battles' },
  war: { emoji: '⚔️', gradient: 'from-stone-700/30 to-green-900/30', description: 'Military stories and war epics' },
  'k-drama': { emoji: '🇰🇷', gradient: 'from-rose-500/30 to-pink-900/30', description: 'Popular Korean drama series' },
  'c-drama': { emoji: '🇨🇳', gradient: 'from-red-600/30 to-red-950/30', description: 'Chinese dramas and fantasy stories' },
  'j-drama': { emoji: '🇯🇵', gradient: 'from-red-500/30 to-rose-900/30', description: 'Japanese drama and live-action hits' },
  turkish: { emoji: '🇹🇷', gradient: 'from-red-600/30 to-red-900/30', description: 'Turkish romance and drama series' },
  nollywood: { emoji: '🎬', gradient: 'from-green-600/30 to-emerald-950/30', description: 'Trending African and Nollywood movies' },
  yoruba: { emoji: '🪘', gradient: 'from-amber-700/30 to-orange-950/30', description: 'Yoruba epics and indigenous stories' },
  bollywood: { emoji: '💃', gradient: 'from-orange-500/30 to-red-700/30', description: 'Bollywood blockbusters and Indian cinema' },
  documentary: { emoji: '🎥', gradient: 'from-stone-600/30 to-neutral-800/30', description: 'True stories and documentaries' }
};

const SORT_OPTIONS = [
  { key: 'default', label: 'Default' },
  { key: 'rating', label: 'Top Rated' },
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
] as const;

const TYPE_FILTERS = [
  { key: 'all', label: 'All', icon: Clapperboard },
  { key: 'movies', label: 'Movies', icon: Film },
  { key: 'series', label: 'Series', icon: Tv },
] as const;

export default function GenrePage() {
  const { name } = useParams<{ name: string }>();
  const genreSlug = (name || '').toLowerCase();
  const genreTitle = genreSlug.charAt(0).toUpperCase() + genreSlug.slice(1);
  const meta = GENRE_META[genreSlug] || { emoji: '🎬', gradient: 'from-[var(--rf-red)]/20 to-transparent', description: `Browse ${genreTitle} movies and shows` };

  const seoSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${genreTitle} Movies & TV Shows - Runflix Entertainment`,
    "description": meta.description,
    "url": window.location.href
  };

  useSEO({
    title: `${genreTitle} Movies & Shows`,
    description: meta.description,
    schema: seoSchema
  });

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [visibleCount, setVisibleCount] = useState<number>(18);

  // Reset page limit on genre/filter change
  useEffect(() => {
    setVisibleCount(18);
  }, [typeFilter, sortBy, genreSlug]);

  const { data: trending, isLoading: tl } = useQuery({ queryKey: ['trending'], queryFn: fetchTrending, staleTime: 10 * 60 * 1000 });
  const { data: hpData, isLoading: hl } = useQuery<any>({ queryKey: ['homepage'], queryFn: fetchHomepage, staleTime: 10 * 60 * 1000 });

  // Search query mapping for robust API search
  const searchQuery = useMemo(() => {
    if (!genreSlug) return '';
    // Bypass search for special non-genre categories
    if (genreSlug === 'trending' || genreSlug === 'popular' || genreSlug === 'top-rated') return '';
    
    // Map slugs to clean search queries that the API understands
    if (genreSlug === 'c-drama') return 'chinese';
    if (genreSlug === 'j-drama') return 'japanese';
    if (genreSlug === 'k-drama') return 'korean';
    if (genreSlug === 'turkish') return 'turkish';
    if (genreSlug === 'nollywood') return 'nigerian';
    if (genreSlug === 'yoruba') return 'yoruba';
    if (genreSlug === 'bollywood') return 'indian';
    if (genreSlug === 'superhero') return 'superhero';
    if (genreSlug === 'sci-fi') return 'science fiction';
    return genreSlug;
  }, [genreSlug]);

  // Search for genre content to supplement local data
  const { data: searchData } = useQuery({
    queryKey: ['genre-search', searchQuery],
    queryFn: () => fetchSearch(searchQuery, 1),
    staleTime: 10 * 60 * 1000,
    enabled: !!searchQuery,
  });

  const allMovies = useMemo(() => {
    const movies: any[] = [];
    const seen = new Set<string>();
    const add = (m: any, isGenreSearch = false) => {
      if (m?.subjectId && !seen.has(m.subjectId)) {
        seen.add(m.subjectId);
        movies.push({
          ...m,
          imdbRatingValue: Number(m.imdbRatingValue || m.rating || 0),
          isGenreSearch
        });
      }
    };
    if (hpData?.operatingList) {
      for (const section of hpData.operatingList) {
        if (section.subjects) section.subjects.forEach((x: any) => add(x, false));
      }
    }
    if (trending) trending.forEach((x: any) => add(x, false));
    if (searchData?.items) searchData.items.forEach((x: any) => add(x, true));
    return movies;
  }, [hpData, trending, searchData]);

  const genreMovies = useMemo(() => {
    let filtered = allMovies;

    const specialSlugs = ['trending', 'popular', 'top-rated'];
    if (!specialSlugs.includes(genreSlug)) {
      filtered = filtered.filter((m: any) => {
        // If it came from the custom genre query search, it is guaranteed to be a match!
        if (m.isGenreSearch) return true;

        const genres = (m.genre || m.genres || m.tags || '').toLowerCase();
        const title = (m.title || m.name || '').toLowerCase();
        const desc = (m.description || m.introduction || '').toLowerCase();
        
        // Exact and fuzzy matching for complex genres/languages
        if (genreSlug === 'c-drama') {
          return genres.includes('c-drama') || genres.includes('chinese') || title.includes('chinese') || desc.includes('chinese');
        }
        if (genreSlug === 'j-drama') {
          return genres.includes('j-drama') || genres.includes('japanese') || title.includes('japanese') || desc.includes('japanese');
        }
        if (genreSlug === 'k-drama') {
          return genres.includes('k-drama') || genres.includes('korean') || title.includes('korean') || desc.includes('korean');
        }
        if (genreSlug === 'turkish') {
          return genres.includes('turkish') || genres.includes('turkey') || title.includes('turkish') || desc.includes('turkish');
        }
        if (genreSlug === 'nollywood') {
          return genres.includes('nollywood') || genres.includes('nigerian') || genres.includes('nigeria') || title.includes('nigerian');
        }
        if (genreSlug === 'yoruba') {
          return genres.includes('yoruba') || title.includes('yoruba');
        }
        if (genreSlug === 'bollywood') {
          return genres.includes('bollywood') || genres.includes('indian') || genres.includes('india') || title.includes('bollywood') || title.includes('indian');
        }
        if (genreSlug === 'superhero') {
          return genres.includes('superhero') || genres.includes('marvel') || genres.includes('dc comics') || title.includes('superhero') || title.includes('marvel') || title.includes('avengers');
        }
        if (genreSlug === 'anime') {
          return genres.includes('anime') || genres.includes('animation') || genres.includes('japanese') || (m.subjectType === 2 && (genres.includes('japan') || title.includes('anime')));
        }
        
        // Default standard match
        return genres.includes(genreSlug) || genres.includes(genreSlug.replace('-', ' '));
      });
    } else {
      // For 'top-rated', 'popular', 'trending'
      if (genreSlug === 'trending') {
        const trendingIds = new Set(trending?.map((t: any) => t.subjectId) || []);
        filtered = filtered.filter(m => trendingIds.has(m.subjectId));
      } else if (genreSlug === 'top-rated') {
        filtered = filtered.filter(m => (m.imdbRatingValue || 0) >= 7.5);
      } else if (genreSlug === 'popular') {
        filtered = filtered.filter(m => (m.imdbRatingValue || 0) >= 7.0);
      }
    }

    // Type filter
    if (typeFilter === 'movies') filtered = filtered.filter((m) => m.subjectType === 1);
    if (typeFilter === 'series') filtered = filtered.filter((m) => m.subjectType === 2);

    // Sort
    if (sortBy === 'rating' || genreSlug === 'top-rated') {
      filtered = [...filtered].sort((a, b) => (b.imdbRatingValue || 0) - (a.imdbRatingValue || 0));
    } else if (sortBy === 'newest') {
      filtered = [...filtered].sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''));
    } else if (sortBy === 'oldest') {
      filtered = [...filtered].sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''));
    } else {
      // Default sort for special collection lists
      if (genreSlug === 'popular') {
        filtered = [...filtered].sort((a, b) => (b.imdbRatingValue || 0) - (a.imdbRatingValue || 0));
      }
    }

    return filtered;
  }, [allMovies, genreSlug, typeFilter, sortBy, trending]);

  const isLoading = tl || hl;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      {/* ============ GENRE HERO ============ */}
      <div className={cn('relative py-12 md:py-16 px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 bg-gradient-to-br', meta.gradient)}>
        <div className="absolute inset-0 bg-[var(--rf-black)]/60" />
        <div className="relative z-10 max-w-[1600px] mx-auto">
          <Link to="/genre" className="inline-flex items-center gap-1.5 text-xs text-[var(--rf-text-dim)] hover:text-white mb-4 transition-colors">
            <ChevronLeft size={14} /> Back to Genres
          </Link>
          <div className="flex items-center gap-3 md:gap-4 mb-3">
            <span className="text-4xl md:text-5xl">{meta.emoji}</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white">{genreTitle}</h1>
              <p className="text-sm text-[var(--rf-text-dim)] mt-1">{meta.description}</p>
            </div>
          </div>
          <p className="text-sm text-[var(--rf-text-muted)]">{genreMovies.length} titles available</p>
        </div>
      </div>

      {/* ============ FILTERS ============ */}
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 py-6">
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
                    <motion.div layoutId="genre-type" className="absolute inset-0 bg-[var(--rf-red)] rounded-lg" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <tab.icon size={12} /> {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 ml-auto">
            <SlidersHorizontal size={13} className="text-[var(--rf-text-dim)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#0e0e14] px-3 py-2 rounded-lg text-xs text-white border-none outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key} className="bg-[#0e0e14] text-white">{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ============ GRID ============ */}
        {isLoading ? (
          <GridSkeleton count={12} />
        ) : genreMovies.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${typeFilter}-${sortBy}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4"
            >
              {genreMovies.slice(0, visibleCount).map((movie: any, idx: number) => (
                <MovieCardGrid key={`${movie.subjectId}-${idx}`} movie={movie} index={idx} />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">{meta.emoji}</div>
            <h3 className="text-lg font-bold text-white mb-2">No {genreTitle} titles found</h3>
            <p className="text-sm text-[var(--rf-text-dim)] mb-6">Try a different genre or check back later.</p>
            <Link to="/explore" className="btn-primary px-6 py-3 text-sm inline-flex">
              Browse All
            </Link>
          </div>
        )}

        {/* See More Button */}
        {genreMovies.length > visibleCount && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + 18)}
              className="btn-glass px-8 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 hover:bg-white/10 active:scale-95 text-white border border-white/[0.08]"
            >
              See More Titles
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ============ EXPORT: All genres for linking ============ */
export const GENRE_LIST = Object.keys(GENRE_META);
