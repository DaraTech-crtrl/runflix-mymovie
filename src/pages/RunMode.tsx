import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTrending, fetchHomepage } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Radio, Zap, Shuffle, ChevronLeft, Tv, SkipForward, Pause, Volume2 } from 'lucide-react';
import { buildMoviePath } from '../utils/slug';
import { useSEO } from '../hooks/useSEO';
import { cn } from '../utils/cn';
import { getOptimizedImageUrl } from '../utils/image';

const CHANNELS = [
  { id: 'trending', name: '🔥 Trending', color: 'from-red-500/20 to-orange-500/20', accent: 'text-red-400', genres: [] },
  { id: 'action', name: '💥 Action', color: 'from-amber-500/20 to-red-500/20', accent: 'text-amber-400', genres: ['Action', 'Thriller'] },
  { id: 'comedy', name: '😂 Comedy', color: 'from-yellow-500/20 to-green-500/20', accent: 'text-yellow-400', genres: ['Comedy'] },
  { id: 'horror', name: '👻 Horror', color: 'from-purple-500/20 to-red-500/20', accent: 'text-purple-400', genres: ['Horror', 'Mystery'] },
  { id: 'romance', name: '❤️ Romance', color: 'from-pink-500/20 to-rose-500/20', accent: 'text-pink-400', genres: ['Romance', 'Drama'] },
  { id: 'scifi', name: '🚀 Sci-Fi', color: 'from-blue-500/20 to-cyan-500/20', accent: 'text-blue-400', genres: ['Science Fiction', 'Sci-Fi', 'Fantasy'] },
  { id: 'drama', name: '🎭 Drama', color: 'from-violet-500/20 to-indigo-500/20', accent: 'text-violet-400', genres: ['Drama'] },
  { id: 'family', name: '👨‍👩‍👧‍👦 Family', color: 'from-emerald-500/20 to-teal-500/20', accent: 'text-emerald-400', genres: ['Family', 'Animation', 'Kids'] },
];

export default function RunMode() {
  const navigate = useNavigate();

  useSEO({
    title: 'RUN Mode — TV Channel',
    description: 'Non-stop curated entertainment. Pick a channel and let Runflix Entertainment play automatically.',
  });

  const [activeChannel, setActiveChannel] = useState(CHANNELS[0]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { data: trending } = useQuery({
    queryKey: ['trending'],
    queryFn: fetchTrending,
  });

  const { data: hpData } = useQuery<any>({
    queryKey: ['homepage'],
    queryFn: fetchHomepage,
  });

  // Build content pool based on channel
  const contentPool = useMemo(() => {
    const all: any[] = [];
    const seen = new Set<string>();

    // Merge trending + homepage subjects
    if (trending) {
      for (const m of trending) {
        if (m.subjectId && !seen.has(m.subjectId)) {
          seen.add(m.subjectId);
          all.push(m);
        }
      }
    }

    if (hpData?.operatingList) {
      for (const op of hpData.operatingList) {
        if (op.type === 'SUBJECTS_MOVIE' && op.subjects) {
          for (const m of op.subjects) {
            if (m.subjectId && !seen.has(m.subjectId)) {
              seen.add(m.subjectId);
              all.push(m);
            }
          }
        }
      }
    }

    // Filter by channel genres
    if (activeChannel.genres.length === 0) return all;

    return all.filter((m) => {
      const movieGenre = (m.genre || '').toLowerCase();
      return activeChannel.genres.some((g) => movieGenre.includes(g.toLowerCase()));
    });
  }, [trending, hpData, activeChannel]);

  // Shuffle on channel change
  const shuffled = useMemo(() => {
    const arr = [...contentPool];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [contentPool]);

  const currentItem = shuffled[currentIndex % Math.max(shuffled.length, 1)];
  const nextItem = shuffled[(currentIndex + 1) % Math.max(shuffled.length, 1)];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(shuffled.length, 1));
    setCountdown(0);
  }, [shuffled.length]);

  const handlePlay = useCallback(() => {
    if (!currentItem) return;
    const path = buildMoviePath(currentItem.title || '', currentItem.subjectId || currentItem.id || '');
    navigate(path.replace('/movie/', '/watch/'));
  }, [currentItem, navigate]);

  // Auto-play countdown
  useEffect(() => {
    if (!isAutoPlaying || !currentItem) return;
    setCountdown(8);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handlePlay();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, currentIndex, currentItem]);

  const handleShuffle = () => {
    setCurrentIndex(Math.floor(Math.random() * Math.max(shuffled.length, 1)));
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Image */}
        {currentItem && (
          <motion.div
            key={currentItem.subjectId}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.3, scale: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 h-[85vh]"
          >
            <img
              src={getOptimizedImageUrl(currentItem.coverUrl || currentItem.cover?.url, 1200)}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
        <div className="absolute inset-0 h-[85vh] gradient-hero" />
        <div className="absolute inset-0 h-[85vh]" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, var(--rf-black) 100%)' }} />

        {/* Content */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-5 lg:px-10 pt-10 pb-20">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="w-9 h-9 rounded-xl glass-2 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                  <Radio size={24} className="text-[var(--rf-red)]" />
                  RUN Mode
                </h1>
                <p className="text-xs text-[var(--rf-text-dim)] mt-0.5">Non-stop curated entertainment</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAutoPlaying && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--rf-red)]/10 border border-[var(--rf-red)]/20">
                  <div className="w-2 h-2 rounded-full bg-[var(--rf-red)] animate-pulse" />
                  <span className="text-[10px] font-bold text-[var(--rf-red)] uppercase tracking-wider">Live</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Channel Selector */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 mb-10"
          >
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => { setActiveChannel(ch); setCurrentIndex(0); }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0',
                  activeChannel.id === ch.id
                    ? `bg-gradient-to-r ${ch.color} ${ch.accent} border border-current/20 scale-105 shadow-lg`
                    : 'glass text-[var(--rf-text-muted)] hover:bg-white/5'
                )}
              >
                {ch.name}
              </button>
            ))}
          </motion.div>

          {/* Now Playing Card */}
          <AnimatePresence mode="wait">
            {currentItem && (
              <motion.div
                key={currentItem.subjectId}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
                className="grid md:grid-cols-2 gap-8 md:gap-12 items-center"
              >
                {/* Info */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-[9px] font-bold text-[var(--rf-text-muted)] uppercase tracking-wider">
                      Now Playing
                    </span>
                    {currentItem.imdbRatingValue > 0 && (
                      <span className="px-2 py-1 rounded-lg bg-[var(--rf-gold)]/10 text-[10px] font-bold text-[var(--rf-gold)] flex items-center gap-1">
                        ★ {Number(currentItem.imdbRatingValue).toFixed(1)}
                      </span>
                    )}
                  </div>

                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                    {currentItem.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    {currentItem.releaseDate && (
                      <span className="text-xs text-[var(--rf-text-muted)]">{currentItem.releaseDate.substring(0, 4)}</span>
                    )}
                    {currentItem.genre && (
                      <span className="text-xs text-[var(--rf-text-dim)]">{currentItem.genre.split(',').slice(0, 3).map((g: string) => g.trim()).join(' • ')}</span>
                    )}
                    <span className="text-xs text-[var(--rf-text-dim)]">
                      {currentItem.subjectType === 2 ? '📺 Series' : '🎬 Movie'}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--rf-text-muted)] leading-relaxed mb-8 line-clamp-3 max-w-lg">
                    {currentItem.description || 'Stream this title now in premium quality on RUNFlix.'}
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handlePlay}
                      className="btn-primary text-sm px-8 py-4 flex items-center gap-2"
                    >
                      <Play size={18} className="fill-current" />
                      Watch Now
                      {isAutoPlaying && countdown > 0 && (
                        <span className="ml-1 text-xs opacity-70">({countdown}s)</span>
                      )}
                    </button>

                    <button
                      onClick={handleNext}
                      className="btn-glass text-sm px-5 py-4 flex items-center gap-2"
                    >
                      <SkipForward size={16} />
                      Skip
                    </button>

                    <button
                      onClick={handleShuffle}
                      className="w-12 h-12 rounded-xl glass-2 flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                      title="Shuffle"
                    >
                      <Shuffle size={18} />
                    </button>

                    <button
                      onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                        isAutoPlaying
                          ? 'bg-[var(--rf-red)]/10 text-[var(--rf-red)] border border-[var(--rf-red)]/20'
                          : 'glass-2 hover:bg-white/[0.08]'
                      )}
                      title={isAutoPlaying ? 'Stop Autoplay' : 'Start Autoplay'}
                    >
                      {isAutoPlaying ? <Pause size={18} /> : <Zap size={18} />}
                    </button>
                  </div>
                </div>

                {/* Cover Art */}
                <div className="flex justify-center md:justify-end">
                  <div className="relative">
                    <img
                      src={getOptimizedImageUrl(currentItem.coverUrl || currentItem.cover?.url, 400)}
                      alt={currentItem.title}
                      referrerPolicy="no-referrer"
                      className="w-[240px] sm:w-[280px] rounded-2xl shadow-2xl border border-white/[0.06] object-cover aspect-[2/3]"
                    />
                    {/* Glow */}
                    <div className="absolute -inset-4 bg-[var(--rf-red)]/5 blur-[40px] rounded-3xl pointer-events-none -z-10" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Up Next */}
          {shuffled.length > 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-16"
            >
              <h3 className="text-xs font-bold text-[var(--rf-text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Tv size={13} />
                Up Next on {activeChannel.name}
              </h3>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-4">
                {shuffled.slice(currentIndex + 1, currentIndex + 9).map((item, i) => (
                  <button
                    key={`${item.subjectId}-${i}`}
                    onClick={() => setCurrentIndex(currentIndex + 1 + i)}
                    className="shrink-0 w-[130px] group"
                  >
                    <div className="aspect-[2/3] rounded-xl overflow-hidden border border-white/[0.04] group-hover:border-[var(--rf-red)]/30 transition-all mb-2">
                      <img
                        src={getOptimizedImageUrl(item.coverUrl || item.cover?.url, 200)}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-[10px] font-bold text-[var(--rf-text-muted)] group-hover:text-white transition-colors line-clamp-2">
                      {item.title}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {shuffled.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl glass-2 flex items-center justify-center mx-auto mb-4">
                <Radio size={28} className="text-[var(--rf-text-dim)]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Content Available</h3>
              <p className="text-sm text-[var(--rf-text-dim)]">
                This channel doesn't have enough content yet. Try another channel!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
