import { Heart, Trash2, Calendar, Star, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useWatchlistStore } from '../stores/useWatchlistStore';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { buildMoviePath } from '../utils/slug';
import { formatRating, formatYear } from '../utils/format';
import { useSEO } from '../hooks/useSEO';

export default function Watchlist() {
  useSEO({ title: 'My Watchlist', description: 'Your saved movies and TV shows' });

  const items = useWatchlistStore((s) => s.items);
  const removeItem = useWatchlistStore((s) => s.removeItem);
  const clear = useWatchlistStore((s) => s.clear);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 max-w-[1600px] mx-auto w-full py-4 md:py-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Heart size={24} className="text-[var(--rf-red)]" fill="currentColor" />
            My Watchlist
          </h1>
          <p className="text-sm text-[var(--rf-text-dim)]">
            {items.length} {items.length === 1 ? 'title' : 'titles'} saved
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={clear}
            className="flex items-center gap-2 px-3 py-2 glass-2 rounded-xl text-xs font-semibold text-[var(--rf-text-muted)] hover:text-[var(--rf-red)] hover:bg-[var(--rf-red)]/5 transition-all"
          >
            <Trash2 size={14} />
            Clear All
          </button>
        )}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-2 rounded-2xl p-10 md:p-14 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
            <Heart size={32} className="text-[var(--rf-text-dim)]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Favorites Yet</h3>
          <p className="text-sm text-[var(--rf-text-dim)] max-w-sm mx-auto leading-relaxed mb-6">
            Tap the heart icon on any movie or show to save it here for later.
          </p>
          <Link to="/explore" className="btn-primary px-6 py-3 text-sm inline-flex">
            Explore Movies
          </Link>
        </motion.div>
      )}

      {/* Grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          <AnimatePresence>
            {items.map((item, idx) => (
              <motion.div
                key={item.subjectId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              >
                <div className="group relative">
                  <Link to={buildMoviePath(item.title, item.subjectId)} className="block">
                    <div className="movie-card aspect-[2/3] overflow-hidden mb-2">
                      <OptimizedImage
                        src={item.coverUrl}
                        alt={item.title}
                        className="w-full h-full transition-transform duration-700 group-hover:scale-110"
                      />

                      {/* Rating badge */}
                      {item.imdbRatingValue && (
                        <div className="absolute top-2 right-2 badge badge-rating text-[9px] z-[2]">
                          <Star size={8} className="fill-[var(--rf-gold)]" />
                          {formatRating(item.imdbRatingValue)}
                        </div>
                      )}

                      <div className="absolute top-2 left-2 badge badge-type text-[8px] z-[2]">
                        {item.subjectType === 2 ? 'TV' : 'Movie'}
                      </div>
                    </div>

                    <h3 className="font-semibold text-sm text-white truncate group-hover:text-[var(--rf-red)] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[var(--rf-text-dim)] mt-0.5">
                      {formatYear(item.releaseDate)}
                    </p>
                  </Link>

                  {/* Remove button */}
                  <button
                    onClick={() => removeItem(item.subjectId)}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-[var(--rf-red)] opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--rf-red)] hover:text-white"
                    aria-label="Remove from watchlist"
                  >
                    <Heart size={12} fill="currentColor" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
