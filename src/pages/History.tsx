import { Clock, Trash2, Calendar, Star, Film, Tv, Play, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useRecentlyViewedStore } from '../stores/useRecentlyViewedStore';
import { useProgressStore } from '../stores/useProgressStore';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { buildMoviePath } from '../utils/slug';
import { formatRating, formatYear } from '../utils/format';
import { useSEO } from '../hooks/useSEO';
import toast from 'react-hot-toast';
import ContinuePlayDialog from '../components/ContinuePlayDialog';

export default function HistoryPage() {
  useSEO({
    title: 'Watch History',
    description: 'Manage and resume your recently viewed movies and TV series',
  });

  const items = useRecentlyViewedStore((s) => s.items);
  const removeItem = useRecentlyViewedStore((s) => s.removeItem);
  const clear = useRecentlyViewedStore((s) => s.clear);

  const getProgress = useProgressStore((s) => s.getProgress);
  const removeProgress = useProgressStore((s) => s.removeProgress);
  const clearProgress = useProgressStore((s) => s.clearProgress);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'movies' | 'series'>('all');
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null);

  const handleDeleteItem = (e: React.MouseEvent, subjectId: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeItem(subjectId);
    removeProgress(subjectId);
    toast.success(`Removed "${title}" from History`, { icon: '🗑️' });
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear your entire watch history? This cannot be undone.')) {
      clear();
      clearProgress();
      toast.success('Watch History cleared completely', { icon: '🧹' });
    }
  };

  // Filter and Search Logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        filterType === 'all' ||
        (filterType === 'movies' && item.subjectType === 1) ||
        (filterType === 'series' && item.subjectType === 2);
      return matchesSearch && matchesType;
    });
  }, [items, searchQuery, filterType]);

  // Compute stats
  const stats = useMemo(() => {
    const totalCount = items.length;
    const moviesCount = items.filter((i) => i.subjectType === 1).length;
    const seriesCount = items.filter((i) => i.subjectType === 2).length;
    return { totalCount, moviesCount, seriesCount };
  }, [items]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 max-w-[1600px] mx-auto w-full py-4 md:py-8"
    >
      {/* ============ HEADER ============ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Clock size={24} className="text-[var(--rf-red)]" />
            Watch History
          </h1>
          <p className="text-sm text-[var(--rf-text-dim)]">
            Keep track of what you've watched, resume unfinished videos, or clear lists
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2.5 glass-2 rounded-xl text-xs font-semibold text-[var(--rf-text-muted)] hover:text-[var(--rf-red)] hover:bg-[var(--rf-red)]/5 transition-all self-start md:self-auto border border-white/[0.04]"
          >
            <Trash2 size={14} />
            Clear All History
          </button>
        )}
      </div>

      {/* ============ STATS / SEARCH BAR ============ */}
      {items.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] mb-6">
          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-xs font-medium text-[var(--rf-text-muted)] w-full lg:w-auto">
            <span>📊 Stats:</span>
            <span className="glass-2 px-2.5 py-1 rounded-lg text-white">
              {stats.totalCount} Watched
            </span>
            <span className="glass-2 px-2.5 py-1 rounded-lg text-white">
              🎬 {stats.moviesCount} Movies
            </span>
            <span className="glass-2 px-2.5 py-1 rounded-lg text-white">
              📺 {stats.seriesCount} Series
            </span>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 glass-2 rounded-xl w-full sm:w-auto">
              {(['all', 'movies', 'series'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filterType === type
                      ? 'bg-[var(--rf-red)] text-white shadow-lg shadow-[var(--rf-red)]/20'
                      : 'text-[var(--rf-text-muted)] hover:text-white'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--rf-text-dim)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5 pl-9 pr-8 text-xs text-white placeholder-[var(--rf-text-dim)] focus:outline-none focus:border-[var(--rf-red)]/35 focus:ring-1 focus:ring-[var(--rf-red)]/20 transition-all font-semibold"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--rf-text-dim)] hover:text-white p-1"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ EMPTY STATE ============ */}
      {items.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-2 rounded-2xl p-10 md:p-14 text-center border border-white/[0.04]"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
            <Clock size={32} className="text-[var(--rf-text-dim)]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No History Yet</h3>
          <p className="text-sm text-[var(--rf-text-dim)] max-w-sm mx-auto leading-relaxed mb-6">
            You haven't watched any movies or TV series yet. Explore our cinema library to discover awesome content.
          </p>
          <Link to="/explore" className="btn-primary px-6 py-3 text-sm inline-flex">
            Discover Content
          </Link>
        </motion.div>
      )}

      {/* ============ RESULTS GRID ============ */}
      {items.length > 0 && filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.01] rounded-2xl border border-white/[0.04]">
          <h3 className="text-lg font-bold text-white mb-1">No Matching Items</h3>
          <p className="text-sm text-[var(--rf-text-dim)]">Try adjusting your search query or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          <AnimatePresence>
            {filteredItems.map((item, idx) => {
              // Retrieve play progress for this specific title
              const prog = getProgress(item.subjectId);
              let progressPercent = 0;
              let progressLabel = '';

              if (prog && prog.duration && prog.duration > 0) {
                const lastTime = prog.lastTime || 0;
                progressPercent = Math.min((lastTime / prog.duration) * 100, 100);

                if (item.subjectType === 2) {
                  progressLabel = `S${prog.lastSeason} E${prog.lastEpisode} • ${Math.round(progressPercent)}%`;
                } else {
                  progressLabel = `${Math.round(progressPercent)}% Watched`;
                }
              }

              return (
                <motion.div
                  key={item.subjectId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                >
                  <div className="group relative">
                    <Link
                      to={buildMoviePath(item.title, item.subjectId)}
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedMovie(item);
                      }}
                      className="block"
                    >
                      <div className="movie-card aspect-[2/3] overflow-hidden mb-2 relative">
                        <OptimizedImage
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-full h-full transition-transform duration-700 group-hover:scale-110"
                        />

                        {/* Visual play overlay on card hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 z-10">
                          <div className="w-10 h-10 rounded-full bg-[var(--rf-red)] flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl shadow-[var(--rf-red)]/30">
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                          </div>
                        </div>

                        {/* Top corner details */}
                        {item.imdbRatingValue && (
                          <div className="absolute top-2 right-2 badge badge-rating text-[9px] z-20">
                            <Star size={8} className="fill-[var(--rf-gold)]" />
                            {formatRating(item.imdbRatingValue)}
                          </div>
                        )}

                        <div className="absolute top-2 left-2 badge badge-type text-[8px] z-20">
                          {item.subjectType === 2 ? 'TV' : 'Movie'}
                        </div>

                        {/* Play Progress Bar Overlay */}
                        {progressPercent > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
                            <div
                              className="h-full bg-[var(--rf-red)] shadow-[0_0_8px_var(--rf-red)]"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Movie metadata */}
                      <h3 className="font-semibold text-sm text-white truncate group-hover:text-[var(--rf-red)] transition-colors">
                        {item.title}
                      </h3>

                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <p className="text-[10px] text-[var(--rf-text-dim)] flex items-center gap-1">
                          <Calendar size={10} />
                          {formatYear(item.releaseDate)}
                        </p>
                        {progressLabel && (
                          <p className="text-[10px] text-[var(--rf-red)] font-bold tracking-tight">
                            {progressLabel}
                          </p>
                        )}
                      </div>
                    </Link>

                    {/* Delete card from history button */}
                    <button
                      onClick={(e) => handleDeleteItem(e, item.subjectId, item.title)}
                      className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-[var(--rf-text-muted)] opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--rf-red)] hover:text-white hover:scale-105 active:scale-95 shadow-lg border border-white/5"
                      title="Remove from History"
                      aria-label="Remove item from watch history"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      {selectedMovie && (
        <ContinuePlayDialog
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </motion.div>
  );
}
