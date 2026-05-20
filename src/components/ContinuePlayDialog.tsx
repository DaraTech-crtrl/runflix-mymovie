import { useNavigate } from 'react-router-dom';
import { Play, Info, X } from 'lucide-react';
import { useProgressStore } from '../stores/useProgressStore';
import { buildMoviePath } from '../utils/slug';

interface ContinuePlayDialogProps {
  movie: any;
  onClose: () => void;
}

export default function ContinuePlayDialog({ movie, onClose }: ContinuePlayDialogProps) {
  const navigate = useNavigate();
  const getProgress = useProgressStore((s) => s.getProgress);
  const prog = getProgress(movie.subjectId);
  const title = movie.title || movie.name || 'Untitled';
  const coverUrl = movie.coverUrl || movie.cover?.url;

  let progressPercent = 0;
  let progressText = '';

  if (prog) {
    if (movie.subjectType === 2) {
      progressText = `Season ${prog.lastSeason} • Episode ${prog.lastEpisode}`;
    } else {
      progressText = 'Movie in progress';
    }
    if (prog.duration && prog.duration > 0) {
      progressPercent = Math.min(((prog.lastTime || 0) / prog.duration) * 100, 100);
    }
  }

  const handleContinuePlay = () => {
    const moviePath = buildMoviePath(title, movie.subjectId);
    const watchPath = moviePath.replace('/movie/', '/watch/');
    if (movie.subjectType === 2) {
      navigate(`${watchPath}?s=${prog?.lastSeason || 1}&e=${prog?.lastEpisode || 1}`);
    } else {
      navigate(watchPath);
    }
    onClose();
  };

  const handleViewDetails = () => {
    navigate(buildMoviePath(title, movie.subjectId));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      {/* Backdrop click */}
      <div className="absolute inset-0 bg-transparent" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-sm bg-zinc-950/90 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 overflow-hidden animate-zoom-in relative z-10 flex flex-col items-center">
        {/* Glow effect in background */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-[var(--rf-red)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[var(--rf-red)]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/5 hover:bg-white/15 p-2 rounded-full transition-all"
        >
          <X size={16} />
        </button>

        {/* Poster image mini wrapper */}
        <div className="w-28 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 mt-2 relative">
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Text */}
        <div className="text-center space-y-1 max-w-xs">
          <h3 className="text-base font-extrabold text-white leading-tight">
            {title}
          </h3>
          {progressText && (
            <p className="text-[11px] text-[var(--rf-red)] font-black tracking-wider uppercase mt-1">
              {progressText}
            </p>
          )}
          {progressPercent > 0 && (
            <div className="w-32 h-1 bg-white/10 rounded-full mx-auto mt-2.5 overflow-hidden">
              <div
                className="h-full bg-[var(--rf-red)] rounded-full shadow-[0_0_8px_var(--rf-red)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-2 pt-2">
          <button
            onClick={handleContinuePlay}
            className="w-full py-3 bg-[var(--rf-red)] text-white hover:bg-[var(--rf-red)]/90 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-[0_4px_15px_rgba(225,29,72,0.3)] hover:scale-[1.02] active:scale-95"
          >
            <Play size={14} className="fill-white text-white" />
            <span>Continue Play</span>
          </button>

          <button
            onClick={handleViewDetails}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all hover:scale-[1.02] active:scale-95"
          >
            <Info size={14} />
            <span>View Details</span>
          </button>
        </div>
      </div>
    </div>
  );
}
