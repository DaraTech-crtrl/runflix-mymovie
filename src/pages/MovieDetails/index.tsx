import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMovieInfo, useMovieSources } from './hooks/useMovieQueries';
import { useBatchDownloads } from './hooks/useBatchDownloads';
import { MovieHero } from './components/MovieHero';
import { CastCarousel } from './components/CastCarousel';
import { MovieFactsAndGallery } from './components/MovieFactsAndGallery';
import AITrivia from '../../components/AITrivia';
import { SimilarMovies } from './components/SimilarMovies';
import { DownloadModal } from './components/DownloadModal';
import { DetailSkeleton } from '../../components/ui/Skeleton';
import { extractIdFromSlug } from '../../utils/slug';
import { useProgressStore } from '../../stores/useProgressStore';
import { useSEO } from '../../hooks/useSEO';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ChevronLeft, ChevronDown, Play } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getOptimizedImageUrl } from '../../utils/image';
import { getTitleOgImage } from '../../utils/seo';
import { EpisodeProgressBar } from '../../components/EpisodeProgressBar';

export default function MovieDetails() {
  const { slug } = useParams<{ slug: string }>();
  const id = extractIdFromSlug(slug || '');
  const navigate = useNavigate();

  // State
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(0);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [downloadMode, setDownloadMode] = useState<'single' | 'batch'>('single');

  const getProgress = useProgressStore((s) => s.getProgress);
  const isEpisodeComplete = useProgressStore((s) => s.isEpisodeComplete);

  // Queries
  const { data: info, isLoading, error } = useMovieInfo(id);
  const isTvSeries = info?.subject?.subjectType === 2;
  const seasons = useMemo(() => info?.resource?.seasons || [], [info?.resource?.seasons]);

  const { data: sourcesData, isLoading: sourcesLoading } = useMovieSources(
    id,
    downloadModalOpen,
    isTvSeries,
    selectedSeason,
    selectedEpisode
  );

  const sources = sourcesData?.sources || [];
  const subtitles = sourcesData?.subtitles || [];

  // Batch downloads
  const {
    batchResults,
    batchLoading,
    fetchBatch,
    startBatchDownload,
    startBatchSubtitleDownload,
    resetBatch,
  } = useBatchDownloads(id, isTvSeries, selectedSeason, info?.subject?.title || '');

  // Dynamic JSON-LD structured schema for Google Search Console indexing
  const seoSchema = useMemo(() => {
    if (!info?.subject) return undefined;
    const title = info.subject.title;
    const desc = info.subject.description || info.metadata?.description || '';
    const img = info.subject.cover?.url || info.metadata?.image || '';
    const rating = info.subject.imdbRatingValue;
    const release = info.subject.releaseDate;

    return {
      "@context": "https://schema.org",
      "@type": isTvSeries ? "TVSeries" : "Movie",
      "name": title,
      "description": desc,
      "image": img,
      ...(rating ? {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": rating,
          "bestRating": "10",
          "worstRating": "1",
          "ratingCount": 1500
        }
      } : {}),
      ...(release ? { "dateCreated": release, "datePublished": release } : {})
    };
  }, [info?.subject, isTvSeries]);

  // Dynamic SEO
  useSEO({
    title: info?.subject?.title,
    description: info?.subject?.description || info?.metadata?.description,
    image: info?.subject ? getTitleOgImage(info.subject) : undefined,
    type: isTvSeries ? 'video.tv_show' : 'video.movie',
    schema: seoSchema,
  });

  // Auto-select season/episode based on progress or default to first
  useEffect(() => {
    if (isTvSeries && seasons.length > 0 && selectedSeason === 0) {
      const prog = getProgress(String(id));
      if (prog) {
        setSelectedSeason(prog.lastSeason || 1);

        // If the episode is completed, we suggest playing the next one.
        // Otherwise, continue watching the current episode.
        const isCompleted = isEpisodeComplete(String(id), prog.lastSeason || 1, prog.lastEpisode);
        const currentSeason = seasons.find((s) => s.se === prog.lastSeason);

        if (isCompleted && currentSeason && prog.lastEpisode < currentSeason.maxEp) {
          setSelectedEpisode(prog.lastEpisode + 1);
        } else {
          setSelectedEpisode(prog.lastEpisode || 1);
        }
      } else {
        const firstSeason = seasons.find((s) => s.se > 0);
        if (firstSeason) setSelectedSeason(firstSeason.se);
      }
    }
  }, [isTvSeries, seasons, selectedSeason, id, getProgress, isEpisodeComplete]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const handleCloseModal = () => {
    setDownloadModalOpen(false);
    setDownloadMode('single');
    resetBatch();
  };

  const handleModeChange = (mode: 'single' | 'batch') => {
    setDownloadMode(mode);
    if (mode === 'single') {
      resetBatch();
    } else if (mode === 'batch' && isTvSeries && selectedSeason > 0) {
      // Auto-fetch batch links when switching to batch mode
      const season = seasons.find((s: any) => s.se === selectedSeason);
      if (season?.maxEp) fetchBatch(season.maxEp);
    }
  };

  // Loading
  if (isLoading) {
    return <DetailSkeleton />;
  }

  // Error
  if (error || !info?.subject) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-2xl glass-2 flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-[var(--rf-red)]" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Content Not Found</h2>
          <p className="text-sm text-[var(--rf-text-muted)] mb-6">
            {error ? String((error as any)?.message) : 'This content could not be loaded. It may have been removed or is temporarily unavailable.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn-glass px-6 py-3 text-sm"
            >
              <ChevronLeft size={16} />
              Go Back
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-primary px-6 py-3 text-sm"
            >
              Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const { subject, stars, metadata } = info;
  const coverUrl = subject.cover?.url || metadata?.image;
  const backdropUrl = subject.stills?.url || coverUrl;

  const prog = getProgress(subject?.subjectId || id || '');
  const hasSeriesProgress = isTvSeries && prog;
  const hasMovieProgress = !isTvSeries && prog && prog.lastTime && prog.duration && prog.lastTime > 5 && prog.lastTime < prog.duration - 15;

  const playLabel = hasSeriesProgress
    ? `Continue S${selectedSeason}E${selectedEpisode}`
    : hasMovieProgress
      ? 'Continue Watching'
      : 'Watch Now';

  return (
    <div className="min-h-screen relative -mt-[72px]">
      {/* ============ CINEMATIC BACKDROP ============ */}
      <div className="absolute inset-0 h-[70vh] overflow-hidden">
        <motion.img
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.35, scale: 1 }}
          transition={{ duration: 1.5 }}
          src={getOptimizedImageUrl(backdropUrl, 1200)}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          aria-hidden="true"
        />
        <div className="gradient-hero absolute inset-0" />
        <div className="absolute inset-0 gradient-hero-side hidden md:block" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, var(--rf-black) 100%)' }} />
      </div>

      {/* Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[var(--rf-red)]/[0.04] blur-[120px] rounded-full pointer-events-none" />

      {/* ============ CONTENT ============ */}
      <div className="relative z-10">
        <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 pt-[100px] md:pt-[140px] pb-12 md:pb-20">
          <MovieHero
            subject={subject}
            metadata={metadata}
            coverUrl={coverUrl}
            isTvSeries={isTvSeries}
            seasons={seasons}
            onOpenDownload={() => setDownloadModalOpen(true)}
            onOpenPlay={() => {
              if (isTvSeries) {
                const s = selectedSeason > 0 ? selectedSeason : 1;
                const e = selectedEpisode > 0 ? selectedEpisode : 1;
                navigate(`/watch/${slug}?s=${s}&e=${e}`);
              } else {
                navigate(`/watch/${slug}`);
              }
            }}
            playLabel={playLabel}
          />

          <CastCarousel stars={stars} movieTitle={subject.title} />

          <AITrivia title={subject.title} />

          <MovieFactsAndGallery subject={subject} coverUrl={coverUrl} backdropUrl={backdropUrl} />

          {/* Premium Episodes Section for Series */}
          {isTvSeries && seasons.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 md:mt-16 bg-white/[0.01] border border-white/[0.04] p-6 md:p-8 rounded-3xl backdrop-blur-md"
            >
              <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                <Play size={14} className="text-[var(--rf-red)] fill-current" />
                <span className="uppercase tracking-wider text-xs">Episodes Hub</span>
              </h3>

              {/* Seasons Dropdown Selector */}
              <div className="mb-6 max-w-[180px] sm:max-w-xs">
                <label className="block text-[9px] sm:text-[10px] font-bold text-[var(--rf-text-dim)] mb-1.5 uppercase tracking-wider">
                  Select Season
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2 sm:p-3 pr-8 sm:pr-10 text-white text-[11px] sm:text-xs font-bold appearance-none focus:border-[var(--rf-red)]/50 outline-none transition-all cursor-pointer hover:bg-white/[0.08]"
                    value={selectedSeason}
                    onChange={(e) => {
                      setSelectedSeason(Number(e.target.value));
                      setSelectedEpisode(1);
                    }}
                    aria-label="Select Season"
                  >
                    {seasons
                      .filter((s) => s.se > 0)
                      .map((s) => (
                        <option key={`season-${s.se}`} value={s.se} className="bg-[var(--rf-surface)] text-white font-bold">
                          Season {s.se} ({s.maxEp} Episodes)
                        </option>
                      ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--rf-text-dim)] pointer-events-none" />
                </div>
              </div>

              {/* Premium Episodes Movie Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {Array.from(
                  { length: seasons.find((s) => s.se === selectedSeason)?.maxEp || 0 },
                  (_, i) => i + 1
                ).map((ep) => {
                  const isCompleted = subject.subjectId && isEpisodeComplete(subject.subjectId, selectedSeason, ep);
                  const epTitle = `${subject.title} - S${selectedSeason}E${ep}`;

                  return (
                    <div
                      key={`s${selectedSeason}-e${ep}`}
                      onClick={() => navigate(`/watch/${slug}?s=${selectedSeason}&e=${ep}`)}
                      className="group cursor-pointer relative bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden hover:border-[var(--rf-red)]/30 transition-colors duration-200 flex flex-col"
                    >
                      {/* Thumbnail Cover */}
                      <div className="relative aspect-video w-full bg-white/5 overflow-hidden">
                        <img
                          src={getOptimizedImageUrl(backdropUrl || coverUrl, 250)}
                          alt={`Episode ${ep}`}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-10 h-10 rounded-full bg-[var(--rf-red)] flex items-center justify-center text-white shadow-lg shadow-[var(--rf-red)]/40 scale-75 group-hover:scale-100 transition-transform duration-300">
                            <Play size={16} className="fill-current ml-0.5" />
                          </div>
                        </div>

                        {/* Episode Number badge */}
                        <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md text-white/90 border border-white/10">
                          EP {ep}
                        </span>

                        <EpisodeProgressBar episodeTitle={epTitle} isCompleted={!!isCompleted} />
                      </div>

                      {/* Text Metadata */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-[var(--rf-red)] transition-colors line-clamp-1">
                            Episode {ep}
                          </h4>
                          <p className="text-[10px] text-[var(--rf-text-muted)] mt-0.5 uppercase tracking-wider">
                            Season {selectedSeason}
                          </p>
                        </div>
                        {isCompleted && (
                          <div className="mt-2 text-[9px] font-bold text-green-400 flex items-center gap-1">
                            ✓ Watched
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Similar Movies */}
          <SimilarMovies
            currentId={id}
            genre={subject.genre}
            subjectType={subject.subjectType}
            countryName={subject.countryName}
          />
        </div>
      </div>

      {/* ============ DOWNLOAD MODAL ============ */}
      <DownloadModal
        isOpen={downloadModalOpen}
        onClose={handleCloseModal}
        subject={subject}
        isTvSeries={isTvSeries}
        seasons={seasons}
        selectedSeason={selectedSeason}
        selectedEpisode={selectedEpisode}
        downloadMode={downloadMode}
        sources={sources}
        subtitles={subtitles}
        sourcesLoading={sourcesLoading}
        batchResults={batchResults}
        batchLoading={batchLoading}
        onSeasonChange={(s) => {
          setSelectedSeason(s);
          setSelectedEpisode(1);
          resetBatch();
          // Auto-fetch if in batch mode
          if (downloadMode === 'batch') {
            const season = seasons.find((se: any) => se.se === s);
            if (season?.maxEp) {
              setTimeout(() => fetchBatch(season.maxEp), 100);
            }
          }
        }}
        onEpisodeChange={setSelectedEpisode}
        onModeChange={handleModeChange}
        onFetchBatch={() => {
          const season = seasons.find((s) => s.se === selectedSeason);
          fetchBatch(season?.maxEp || 0);
        }}
        onDownloadBatchAll={startBatchDownload}
        onDownloadBatchAllSubtitles={startBatchSubtitleDownload}
      />
    </div>
  );
}
