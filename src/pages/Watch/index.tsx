import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useMovieInfo, useMovieSources } from '../MovieDetails/hooks/useMovieQueries';
import { getTitleOgImage } from '../../utils/seo';

const CinematicPlayer = lazy(() => import('../../components/player/CinematicPlayer'));
import { DetailSkeleton } from '../../components/ui/Skeleton';
import { extractIdFromSlug } from '../../utils/slug';
import { useProgressStore } from '../../stores/useProgressStore';
import { useRecentlyViewedStore } from '../../stores/useRecentlyViewedStore';
import { useSEO } from '../../hooks/useSEO';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, List, AlertCircle, Play, Check, X, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getOptimizedImageUrl } from '../../utils/image';
import { EpisodeProgressLine } from '../../components/EpisodeProgressBar';

export default function Watch() {
  const { slug } = useParams<{ slug: string }>();
  const id = extractIdFromSlug(slug || '');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search parameters for Series
  const seasonParam = searchParams.get('s');
  const episodeParam = searchParams.get('e');

  const selectedSeason = seasonParam ? parseInt(seasonParam, 10) : 1;
  const selectedEpisode = episodeParam ? parseInt(episodeParam, 10) : 1;

  // Sidebar controls
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewingSeason, setViewingSeason] = useState<number>(selectedSeason);

  useEffect(() => {
    setViewingSeason(selectedSeason);
  }, [selectedSeason]);

  // Queries
  const { data: info, isLoading: infoLoading, error: infoError } = useMovieInfo(id);
  const isTvSeries = info?.subject?.subjectType === 2;
  const seasons = info?.resource?.seasons || [];

  const { data: sourcesData, isLoading: sourcesLoading, isError: sourcesHasError, error: sourcesError, refetch: refetchSources } = useMovieSources(
    id,
    true, // always enabled on the watch page
    isTvSeries,
    selectedSeason,
    selectedEpisode
  );

  const sources = sourcesData?.sources || [];
  const subtitles = sourcesData?.subtitles || [];

  // Stores
  const isEpisodeComplete = useProgressStore((s) => s.isEpisodeComplete);
  const addRecentItem = useRecentlyViewedStore((s) => s.addItem);

  // Track recently viewed when starting playback
  useEffect(() => {
    if (info?.subject) {
      addRecentItem({
        subjectId: info.subject.subjectId || id,
        title: info.subject.title,
        coverUrl: info.subject.cover?.url,
        subjectType: info.subject.subjectType,
        imdbRatingValue: info.subject.imdbRatingValue,
        releaseDate: info.subject.releaseDate,
      });
    }
  }, [info?.subject, id, addRecentItem]);

  // Dynamic JSON-LD structured schema for Google Search Console indexing
  const seoSchema = useMemo(() => {
    if (!info?.subject) return undefined;
    const title = info.subject.title;
    const desc = info.subject.description || 'Instant premium cinema playback.';
    const img = getTitleOgImage(info.subject);

    if (isTvSeries) {
      return {
        "@context": "https://schema.org",
        "@type": "TVEpisode",
        "name": `${title} Season ${selectedSeason} Episode ${selectedEpisode}`,
        "episodeNumber": selectedEpisode,
        "partOfSeason": {
          "@type": "TVSeason",
          "seasonNumber": selectedSeason
        },
        "partOfSeries": {
          "@type": "TVSeries",
          "name": title
        },
        "description": desc,
        "image": img
      };
    }

    return {
      "@context": "https://schema.org",
      "@type": "Movie",
      "name": title,
      "description": desc,
      "image": img
    };
  }, [info?.subject, isTvSeries, selectedSeason, selectedEpisode]);

  // Auto SEO
  useSEO({
    title: info?.subject?.title
      ? `Streaming: ${info.subject.title}${isTvSeries ? ` S${selectedSeason}E${selectedEpisode}` : ''}`
      : 'Watch Stream',
    description: info?.subject?.description || 'Instant premium cinema playback.',
    image: info?.subject ? getTitleOgImage(info.subject) : undefined,
    type: 'video.other',
    schema: seoSchema,
  });

  // Switch Season/Episode in URL search params
  const handleEpisodeSelect = (season: number, episode: number) => {
    setSearchParams({ s: String(season), e: String(episode) });
  };

  // Find total episodes of currently viewed season in the sidebar
  const activeSeasonData = seasons.find((s) => s.se === viewingSeason);
  const maxEp = activeSeasonData?.maxEp || 0;
  const episodeNumbers = Array.from({ length: maxEp }, (_, i) => i + 1);

  if (infoLoading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 py-20">
        <DetailSkeleton />
      </div>
    );
  }

  if (infoError || !info?.subject) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <AlertCircle className="text-[var(--rf-red)] mb-4" size={48} />
        <h2 className="text-xl font-bold text-white mb-2">Failed to load stream info</h2>
        <p className="text-sm text-[var(--rf-text-muted)] max-w-sm mb-6">
          We couldn't connect to our source APIs. Please try going back or refreshing.
        </p>
        <motion.div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-primary px-6 py-3">
            Go Back
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-glass px-6 py-3"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  const { subject } = info;
  const coverUrl = subject.cover?.url || info.metadata?.image;
  const backdropUrl = subject.stills?.url || coverUrl;

  return (
    <div className="w-full h-screen lg:h-auto lg:min-h-screen bg-black lg:bg-[var(--rf-black)] overflow-hidden lg:overflow-visible relative flex flex-col lg:py-8">
      <div className="w-full h-full lg:h-auto lg:max-w-[1600px] lg:mx-auto lg:px-6 sm:lg:px-10 md:lg:px-16 lg:lg:px-20 xl:lg:px-28 flex flex-col">
        
        {/* Navigation Header - hidden on mobile watch screen (overlaid instead), visible on desktop */}
        <div className="hidden lg:flex justify-between items-center mb-6">
          <button
            onClick={() => navigate(`/movie/${slug}`)}
            className="flex items-center gap-2 text-sm text-[var(--rf-text-muted)] hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Info</span>
          </button>
          
          {isTvSeries && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                "btn-glass px-4 py-2 text-xs flex items-center gap-2 transition-all",
                sidebarOpen && "bg-white/10 text-white"
              )}
            >
              <List size={14} />
              <span>{sidebarOpen ? 'Hide Sidebar' : 'Show Episodes'}</span>
            </button>
          )}
        </div>

        {/* Streaming Work Area */}
        <div className="flex flex-col lg:flex-row gap-6 items-start flex-1 h-full lg:h-auto relative z-10">
          
          {/* Main player column */}
          <div className="flex-1 w-full h-full lg:h-auto flex flex-col">
            {sourcesLoading ? (
              <div className="w-full h-full lg:h-[65vh] bg-black lg:bg-white/[0.02] lg:border lg:border-white/[0.08] lg:rounded-3xl flex flex-col items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-10 h-10 border-4 border-[var(--rf-red)] border-t-transparent rounded-full mb-4"
                />
                <p className="text-xs text-[var(--rf-text-muted)]">Negotiating high-speed streaming links...</p>
              </div>
            ) : sources.length > 0 ? (
              <div className="w-full h-full lg:h-auto lg:rounded-3xl lg:overflow-hidden lg:shadow-2xl lg:border lg:border-white/[0.05]">
                <Suspense fallback={<DetailSkeleton />}>
                <CinematicPlayer
                  sources={sources}
                  subtitles={subtitles}
                  title={`${subject.title}${isTvSeries ? ` - S${selectedSeason}E${selectedEpisode}` : ''}`}
                  backdropUrl={backdropUrl}
                  stars={info?.stars || []}
                  hasNextEpisode={isTvSeries && selectedEpisode < maxEp}
                  onNextEpisode={() => {
                    handleEpisodeSelect(selectedSeason, selectedEpisode + 1);
                  }}
                  hasPrevEpisode={isTvSeries && selectedEpisode > 1}
                  onPrevEpisode={() => {
                    handleEpisodeSelect(selectedSeason, selectedEpisode - 1);
                  }}
                  subjectId={subject.subjectId}
                  season={selectedSeason}
                  episode={selectedEpisode}
                  className="h-[100dvh] lg:h-[75vh] rounded-none lg:rounded-3xl border-none lg:border lg:border-white/[0.08]"
                  onBack={() => navigate(`/movie/${slug}`)}
                  onShowEpisodes={isTvSeries ? () => setSidebarOpen(!sidebarOpen) : undefined}
                  seasons={seasons}
                  onEpisodeSelect={handleEpisodeSelect}
                />
                </Suspense>
              </div>
            ) : sourcesHasError ? (
              <div className="w-full h-full lg:h-[65vh] bg-black lg:bg-white/[0.02] lg:border lg:border-white/[0.08] lg:rounded-3xl flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="text-[var(--rf-red)] mb-4" size={40} />
                <h4 className="text-base font-bold text-white mb-2">API Connection Failure (500/403)</h4>
                <p className="text-xs text-[var(--rf-text-dim)] max-w-sm mb-6 leading-relaxed">
                  We encountered an error connecting to the streaming provider. Your API key might be expired, invalid, or blocked. Please verify your <code className="bg-white/10 px-1 py-0.5 rounded text-[var(--rf-red)] font-mono text-[10px]">VITE_API_KEY</code>.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void refetchSources()}
                    className="btn-glass text-xs px-5 py-2.5"
                  >
                    Retry Connection
                  </button>
                  <button
                    onClick={() => navigate(`/movie/${slug}`)}
                    className="btn-primary text-xs px-6 py-2.5"
                  >
                    Details & Downloads
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full h-full lg:h-[65vh] bg-black lg:bg-white/[0.02] lg:border lg:border-white/[0.08] lg:rounded-3xl flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="text-[var(--rf-red)] mb-4" size={40} />
                <h4 className="text-base font-bold text-white mb-2">No Streaming Sources Found</h4>
                <p className="text-xs text-[var(--rf-text-dim)] max-w-sm mb-6">
                  We couldn't find any streamable video files for this title. You can still try the download mirror in details.
                </p>
                <button
                  onClick={() => navigate(`/movie/${slug}`)}
                  className="btn-primary text-xs px-6 py-2.5"
                >
                  Open Download Mirror
                </button>
              </div>
            )}

            {/* Stream info below video - HIDDEN on Mobile watch screen, visible on Desktop */}
            <div className="hidden lg:block mt-6 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-1.5">{subject.title}</h1>
              {isTvSeries && (
                <div className="text-sm font-bold text-[var(--rf-red)] mb-4 uppercase tracking-wider">
                  Season {selectedSeason} • Episode {selectedEpisode}
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 mb-4">
                {subject.genre?.split(',').map((g) => (
                  <span key={g} className="text-[10px] font-bold bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-white/70">
                    {g.trim()}
                  </span>
                ))}
                {subject.releaseDate && (
                  <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-white/50">
                    {new Date(subject.releaseDate).getFullYear()}
                  </span>
                )}
                {subject.imdbRatingValue && (
                  <span className="text-[10px] font-bold bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full text-yellow-400">
                    ⭐ {subject.imdbRatingValue}
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-[var(--rf-text-muted)] leading-relaxed">
                {subject.description || info.metadata?.description || 'No description available for this title.'}
              </p>
            </div>

            {/* X-Ray panel below info - HIDDEN on Mobile watch screen, visible on Desktop */}
            {info?.stars && info.stars.length > 0 && (
              <div className="hidden lg:flex mt-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex-col gap-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-[var(--rf-red)] animate-pulse" size={14} />
                    <span className="text-[10px] font-black uppercase text-white tracking-widest">Runflix Entertainment X-RAY • Cast In Scene</span>
                  </div>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide snap-x">
                  {info.stars.slice(0, 12).map((star: any, idx: number) => (
                    <div
                      key={`${star.staffId}-${idx}`}
                      className="flex flex-col items-center gap-1.5 text-center shrink-0 w-16 snap-center group cursor-pointer"
                    >
                      <div className="relative w-11 h-11 rounded-full overflow-hidden border border-white/10 group-hover:border-[var(--rf-red)]/50 transition-all duration-300">
                        {star.avatarUrl ? (
                          <img
                            src={getOptimizedImageUrl(star.avatarUrl, 100)}
                            alt={star.name}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(star.name)}&background=1a1a2e&color=e8e8ed&size=64&font-size=0.35&bold=true`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/60">
                            {star.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="w-full">
                        <p className="text-[9px] font-bold text-white truncate w-full" title={star.name}>
                          {star.name.split(' ')[0]}
                        </p>
                        {star.character && (
                          <p className="text-[8px] text-white/40 truncate w-full" title={star.character}>
                            as {star.character.split(' ')[0]}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Backdrop Overlay when sidebar is open */}
          {isTvSeries && sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 cursor-pointer pointer-events-auto select-none lg:hidden"
            />
          )}

          {/* Sliding sidebar container for Episodes - Desktop only */}
          {isTvSeries && sidebarOpen && (
            <div className={cn(
              "hidden lg:flex lg:relative lg:w-80 lg:h-auto lg:bg-white/[0.02] lg:border lg:border-white/[0.05] lg:rounded-3xl lg:max-h-[85vh] lg:p-5 lg:flex-col lg:gap-4 lg:overflow-y-auto lg:translate-x-0"
            )}>
              {/* Header controls */}
              <div className="flex items-center justify-between lg:hidden border-b border-white/5 pb-3 mb-1">
                <span className="text-xs font-black text-[var(--rf-red)] uppercase tracking-wider">Episodes Menu</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60 hover:text-white"
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>
              
              {/* Season Selection Switcher */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--rf-text-dim)] mb-1.5 uppercase tracking-wider">
                  Select Season to View
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {seasons
                    .filter((s) => s.se > 0)
                    .map((s) => (
                      <button
                        key={s.se}
                        onClick={() => setViewingSeason(s.se)}
                        className={cn(
                          "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex-1 text-center min-w-[70px]",
                          viewingSeason === s.se
                            ? "bg-[var(--rf-red)] border-none text-white shadow-lg shadow-[var(--rf-red)]/20"
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-white/60"
                        )}
                      >
                        S{s.se}
                      </button>
                    ))}
                </div>
              </div>

              <div className="border-t border-white/5 my-1"></div>

              {/* Episodes List/Grid */}
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 scrollbar-hide">
                <span className="text-[10px] font-bold text-[var(--rf-text-dim)] uppercase tracking-wider mb-1 block">
                  Episodes in Season {viewingSeason}
                </span>
                
                <div className="space-y-1.5 pb-6">
                  {episodeNumbers.map((ep) => {
                    const isCurrent = ep === selectedEpisode && viewingSeason === selectedSeason;
                    const isCompleted = subject.subjectId && isEpisodeComplete(subject.subjectId, viewingSeason, ep);
                    const epTitle = `${subject.title} - S${viewingSeason}E${ep}`;

                    return (
                      <button
                        key={`s${viewingSeason}-e${ep}`}
                        onClick={() => {
                          handleEpisodeSelect(viewingSeason, ep);
                          // Close sidebar automatically only on mobile screens
                          if (window.innerWidth < 1024) {
                            setSidebarOpen(false);
                          }
                        }}
                        className={cn(
                          "w-full text-left p-2.5 rounded-2xl border transition-all duration-300 flex gap-3 relative overflow-hidden group",
                          isCurrent
                            ? "bg-white/[0.04] border-[var(--rf-red)]/40 shadow-lg shadow-[var(--rf-red)]/5"
                            : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.03]"
                        )}
                      >
                        {/* 16:9 Mini Backdrop Thumbnail */}
                        <div className="relative w-24 aspect-[16/9] rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10">
                          <img
                            src={getOptimizedImageUrl(backdropUrl || coverUrl, 250)}
                            alt=""
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            {isCurrent ? (
                              <div className="flex gap-0.5 items-end justify-center h-4 w-6">
                                <span className="w-1 bg-[var(--rf-red)] animate-[pulse_0.8s_infinite_alternate] h-2"></span>
                                <span className="w-1 bg-[var(--rf-red)] animate-[pulse_0.6s_infinite_alternate] h-4"></span>
                                <span className="w-1 bg-[var(--rf-red)] animate-[pulse_0.7s_infinite_alternate] h-3"></span>
                              </div>
                            ) : (
                              <span className="text-white/80 font-black text-sm">{ep}</span>
                            )}
                          </div>
                          
                          {/* Watched complete indicator */}
                          {isCompleted && (
                             <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white shadow-md">
                               <Check size={9} strokeWidth={3} />
                             </div>
                          )}
                        </div>

                        {/* Text details */}
                        <div className="flex flex-col justify-between py-0.5 flex-1 min-w-0">
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={cn(
                                "text-[11px] font-black tracking-wider uppercase",
                                isCurrent ? "text-[var(--rf-red)]" : "text-white/60"
                              )}>
                                Episode {ep}
                              </span>
                            </div>
                            <h5 className={cn(
                              "text-xs truncate",
                              isCurrent ? "font-bold text-white" : "text-white/80"
                            )}>
                              {subject.title} S{viewingSeason}E{ep}
                            </h5>
                          </div>

                          <EpisodeProgressLine episodeTitle={epTitle} isCompleted={!!isCompleted} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
