import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHomepage, fetchTrending } from '../api/client';
import { motion } from 'motion/react';
import { Layers, ChevronRight } from 'lucide-react';
import { MovieCard } from '../components/MovieCard';
import { MovieRow } from '../components/MovieRow';
import { MovieRowSkeleton } from '../components/ui/Skeleton';
import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';
import { GENRE_LIST } from './Genre';

const GENRE_EMOJIS: Record<string, string> = {
  trending: '🔥', popular: '⭐', 'top-rated': '🏆', action: '💥', adventure: '🗺️',
  anime: '🌸', animation: '✨', comedy: '😂', crime: '🕵️', drama: '🎭',
  fantasy: '🧙', family: '👨‍👩‍👧‍👦', horror: '👻', mystery: '🔍', romance: '💕',
  thriller: '🔪', 'sci-fi': '🚀', superhero: '🦸', war: '⚔️', 'k-drama': '🇰🇷',
  'c-drama': '🇨🇳', 'j-drama': '🇯🇵', turkish: '🇹🇷', nollywood: '🎬',
  yoruba: '🪘', bollywood: '💃', documentary: '🎥'
};

const GENRE_GRADIENTS: Record<string, string> = {
  trending: 'from-orange-600/20 to-red-900/10',
  popular: 'from-yellow-500/20 to-amber-700/10',
  'top-rated': 'from-amber-600/20 to-yellow-800/10',
  action: 'from-red-600/20 to-orange-900/10',
  adventure: 'from-emerald-600/20 to-teal-800/10',
  anime: 'from-pink-500/20 to-rose-800/10',
  animation: 'from-violet-500/20 to-fuchsia-800/10',
  comedy: 'from-yellow-400/20 to-orange-600/10',
  crime: 'from-zinc-700/20 to-slate-900/10',
  drama: 'from-indigo-600/20 to-purple-900/10',
  fantasy: 'from-purple-600/20 to-indigo-900/10',
  family: 'from-sky-500/20 to-blue-700/10',
  horror: 'from-gray-800/30 to-red-950/10',
  mystery: 'from-amber-700/20 to-stone-800/10',
  romance: 'from-pink-400/20 to-rose-700/10',
  thriller: 'from-slate-700/20 to-red-800/10',
  'sci-fi': 'from-cyan-600/20 to-blue-900/10',
  superhero: 'from-blue-600/20 to-indigo-900/10',
  war: 'from-stone-700/20 to-green-900/10',
  'k-drama': 'from-rose-500/20 to-pink-900/10',
  'c-drama': 'from-red-600/20 to-red-950/10',
  'j-drama': 'from-red-500/20 to-rose-900/10',
  turkish: 'from-red-600/20 to-red-900/10',
  nollywood: 'from-green-600/20 to-emerald-950/10',
  yoruba: 'from-amber-700/20 to-orange-950/10',
  bollywood: 'from-orange-500/20 to-red-700/10',
  documentary: 'from-stone-600/20 to-neutral-800/10'
};

export default function Collections() {
  useSEO({
    title: 'Collections',
    description: 'Browse curated movie and TV collections by genre, mood, and more on Runflix Entertainment',
  });

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

  /* Deduplicated pool */
  const allMovies = useMemo(() => {
    const movies: any[] = [];
    const seen = new Set<string>();
    const add = (m: any) => {
      if (m?.subjectId && !seen.has(m.subjectId)) {
        seen.add(m.subjectId);
        movies.push({
          ...m,
          imdbRatingValue: Number(m.imdbRatingValue || m.rating || 0)
        });
      }
    };
    if (hpData?.operatingList) {
      for (const s of hpData.operatingList) {
        s.subjects?.forEach(add);
      }
    }
    trending?.forEach(add);
    return movies;
  }, [hpData, trending]);

  /* Build genre collections (min 4 items) */
  const genreCollections = useMemo(() => {
    return GENRE_LIST.map((genre) => {
      const items = allMovies.filter((m) =>
        (m.genre || '').toLowerCase().includes(genre)
      );
      return { genre, items };
    }).filter((c) => c.items.length >= 4);
  }, [allMovies]);

  /* Curated special collections */
  const specialCollections = useMemo(() => [
    {
      key: 'top-rated',
      title: '⭐ Top Rated',
      subtitle: 'IMDb 8.0+',
      items: [...allMovies].filter(m => m.imdbRatingValue >= 8)
        .sort((a, b) => b.imdbRatingValue - a.imdbRatingValue).slice(0, 15),
    },
    {
      key: 'new-releases',
      title: '🆕 New Releases',
      subtitle: 'Recently added',
      items: [...allMovies].sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || '')).slice(0, 15),
    },
    {
      key: 'movies-only',
      title: '🎬 Movies Only',
      subtitle: 'Feature films',
      items: allMovies.filter(m => m.subjectType === 1).slice(0, 15),
    },
    {
      key: 'series-only',
      title: '📺 TV Series',
      subtitle: 'Binge-worthy shows',
      items: allMovies.filter(m => m.subjectType === 2).slice(0, 15),
    },
    {
      key: 'anime',
      title: '🎌 Anime',
      subtitle: 'Japanese animation',
      items: allMovies.filter(m =>
        (m.genre || '').toLowerCase().includes('anime') ||
        (m.countryName || '').toLowerCase().includes('japan')
      ).slice(0, 15),
      link: '/anime',
    },
  ].filter(c => c.items.length >= 3), [allMovies]);

  const isLoading = tl || hl;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">

      {/* ── HERO ── */}
      <div className="relative py-12 md:py-20 px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/25 via-[var(--rf-black)] to-blue-900/15" />
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-violet-600/8 blur-[130px] rounded-full" />
        <div className="relative z-10 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-xl shadow-violet-500/20">
              <Layers size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-white">Collections</h1>
              <p className="text-sm text-[var(--rf-text-muted)] mt-1">Curated lists for every mood</p>
            </div>
          </div>
          {!isLoading && (
            <p className="text-sm text-[var(--rf-text-dim)]">
              {specialCollections.length + genreCollections.length} collections · {allMovies.length} total titles
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28">
          {[1,2,3].map(i => <MovieRowSkeleton key={i} />)}
        </div>
      ) : (
        <div className="space-y-2 pb-12">
          {/* Special curated rows */}
          {specialCollections.map((col) => (
            <MovieRow
              key={col.key}
              title={col.title}
              subtitle={col.subtitle}
              onViewAll={col.link ? () => window.location.href = col.link! : undefined}
            >
              {col.items.map((movie: any, idx: number) => (
                <div key={`${col.key}-${movie.subjectId}-${idx}`} className="snap-start">
                  <MovieCard movie={movie} index={idx} size="md" />
                </div>
              ))}
            </MovieRow>
          ))}

          {/* Genre grid navigator */}
          <div className="max-w-[1600px] mx-auto px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Browse by Genre</h2>
              <Link to="/genre" className="text-xs text-[var(--rf-red)] flex items-center gap-0.5 hover:gap-1 transition-all">
                See All <ChevronRight size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {genreCollections.map(({ genre, items }) => (
                <Link
                  key={genre}
                  to={`/genre/${genre}`}
                  className={`group relative h-20 md:h-24 rounded-2xl overflow-hidden bg-gradient-to-br ${GENRE_GRADIENTS[genre] || 'from-[var(--rf-surface-2)] to-[var(--rf-surface-3)]'} border border-white/[0.05] hover:border-white/10 transition-all duration-300`}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 z-10">
                    <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                      {GENRE_EMOJIS[genre] || '🎬'}
                    </span>
                    <span className="text-white font-bold text-xs capitalize">{genre}</span>
                    <span className="text-[var(--rf-text-dim)] text-[9px]">{items.length} titles</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Genre rows */}
          {genreCollections.slice(0, 8).map(({ genre, items }) => (
            <MovieRow
              key={genre}
              title={`${GENRE_EMOJIS[genre] || '🎬'} ${genre.charAt(0).toUpperCase() + genre.slice(1)}`}
              onViewAll={() => window.location.href = `/genre/${genre}`}
            >
              {items.slice(0, 15).map((movie: any, idx: number) => (
                <div key={`genre-${genre}-${movie.subjectId}-${idx}`} className="snap-start">
                  <MovieCard movie={movie} index={idx} size="md" />
                </div>
              ))}
            </MovieRow>
          ))}
        </div>
      )}
    </motion.div>
  );
}
