import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSearch } from '../api/client';
import { motion } from 'motion/react';
import { ChevronLeft, Film, Tv, Star, User } from 'lucide-react';
import { MovieCardGrid } from '../components/MovieCard';
import { GridSkeleton } from '../components/ui/Skeleton';
import { useSEO } from '../hooks/useSEO';
import { formatRating } from '../utils/format';
import { resolveOgImage } from '../utils/seo';

export default function ActorPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const actorName = decodeURIComponent(name || '');
  
  const avatarUrl = useMemo(() => {
    const stateUrl = location.state?.avatarUrl;
    if (stateUrl) {
      localStorage.setItem(`actor-avatar-${actorName}`, stateUrl);
      return stateUrl;
    }
    return localStorage.getItem(`actor-avatar-${actorName}`) || '';
  }, [location.state, actorName]);

  const seoSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "mainEntity": {
      "@type": "Person",
      "name": actorName,
      "image": resolveOgImage(avatarUrl)
    },
    "description": `Browse all movies and TV shows featuring ${actorName} on RUNFlix. Download ${actorName} movies in high quality.`,
    "url": window.location.href
  };

  useSEO({
    title: `${actorName} Movies & TV Shows`,
    description: `Browse all movies and TV shows featuring ${actorName} on RUNFlix. Download ${actorName} movies in high quality.`,
    image: resolveOgImage(avatarUrl),
    schema: seoSchema
  });

  const [visibleCount, setVisibleCount] = useState<number>(12);

  // Reset page limit on actor name changes
  useEffect(() => {
    setVisibleCount(12);
  }, [actorName]);

  const { data: searchData, isLoading } = useQuery({
    queryKey: ['actor-search', actorName],
    queryFn: () => fetchSearch(actorName, 1),
    enabled: !!actorName,
    staleTime: 15 * 60 * 1000,
  });

  const movies = useMemo(() => {
    const seen = new Set<string>();
    return (searchData?.items || []).filter((m: any) => {
      if (!m.subjectId || seen.has(m.subjectId)) return false;
      seen.add(m.subjectId);
      return true;
    });
  }, [searchData]);

  const topRating = useMemo(() =>
    movies.reduce((max: number, m: any) => Math.max(max, m.imdbRatingValue || 0), 0),
  [movies]);

  const initials = actorName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      {/* ── HERO ── */}
      <div className="relative py-14 md:py-20 px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/25 via-[var(--rf-black)] to-violet-900/20" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="relative z-10 max-w-[1600px] mx-auto">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs text-[var(--rf-text-dim)] hover:text-white mb-6 transition-colors group">
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back
          </button>
          <div className="flex items-center gap-5 md:gap-6">
            <div className="shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl md:text-3xl font-black text-white shadow-xl shadow-indigo-500/20 overflow-hidden relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={actorName}
                  className="w-full h-full object-cover absolute inset-0"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    localStorage.removeItem(`actor-avatar-${actorName}`);
                  }}
                />
              ) : null}
              {initials || <User size={32} />}
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-1">{actorName}</h1>
              <p className="text-sm text-[var(--rf-text-muted)]">Actor / Filmmaker</p>
              {!isLoading && movies.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <div className="glass-2 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <Film size={12} className="text-indigo-400" />
                    <span className="text-xs font-bold text-white">{movies.filter((m: any) => m.subjectType === 1).length}</span>
                    <span className="text-xs text-[var(--rf-text-dim)]">Movies</span>
                  </div>
                  <div className="glass-2 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <Tv size={12} className="text-violet-400" />
                    <span className="text-xs font-bold text-white">{movies.filter((m: any) => m.subjectType === 2).length}</span>
                    <span className="text-xs text-[var(--rf-text-dim)]">Series</span>
                  </div>
                  {topRating > 0 && (
                    <div className="glass-2 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <Star size={12} className="text-[var(--rf-gold)] fill-[var(--rf-gold)]" />
                      <span className="text-xs font-bold text-white">{formatRating(topRating)}</span>
                      <span className="text-xs text-[var(--rf-text-dim)]">Best rating</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── FILMOGRAPHY ── */}
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 pb-12">
        <h2 className="text-xs font-bold text-[var(--rf-text-muted)] uppercase tracking-wider mb-5 flex items-center gap-2">
          <Film size={12} /> Filmography · {movies.length} titles
        </h2>
        {isLoading ? (
          <GridSkeleton count={12} />
        ) : movies.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4"
          >
            {movies.slice(0, visibleCount).map((movie: any, idx: number) => (
              <MovieCardGrid key={`${movie.subjectId}-${idx}`} movie={movie} index={idx} />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl glass-2 flex items-center justify-center mx-auto mb-4">
              <User size={32} className="text-[var(--rf-text-dim)]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No titles found</h3>
            <p className="text-sm text-[var(--rf-text-dim)]">
              We couldn't find any titles for <span className="text-white font-semibold">{actorName}</span>.
            </p>
          </div>
        )}

        {/* See More Button */}
        {movies.length > visibleCount && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + 12)}
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
