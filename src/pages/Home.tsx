import { useQuery } from '@tanstack/react-query';
import { fetchTrending, fetchHomepage } from '../api/client';
import { Download, Star, Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MovieCard } from '../components/MovieCard';
import { MovieRow } from '../components/MovieRow';
import { HeroSkeleton, MovieRowSkeleton } from '../components/ui/Skeleton';
import { buildMoviePath } from '../utils/slug';
import { formatRating } from '../utils/format';
import { useRecentlyViewedStore } from '../stores/useRecentlyViewedStore';
import { useWatchlistStore } from '../stores/useWatchlistStore';
import { useSEO } from '../hooks/useSEO';
import { getOptimizedImageUrl } from '../utils/image';
import ContinuePlayDialog from '../components/ContinuePlayDialog';

export default function Home() {
  const navigate = useNavigate();

  const seoSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Trending Movies & TV Series on Runflix Entertainment",
    "description": "Download high-quality movies, TV series, anime, and kdrama with subtitles for free. Instant premium streaming and downloads.",
    "url": "https://runflix.name.ng/"
  };

  useSEO({
    title: 'Home',
    description: 'Download high-quality movies, TV series, anime, and kdrama with subtitles for free. Instant premium streaming and downloads.',
    schema: seoSchema
  });

  const { data: trending, isLoading: trendingLoading, error: trendingError } = useQuery({
    queryKey: ['trending'],
    queryFn: fetchTrending,
    staleTime: 10 * 60 * 1000,
  });

  const { data: hpData, isLoading: hpLoading, error: hpError } = useQuery<any>({
    queryKey: ['homepage'],
    queryFn: fetchHomepage,
    staleTime: 10 * 60 * 1000,
  });

  const isLoading = trendingLoading || hpLoading;

  // Extract banner items
  const bannerItems = useMemo(() => {
    if (!hpData?.operatingList) return [];
    const bannerSection = hpData.operatingList.find((op: any) => op.type === 'BANNER');
    return bannerSection?.banner?.items || [];
  }, [hpData]);

  // Extract movie rows and split the popular row out
  const { popularRow, otherMovieRows } = useMemo(() => {
    if (!hpData?.operatingList) return { popularRow: null, otherMovieRows: [] };
    const rows = hpData.operatingList.filter(
      (op: any) => op.type === 'SUBJECTS_MOVIE' && op.subjects?.length > 0
    );
    const pop = rows.find((r: any) => r.title?.toLowerCase().includes('popular'));
    const others = rows.filter((r: any) => r !== pop);
    return { popularRow: pop, otherMovieRows: others };
  }, [hpData]);

  // Hero banner rotation
  const [heroIndex, setHeroIndex] = useState(0);
  const heroItems = bannerItems.length > 0 ? bannerItems : trending?.slice(0, 6) || [];
  const heroItem = heroItems[heroIndex];
  const autoRotateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoRotate = useCallback(() => {
    if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    autoRotateRef.current = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % Math.max(heroItems.length, 1));
    }, 7000);
  }, [heroItems.length]);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    startAutoRotate();
    return () => { if (autoRotateRef.current) clearInterval(autoRotateRef.current); };
  }, [heroItems.length, startAutoRotate]);

  const goToHero = useCallback((index: number) => {
    setHeroIndex(index);
    startAutoRotate();
  }, [startAutoRotate]);

  // Touch Swipe Gesture Helpers
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToHero((heroIndex + 1) % heroItems.length);
    } else if (isRightSwipe) {
      goToHero((heroIndex - 1 + heroItems.length) % heroItems.length);
    }
  };

  // Error state
  if (trendingError || hpError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl glass-2 flex items-center justify-center mx-auto mb-6">
            <div className="w-10 h-10 rounded-full bg-[var(--rf-red)]/20 flex items-center justify-center text-[var(--rf-red)]">
              <Info size={24} />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
          <p className="text-[var(--rf-text-muted)] mb-6 text-sm">
            {String((trendingError || hpError)?.message || 'Unable to load content. Please check your connection.')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-8 py-3.5 text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="-mt-[72px]">
        <HeroSkeleton />
        <div className="space-y-4 mt-4">
          <MovieRowSkeleton />
          <MovieRowSkeleton />
          <MovieRowSkeleton />
        </div>
      </div>
    );
  }

  // Resolve hero data
  const getHeroData = () => {
    if (!heroItem) return null;
    const subject = heroItem.subject || heroItem;
    return {
      id: subject.subjectId,
      title: subject.title || heroItem.title,
      description: subject.description,
      coverUrl: heroItem.image?.url || subject.stills?.url || subject.cover?.url,
      subjectType: subject.subjectType,
      rating: subject.imdbRatingValue,
      genre: subject.genre,
    };
  };

  const hero = getHeroData();

  return (
    <div className="flex-1 min-h-screen -mt-[calc(56px+var(--safe-top))] md:-mt-[calc(72px+var(--safe-top))]">
      {/* Hidden SEO Text for crawlers (improves text-HTML ratio and provides H1) */}
      <div className="sr-only">
        <h1>Runflix Entertainment - Free Movies, TV Series, and Anime Streaming</h1>
        <p>
          Welcome to Runflix Entertainment, your ultimate destination for discovering and downloading the best entertainment.
          Browse our massive collection of trending movies, highly-rated TV series, popular anime, and classic Korean dramas.
          We provide high-quality HD downloads, multi-language subtitle support, and lightning-fast streaming links.
          Whether you're looking for action, romance, thriller, or comedy, Runflix Entertainment has it all. Start exploring today!
        </p>
      </div>
      {/* ============ CINEMATIC HERO BANNER ============ */}
      {hero && (
        <section
          className="relative w-full h-[75vh] md:h-[90vh] lg:h-[95vh] overflow-hidden select-none touch-pan-y"
          aria-label="Featured content"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Background Image with Crossfade */}
          <AnimatePresence mode="sync">
            <motion.div
              key={`hero-bg-${heroIndex}`}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0"
            >
              <img
                src={getOptimizedImageUrl(hero.coverUrl, 1200)}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                aria-hidden="true"
              />
            </motion.div>
          </AnimatePresence>

          {/* Multi-layer Gradients */}
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 gradient-hero-side hidden md:block" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--rf-black)]/80 via-transparent to-transparent md:block hidden" />

          {/* Cinematic Vignette */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, var(--rf-black) 100%)' }} />

          {/* Hero Content */}
          <div className="relative z-10 flex flex-col justify-end h-full px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 pb-14 md:pb-20 max-w-4xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={`hero-content-${heroIndex}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Meta Badges */}
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="badge glass text-[10px] py-1 px-3 backdrop-blur-xl">
                    {hero.subjectType === 2 ? '📺 TV Series' : '🎬 Movie'}
                  </span>
                  {hero.rating && (
                    <span className="badge badge-rating py-1 px-3 text-[11px]">
                      <Star size={10} className="fill-[var(--rf-gold)]" />
                      {formatRating(hero.rating)} IMDb
                    </span>
                  )}
                  {hero.genre && (
                    <span className="hidden md:inline text-xs text-[var(--rf-text-muted)]">
                      {hero.genre.split(',').slice(0, 3).join(' • ')}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3 leading-[1.1] tracking-tight max-w-2xl">
                  {hero.title}
                </h1>

                {/* Description */}
                <p className="text-sm md:text-base text-[var(--rf-text-muted)] line-clamp-2 md:line-clamp-3 mb-6 max-w-xl leading-relaxed">
                  {hero.description || 'Discover this incredible title. Download now to experience it in stunning quality.'}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={buildMoviePath(hero.title, hero.id)}
                    className="btn-primary text-sm px-7 py-3.5"
                  >
                    <Download size={18} />
                    <span>Download Now</span>
                  </Link>
                  <Link
                    to={buildMoviePath(hero.title, hero.id)}
                    className="btn-glass text-sm px-7 py-3.5"
                  >
                    <Info size={18} />
                    <span>More Info</span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Hero Navigation Dots */}
            {heroItems.length > 1 && (
              <div className="flex items-center gap-2 mt-8">
                {heroItems.slice(0, 8).map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => goToHero(i)}
                    className={`h-1 rounded-full transition-all duration-500 ${i === heroIndex
                        ? 'bg-[var(--rf-red)] w-8 glow-red'
                        : 'bg-white/15 w-3 hover:bg-white/30'
                      }`}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === heroIndex}
                  />
                ))}
                <span className="text-[10px] text-[var(--rf-text-dim)] ml-3 font-medium">
                  {heroIndex + 1}/{Math.min(heroItems.length, 8)}
                </span>
              </div>
            )}
          </div>

          {/* Hero Arrow Navigation */}
          {heroItems.length > 1 && (
            <>
              <button
                onClick={() => goToHero((heroIndex - 1 + heroItems.length) % heroItems.length)}
                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full glass-2 items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label="Previous slide"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => goToHero((heroIndex + 1) % heroItems.length)}
                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full glass-2 items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label="Next slide"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </section>
      )}

      {/* ============ CONTENT SECTIONS ============ */}
      <div className="relative z-10 space-y-2 pt-6 md:pt-10">
        {/* Continue Watching (Recently Viewed) */}
        <ContinueWatching />

        {/* My Watchlist Preview */}
        <WatchlistPreview />

        {/* Trending Now */}
        {trending && trending.length > 0 && (
          <MovieRow title="🔥 Trending Now" subtitle="Most popular this week" onViewAll={() => navigate('/trending')}>
            {trending.map((movie: any, idx: number) => (
              <div key={`${movie.subjectId}-trend-${idx}`} className="snap-start">
                <MovieCard movie={movie} index={idx} size="md" />
              </div>
            ))}
          </MovieRow>
        )}

        {/* Popular Movies Row */}
        {popularRow && (
          <MovieRow key={popularRow.opId || 'popular'} title={popularRow.title}>
            {popularRow.subjects.map((movie: any, idx: number) => (
              <div key={`${movie.subjectId}-${popularRow.opId}-${idx}`} className="snap-start">
                <MovieCard movie={movie} index={idx} size="md" />
              </div>
            ))}
          </MovieRow>
        )}

        {/* Smart Recommendations */}
        <SmartRecommendations allMovies={trending || []} />

        {/* Homepage Sections */}
        {otherMovieRows.map((row: any, rowIdx: number) => (
          <MovieRow key={row.opId || rowIdx} title={row.title}>
            {row.subjects.map((movie: any, idx: number) => (
              <div key={`${movie.subjectId}-${row.opId}-${idx}`} className="snap-start">
                <MovieCard movie={movie} index={idx} size="md" />
              </div>
            ))}
          </MovieRow>
        ))}

        {/* BREATHTAKING WHATSAPP CAMPAIGN BANNER CARD */}
        <section className="px-6 sm:px-10 lg:px-14 py-4 select-none">
          <div className="relative rounded-3xl bg-gradient-to-r from-emerald-950/20 via-[#121218] to-emerald-950/20 border border-emerald-500/10 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center justify-between overflow-hidden shadow-xl">
            {/* Ambient glows inside card */}
            <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-emerald-500/5 blur-[50px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-green-500/5 blur-[50px] pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
              {/* Vibrant green WhatsApp bubble */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 text-white flex items-center justify-center shadow-lg shadow-emerald-950/30 shrink-0">
                <span className="text-xl font-bold">🍿</span>
              </div>
              <div>
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-[8px] uppercase tracking-wider mb-1.5">
                  EXCLUSIVE RECOMMENDATIONS
                </span>
                <h3 className="text-md md:text-lg font-black tracking-wide text-white uppercase">Join the Runflix Entertainment Picks Channel!</h3>
                <p className="text-xs text-white/50 leading-relaxed mt-0.5 max-w-xl">
                  Get premium handpicked movie suggestions, daily trending series cards, and high-speed direct download links delivered natively on WhatsApp!
                </p>
              </div>
            </div>

            <a
              href="https://whatsapp.com/channel/0029Vb8esUv3GJP6ymXaNF3g"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-95 transition-all text-xs font-black uppercase tracking-wider text-white shadow-lg shrink-0 flex items-center gap-1.5"
            >
              🚀 Join Channel
            </a>
          </div>
        </section>

        {/* Top Rated Section */}
        {trending && trending.length > 5 && (
          <MovieRow title="⭐ Top Rated" subtitle="Highest rated content" onViewAll={() => navigate('/collections')}>
            {[...trending]
              .sort((a: any, b: any) => (b.imdbRatingValue || 0) - (a.imdbRatingValue || 0))
              .slice(0, 15)
              .map((movie: any, idx: number) => (
                <div key={`${movie.subjectId}-top-${idx}`} className="snap-start">
                  <MovieCard movie={movie} index={idx} size="md" />
                </div>
              ))}
          </MovieRow>
        )}

        {/* Mood Selector */}
        <MoodSelector allMovies={trending || []} />

        {/* Hidden Gems */}
        <HiddenGems allMovies={trending || []} />
      </div>
    </div>
  );
}

/* ============ CONTINUE WATCHING ============ */
function ContinueWatching() {
  const items = useRecentlyViewedStore((s) => s.items);
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null);

  if (items.length === 0) return null;

  // Convert recently viewed items to movie-card-compatible objects
  const movies = items.slice(0, 15).map((item) => ({
    subjectId: item.subjectId,
    title: item.title,
    cover: item.coverUrl ? { url: item.coverUrl } : undefined,
    subjectType: item.subjectType,
    imdbRatingValue: item.imdbRatingValue,
    releaseDate: item.releaseDate,
  }));

  return (
    <>
      <MovieRow title="📺 Continue Watching" subtitle="Pick up where you left off">
        {movies.map((movie: any, idx: number) => (
          <div key={`recent-${movie.subjectId}-${idx}`} className="snap-start">
            <MovieCard
              movie={movie}
              index={idx}
              size="md"
              onClick={(e) => {
                e.preventDefault();
                setSelectedMovie(movie);
              }}
            />
          </div>
        ))}
      </MovieRow>

      {selectedMovie && (
        <ContinuePlayDialog
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </>
  );
}

/* ============ WATCHLIST PREVIEW ============ */
function WatchlistPreview() {
  const items = useWatchlistStore((s) => s.items);

  if (items.length === 0) return null;

  const movies = items.slice(0, 15).map((item) => ({
    subjectId: item.subjectId,
    title: item.title,
    cover: item.coverUrl ? { url: item.coverUrl } : undefined,
    subjectType: item.subjectType,
    imdbRatingValue: item.imdbRatingValue,
    releaseDate: item.releaseDate,
  }));

  return (
    <MovieRow title="❤️ My Watchlist" subtitle="Your saved titles">
      {movies.map((movie: any, idx: number) => (
        <div key={`wl-${movie.subjectId}-${idx}`} className="snap-start">
          <MovieCard movie={movie} index={idx} size="md" />
        </div>
      ))}
    </MovieRow>
  );
}

/* ============ SMART RECOMMENDATIONS (AI Pick) ============ */
function SmartRecommendations({ allMovies }: { allMovies: any[] }) {
  const items = useRecentlyViewedStore((s) => s.items);

  if (items.length === 0 || allMovies.length === 0) return null;

  // Extremely basic "AI" recommendation logic: 
  // Suggest high rated items from similar release years or type
  const recommended = useMemo(() => {
    const recentTypes = new Set(items.slice(0, 5).map(i => i.subjectType));
    const isAnimeUser = items.some(i => i.title.toLowerCase().includes('anime'));

    let pool = allMovies.filter(m => !items.some(i => i.subjectId === m.subjectId));

    // Boost items matching their type preference
    pool = pool.sort((a, b) => {
      let scoreA = a.imdbRatingValue || 0;
      let scoreB = b.imdbRatingValue || 0;

      if (recentTypes.has(a.subjectType)) scoreA += 1;
      if (recentTypes.has(b.subjectType)) scoreB += 1;

      if (isAnimeUser && a.genre?.toLowerCase().includes('animation')) scoreA += 2;
      if (isAnimeUser && b.genre?.toLowerCase().includes('animation')) scoreB += 2;

      return scoreB - scoreA;
    });

    return pool.slice(0, 15);
  }, [items, allMovies]);

  if (recommended.length === 0) return null;

  return (
    <MovieRow title="✨ Top Picks For You" subtitle="Smart recommendations based on your history">
      {recommended.map((movie: any, idx: number) => (
        <div key={`rec-${movie.subjectId}-${idx}`} className="snap-start relative group">
          <MovieCard movie={movie} index={idx} size="md" />
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg z-10 hidden group-hover:block animate-bounce">
            AI PICK
          </div>
        </div>
      ))}
    </MovieRow>
  );
}

/* ============ RUN MOOD — Mood-Based Suggestions ============ */
const MOODS = [
  { id: 'action', emoji: '💥', label: 'Action-Packed', keywords: ['action', 'thriller', 'adventure', 'war'], gradient: 'from-orange-500 to-red-600' },
  { id: 'funny', emoji: '😂', label: 'Funny', keywords: ['comedy', 'sitcom', 'humor'], gradient: 'from-yellow-400 to-orange-500' },
  { id: 'dark', emoji: '🌑', label: 'Dark', keywords: ['thriller', 'crime', 'noir', 'mystery', 'horror'], gradient: 'from-slate-600 to-slate-900' },
  { id: 'emotional', emoji: '😢', label: 'Emotional', keywords: ['drama', 'romance', 'family', 'biography'], gradient: 'from-pink-500 to-rose-600' },
  { id: 'mindbend', emoji: '🧠', label: 'Mind-Bending', keywords: ['sci-fi', 'science fiction', 'mystery', 'fantasy', 'psychological'], gradient: 'from-purple-500 to-indigo-600' },
  { id: 'chill', emoji: '😎', label: 'Chill', keywords: ['documentary', 'animation', 'family', 'music'], gradient: 'from-teal-400 to-cyan-600' },
  { id: 'scary', emoji: '👻', label: 'Horror Night', keywords: ['horror', 'thriller', 'supernatural', 'zombie'], gradient: 'from-gray-700 to-gray-900' },
  { id: 'date', emoji: '❤️', label: 'Date Night', keywords: ['romance', 'comedy', 'drama', 'musical'], gradient: 'from-rose-400 to-pink-600' },
];

function MoodSelector({ allMovies }: { allMovies: any[] }) {
  const [activeMood, setActiveMood] = useState<string | null>(null);

  if (allMovies.length === 0) return null;

  const filteredMovies = useMemo(() => {
    if (!activeMood) return [];
    const mood = MOODS.find(m => m.id === activeMood);
    if (!mood) return [];

    return allMovies.filter(movie => {
      const genre = (movie.genre || '').toLowerCase();
      return mood.keywords.some(kw => genre.includes(kw));
    }).slice(0, 15);
  }, [activeMood, allMovies]);

  return (
    <div className="py-4">
      {/* Section Header */}
      <div className="px-6 sm:px-10 lg:px-14 mb-4">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-lg">🎭</span>
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight">RUN Mood</h2>
        </div>
        <p className="text-xs text-[var(--rf-text-dim)] ml-8">How are you feeling? Pick a mood for instant suggestions</p>
      </div>

      {/* Mood Pills */}
      <div className="px-6 sm:px-10 lg:px-14 mb-4">
        <div className="flex flex-wrap gap-2">
          {MOODS.map(mood => (
            <button
              key={mood.id}
              onClick={() => setActiveMood(activeMood === mood.id ? null : mood.id)}
              className={`
                px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2
                ${activeMood === mood.id
                  ? `bg-gradient-to-r ${mood.gradient} text-white shadow-lg scale-105`
                  : 'glass-2 text-[var(--rf-text-muted)] hover:text-white hover:scale-[1.02]'
                }
              `}
            >
              <span className="text-sm">{mood.emoji}</span>
              {mood.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtered Results */}
      <AnimatePresence mode="wait">
        {activeMood && filteredMovies.length > 0 && (
          <motion.div
            key={activeMood}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <MovieRow title={`${MOODS.find(m => m.id === activeMood)?.emoji} ${MOODS.find(m => m.id === activeMood)?.label} Vibes`}>
              {filteredMovies.map((movie: any, idx: number) => (
                <div key={`mood-${movie.subjectId}-${idx}`} className="snap-start">
                  <MovieCard movie={movie} index={idx} size="md" />
                </div>
              ))}
            </MovieRow>
          </motion.div>
        )}
        {activeMood && filteredMovies.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-6 sm:px-10 lg:px-14 py-6"
          >
            <div className="glass-2 rounded-2xl p-6 text-center max-w-md mx-auto">
              <p className="text-sm text-[var(--rf-text-muted)]">No matches for this mood right now. Try a different vibe!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============ HIDDEN GEMS — High-Rated Low-Popularity ============ */
function HiddenGems({ allMovies }: { allMovies: any[] }) {
  const gems = useMemo(() => {
    if (allMovies.length < 10) return [];

    // Sort by rating desc, then pick from the bottom half of popularity (last half of array index)
    const sorted = [...allMovies]
      .filter(m => (m.imdbRatingValue || 0) >= 6.5)
      .sort((a, b) => (b.imdbRatingValue || 0) - (a.imdbRatingValue || 0));

    // Take items from the second half (less popular but highly rated)
    const halfPoint = Math.floor(sorted.length / 2);
    return sorted.slice(halfPoint).slice(0, 15);
  }, [allMovies]);

  if (gems.length === 0) return null;

  return (
    <MovieRow title="💎 Hidden Gems" subtitle="Underrated titles worth discovering">
      {gems.map((movie: any, idx: number) => (
        <div key={`gem-${movie.subjectId}-${idx}`} className="snap-start relative">
          <MovieCard movie={movie} index={idx} size="md" />
          <div className="absolute top-2 left-2 bg-gradient-to-r from-emerald-500/80 to-teal-500/80 backdrop-blur-sm text-white text-[8px] font-black px-2 py-0.5 rounded-full z-10 flex items-center gap-1">
            <Star size={8} className="fill-white" />
            GEM
          </div>
        </div>
      ))}
    </MovieRow>
  );
}
