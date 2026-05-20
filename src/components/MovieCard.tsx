import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star, Play, Tv, Film, Bookmark, Check } from 'lucide-react';
import { OptimizedImage } from './ui/OptimizedImage';
import { buildMoviePath } from '../utils/slug';
import { formatYear, formatRating } from '../utils/format';
import { useProgressStore } from '../stores/useProgressStore';
import { useWatchlistStore } from '../stores/useWatchlistStore';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

interface MovieCardProps {
  movie: any;
  index?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: (e: React.MouseEvent) => void;
}

export const MovieCard = memo(({ movie, index = 0, size = 'md', onClick }: MovieCardProps) => {
  const title = movie.title || movie.name || 'Untitled';
  const id = String(movie.subjectId);
  const coverUrl = movie.cover?.url;
  const rating = movie.imdbRatingValue;
  const year = formatYear(movie.releaseDate);
  const isSeries = movie.subjectType === 2;

  const prog = useProgressStore((s) => (id ? s.progress[id] : undefined));

  const progressPercent = useMemo(() => {
    if (prog?.lastTime != null && prog?.duration && prog.duration > 0) {
      return Math.min((prog.lastTime / prog.duration) * 100, 100);
    }
    return 0;
  }, [prog?.lastTime, prog?.duration]);

  // Watchlist Store
  const addItem = useWatchlistStore((s) => s.addItem);
  const removeItem = useWatchlistStore((s) => s.removeItem);
  const isInWatchlist = useWatchlistStore((s) => s.isInWatchlist(id));

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWatchlist) {
      removeItem(id);
      toast('Removed from Watchlist', { icon: '💔' });
    } else {
      addItem({
        subjectId: id,
        title,
        coverUrl,
        subjectType: movie.subjectType,
        imdbRatingValue: rating,
        releaseDate: movie.releaseDate,
      });
      toast.success('Added to Watchlist');
    }
  };

  const sizeClasses = {
    sm: 'w-[130px] md:w-[150px]',
    md: 'w-[150px] md:w-[175px]',
    lg: 'w-[170px] md:w-[200px]',
  };

  const widthVal = size === 'sm' ? 250 : size === 'lg' ? 400 : 350;

  return (
    <div>
      <Link
        to={buildMoviePath(title, id)}
        onClick={onClick}
        className={cn(
          "group relative block movie-card rounded-2xl overflow-hidden bg-white/[0.01] border border-white/[0.04] transition-colors duration-200 hover:border-[var(--rf-red)]/35",
          sizeClasses[size]
        )}
        aria-label={`View ${title}`}
      >
        {/* Poster Wrapper */}
        <div className="aspect-[2/3] w-full overflow-hidden relative bg-white/[0.02]">
          <OptimizedImage
            src={coverUrl}
            alt={title}
            priority={true}
            width={widthVal}
            className="w-full h-full object-cover"
          />

          {/* Premium Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-95 group-hover:opacity-100 transition-opacity duration-400" />

          {/* Quick Bookmark (Watchlist) Badge */}
          <button
            onClick={toggleWatchlist}
            className={cn(
              "absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-xl flex items-center justify-center backdrop-blur-xl border transition-all duration-300 active:scale-90",
              isInWatchlist
                ? "bg-[var(--rf-red)] border-none text-white shadow-[0_0_12px_rgba(225,29,72,0.55)]"
                : "bg-black/40 border-white/10 hover:bg-black/60 hover:border-white/20 text-white/80"
            )}
            title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            {isInWatchlist ? <Check size={11} strokeWidth={3} /> : <Bookmark size={11} />}
          </button>

          {/* Type Tag Left-Floating */}
          <span className="absolute top-2.5 left-2.5 z-10 badge glass text-[8px] uppercase tracking-wider py-1 px-2 border border-white/5 flex items-center gap-1 font-bold">
            {isSeries ? <Tv size={8} className="text-[var(--rf-red)]" /> : <Film size={8} className="text-[var(--rf-red)]" />}
            {isSeries ? 'TV' : 'Movie'}
          </span>

          {/* Play Button Overlay (Fades In) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-400 z-[3]">
            <div className="w-12 h-12 rounded-full bg-[var(--rf-red)] flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-400 hover:bg-[var(--rf-red)]/90 glow-red">
              <Play size={18} className="fill-white text-white ml-0.5" />
            </div>
          </div>

          {/* Progress Percentage Badge */}
          {progressPercent > 0 && (
            <span className="absolute bottom-2.5 right-2.5 z-10 badge bg-[var(--rf-red)]/90 backdrop-blur-md text-[9px] text-white py-1 px-2 border border-white/10 rounded-md font-bold shadow-[0_0_12px_rgba(225,29,72,0.3)]">
              {Math.round(progressPercent)}% watched
            </span>
          )}
        </div>

        {/* Premium Bottom Details Panel */}
        <div className="p-3 bg-gradient-to-t from-black via-black/95 to-black/80 border-t border-white/[0.04] relative z-[2]">
          <h4 className="text-xs font-bold text-white group-hover:text-[var(--rf-red)] transition-colors truncate mb-0.5 leading-snug">
            {title}
          </h4>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-[var(--rf-text-muted)] font-semibold uppercase tracking-wider">
              {year || 'N/A'}
            </span>
            {rating && (
              <div className="flex items-center gap-1">
                <Star size={8} className="fill-[var(--rf-gold)] text-[var(--rf-gold)]" />
                <span className="text-[9px] font-black text-white/90">
                  {formatRating(rating)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
});

MovieCard.displayName = 'MovieCard';

/* Grid version of the movie card (for search/explore) */
export const MovieCardGrid = memo(({ movie, index = 0 }: MovieCardProps) => {
  const title = movie.title || movie.name || 'Untitled';
  const id = String(movie.subjectId);
  const coverUrl = movie.cover?.url;
  const rating = movie.imdbRatingValue;
  const year = formatYear(movie.releaseDate);
  const isSeries = movie.subjectType === 2;

  const prog = useProgressStore((s) => (id ? s.progress[id] : undefined));

  const progressPercent = useMemo(() => {
    if (prog?.lastTime != null && prog?.duration && prog.duration > 0) {
      return Math.min((prog.lastTime / prog.duration) * 100, 100);
    }
    return 0;
  }, [prog?.lastTime, prog?.duration]);

  // Watchlist Store
  const addItem = useWatchlistStore((s) => s.addItem);
  const removeItem = useWatchlistStore((s) => s.removeItem);
  const isInWatchlist = useWatchlistStore((s) => s.isInWatchlist(id));

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWatchlist) {
      removeItem(id);
      toast('Removed from Watchlist', { icon: '💔' });
    } else {
      addItem({
        subjectId: id,
        title,
        coverUrl,
        subjectType: movie.subjectType,
        imdbRatingValue: rating,
        releaseDate: movie.releaseDate,
      });
      toast.success('Added to Watchlist');
    }
  };

  return (
    <div>
      <Link
        to={buildMoviePath(title, id)}
        className="group relative block movie-card rounded-2xl overflow-hidden bg-white/[0.01] border border-white/[0.04] transition-colors duration-200 hover:border-[var(--rf-red)]/35 w-full"
        aria-label={`View ${title}`}
      >
        {/* Poster Wrapper */}
        <div className="aspect-[2/3] w-full overflow-hidden relative bg-white/[0.02]">
          <OptimizedImage
            src={coverUrl}
            alt={title}
            priority={index < 4}
            width={350}
            className="w-full h-full object-cover"
          />

          {/* Premium Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-95 group-hover:opacity-100 transition-opacity duration-400" />

          {/* Quick Bookmark (Watchlist) Badge */}
          <button
            onClick={toggleWatchlist}
            className={cn(
              "absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-xl flex items-center justify-center backdrop-blur-xl border transition-all duration-300 active:scale-90",
              isInWatchlist
                ? "bg-[var(--rf-red)] border-none text-white shadow-[0_0_12px_rgba(225,29,72,0.55)]"
                : "bg-black/40 border-white/10 hover:bg-black/60 hover:border-white/20 text-white/80"
            )}
            title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            {isInWatchlist ? <Check size={11} strokeWidth={3} /> : <Bookmark size={11} />}
          </button>

          {/* Type Tag Left-Floating */}
          <span className="absolute top-2.5 left-2.5 z-10 badge glass text-[8px] uppercase tracking-wider py-1 px-2 border border-white/5 flex items-center gap-1 font-bold">
            {isSeries ? <Tv size={8} className="text-[var(--rf-red)]" /> : <Film size={8} className="text-[var(--rf-red)]" />}
            {isSeries ? 'TV' : 'Movie'}
          </span>

          {/* Play Button Overlay (Fades In) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-400 z-[3]">
            <div className="w-12 h-12 rounded-full bg-[var(--rf-red)] flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-400 hover:bg-[var(--rf-red)]/90 glow-red">
              <Play size={18} className="fill-white text-white ml-0.5" />
            </div>
          </div>

          {/* Progress Percentage Badge */}
          {progressPercent > 0 && (
            <span className="absolute bottom-2.5 right-2.5 z-10 badge bg-[var(--rf-red)]/90 backdrop-blur-md text-[9px] text-white py-1 px-2 border border-white/10 rounded-md font-bold shadow-[0_0_12px_rgba(225,29,72,0.3)]">
              {Math.round(progressPercent)}% watched
            </span>
          )}
        </div>

        {/* Premium Bottom Details Panel */}
        <div className="p-3 bg-gradient-to-t from-black via-black/95 to-black/80 border-t border-white/[0.04] relative z-[2]">
          <h4 className="text-xs font-bold text-white group-hover:text-[var(--rf-red)] transition-colors truncate mb-0.5 leading-snug">
            {title}
          </h4>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-[var(--rf-text-muted)] font-semibold uppercase tracking-wider">
              {year || 'N/A'}
            </span>
            {rating && (
              <div className="flex items-center gap-1">
                <Star size={8} className="fill-[var(--rf-gold)] text-[var(--rf-gold)]" />
                <span className="text-[9px] font-black text-white/90">
                  {formatRating(rating)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
});

MovieCardGrid.displayName = 'MovieCardGrid';
