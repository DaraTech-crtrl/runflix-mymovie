import { memo, useState, useMemo } from 'react';
import { Download, CheckCircle2, XCircle, Globe, Loader2, Monitor } from 'lucide-react';
import { BatchEpisodeResult, SourceItem } from '../types';
import { SourceCard } from './SourceCard';
import { useDownloadStore } from '../hooks/useDownloadStore';
import { downloadSubtitle } from '../../../utils/download';

interface BatchDownloadsProps {
  batchResults: BatchEpisodeResult[];
  title: string;
  selectedSeason: number;
  onDownloadAll: (preferredQuality?: string) => void;
  onDownloadAllSubtitles: (language?: string) => void;
  onDownloadSingle: (src: SourceItem, downloadId: string, episode: number) => void;
}

export const BatchDownloads = memo(({
  batchResults,
  title,
  selectedSeason,
  onDownloadAll,
  onDownloadAllSubtitles,
  onDownloadSingle,
}: BatchDownloadsProps) => {
  const setProgress = useDownloadStore((state) => state.setProgress);
  const addToHistory = useDownloadStore((state) => state.addToHistory);
  const activeDownloads = useDownloadStore((state) => state.activeDownloads);

  const [selectedQuality, setSelectedQuality] = useState<string>('');
  const [selectedSubLang, setSelectedSubLang] = useState<string>('');

  if (batchResults.length === 0) return null;

  const availableCount = batchResults.filter((r) => r.sources.length > 0).length;
  const subtitleCount = batchResults.filter((r) => r.subtitles && r.subtitles.length > 0).length;

  // Collect all unique qualities, sorted highest first
  const allQualities = useMemo(() => {
    const set = new Set<string>();
    batchResults.forEach((ep) => ep.sources.forEach((s) => { if (s.quality) set.add(s.quality); }));
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numB - numA;
    });
  }, [batchResults]);

  // Collect all unique subtitle languages
  const allLanguages = useMemo(() => {
    return Array.from(new Set(
      batchResults.flatMap((ep) => ep.subtitles?.map((s: any) => s.lanName) || []).filter(Boolean)
    ));
  }, [batchResults]);

  const activeQuality = selectedQuality || allQualities[0] || '';
  const activeSubLang = selectedSubLang || allLanguages[0] || '';

  const qualityAvailability = useMemo(() => {
    if (!activeQuality) return 0;
    return batchResults.filter((ep) =>
      ep.sources.some((s) => s.quality?.toLowerCase() === activeQuality.toLowerCase())
    ).length;
  }, [batchResults, activeQuality]);

  const subLangAvailability = useMemo(() => {
    if (!activeSubLang) return 0;
    return batchResults.filter((ep) =>
      ep.subtitles?.some((s: any) => s.lanName === activeSubLang)
    ).length;
  }, [batchResults, activeSubLang]);

  return (
    <div className="space-y-2.5">
      {/* Stats */}
      <div className="text-xs text-[var(--rf-text-dim)] font-medium">
        {availableCount}/{batchResults.length} episodes
        {subtitleCount > 0 && <span className="text-blue-400 ml-1">• {subtitleCount} with subs</span>}
      </div>

      {/* ============ QUALITY SELECTOR ============ */}
      {allQualities.length > 0 && (
        <div className="glass-2 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <Monitor size={12} className="text-[var(--rf-red)]" />
            <span className="text-[10px] font-bold text-[var(--rf-text-muted)] uppercase tracking-wider">Video Quality</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {allQualities.map((q) => {
              const isSelected = activeQuality === q;
              const epCount = batchResults.filter((ep) =>
                ep.sources.some((s) => s.quality?.toLowerCase() === q.toLowerCase())
              ).length;
              return (
                <button
                  key={q}
                  onClick={() => setSelectedQuality(q)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    isSelected
                      ? 'bg-[var(--rf-red)] text-white shadow-md shadow-[var(--rf-red)]/20'
                      : 'glass-2 text-[var(--rf-text-muted)] hover:text-white'
                  }`}
                >
                  {q}
                  <span className={`ml-1 text-[9px] ${isSelected ? 'text-white/60' : 'text-[var(--rf-text-dim)]'}`}>
                    {epCount}/{availableCount}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onDownloadAll(activeQuality || undefined)}
            className="btn-primary px-4 py-2 text-xs w-full sm:w-auto"
          >
            <Download size={13} />
            Download All Videos — {activeQuality}
          </button>
        </div>
      )}

      {/* ============ SUBTITLE LANGUAGE SELECTOR ============ */}
      {subtitleCount > 0 && allLanguages.length > 0 && (
        <div className="glass-2 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <Globe size={12} className="text-blue-400" />
            <span className="text-[10px] font-bold text-[var(--rf-text-muted)] uppercase tracking-wider">Subtitle Language</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {allLanguages.map((lang) => {
              const isSelected = activeSubLang === lang;
              const epCount = batchResults.filter((ep) =>
                ep.subtitles?.some((s: any) => s.lanName === lang)
              ).length;
              return (
                <button
                  key={lang}
                  onClick={() => setSelectedSubLang(lang)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    isSelected
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                      : 'glass-2 text-[var(--rf-text-muted)] hover:text-white'
                  }`}
                >
                  {lang}
                  <span className={`ml-1 text-[9px] ${isSelected ? 'text-white/60' : 'text-[var(--rf-text-dim)]'}`}>
                    {epCount}/{subtitleCount}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onDownloadAllSubtitles(activeSubLang || undefined)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded-xl text-xs font-bold transition-all w-full sm:w-auto justify-center sm:justify-start"
          >
            <Globe size={13} />
            Download All Subtitles — {activeSubLang}
          </button>
        </div>
      )}

      {/* ============ EPISODE LIST ============ */}
      {batchResults.map((ep) => (
        <BatchEpisodeCard
          key={`batch-ep-${ep.episode}`}
          ep={ep}
          title={title}
          selectedSeason={selectedSeason}
          filterQuality={activeQuality}
          onDownloadSingle={onDownloadSingle}
          setProgress={setProgress}
          addToHistory={addToHistory}
          activeDownloads={activeDownloads}
        />
      ))}
    </div>
  );
});

BatchDownloads.displayName = 'BatchDownloads';

/* ============ EPISODE CARD ============ */

interface BatchEpisodeCardProps {
  ep: BatchEpisodeResult;
  title: string;
  selectedSeason: number;
  filterQuality: string;
  onDownloadSingle: (src: SourceItem, downloadId: string, episode: number) => void;
  setProgress: (id: string, progress: number, isComplete?: boolean) => void;
  addToHistory: (item: { id: string; title: string; filename: string; quality?: string; type: 'movie' | 'subtitle'; url?: string }) => void;
  activeDownloads: Record<string, number>;
}

const BatchEpisodeCard = memo(({
  ep,
  title,
  selectedSeason,
  filterQuality,
  onDownloadSingle,
  setProgress,
  addToHistory,
  activeDownloads,
}: BatchEpisodeCardProps) => {
  const [showSubtitles, setShowSubtitles] = useState(false);
  const hasSubtitles = ep.subtitles && ep.subtitles.length > 0;
  const episodeLabel = `S${selectedSeason}E${ep.episode}`;

  // Filter sources to selected quality; fall back to all if none match
  const filteredSources = useMemo(() => {
    if (!filterQuality) return ep.sources;
    const matched = ep.sources.filter(
      (s) => s.quality?.toLowerCase() === filterQuality.toLowerCase()
    );
    return matched.length > 0 ? matched : ep.sources;
  }, [ep.sources, filterQuality]);

  const handleSubtitleDownload = (sub: any) => {
    const downloadId = `batch_sub_ep${ep.episode}_${sub.id || sub.lanName}`;
    addToHistory({ id: downloadId, title, filename: `${title} - ${episodeLabel} - ${sub.lanName}`, type: 'subtitle', url: sub.url });
    downloadSubtitle(sub.url, `${title}_${episodeLabel}`, sub.lanName, undefined, (p) => {
      setProgress(downloadId, p.progress, p.status === 'done' || p.status === 'error');
    });
  };

  return (
    <div className="glass-2 rounded-xl overflow-hidden">
      {/* Episode Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--rf-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--rf-red)]/10 flex items-center justify-center text-[var(--rf-red)] font-black text-[11px]">
            {ep.episode}
          </div>
          <span className="font-semibold text-white text-xs">Ep {ep.episode}</span>
          {hasSubtitles && (
            <span className="text-[9px] text-blue-400 font-medium">{ep.subtitles.length} sub{ep.subtitles.length > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {hasSubtitles && (
            <button
              onClick={() => setShowSubtitles(!showSubtitles)}
              className="p-1 rounded-md glass-2 text-blue-400 hover:bg-blue-500/10 transition-all"
              aria-label={showSubtitles ? 'Hide subtitles' : 'Show subtitles'}
            >
              <Globe size={12} />
            </button>
          )}
          {ep.sources.length > 0 ? (
            <CheckCircle2 size={14} className="text-green-400" />
          ) : (
            <XCircle size={14} className="text-[var(--rf-text-dim)]" />
          )}
        </div>
      </div>

      {/* Sources — filtered by selected quality */}
      {filteredSources.length > 0 ? (
        <div className="p-1.5 space-y-1">
          {filteredSources.map((src, si) => {
            const downloadId = `batch_ep${ep.episode}_${src.id || si}`;
            return (
              <SourceCard
                key={downloadId}
                src={src}
                downloadId={downloadId}
                title={title}
                episodeLabel={episodeLabel}
                onDownload={(source) => onDownloadSingle(source, downloadId, ep.episode)}
              />
            );
          })}
        </div>
      ) : (
        <div className="px-3 py-2 text-[11px] text-[var(--rf-text-dim)]">No sources available</div>
      )}

      {/* Subtitles */}
      {hasSubtitles && showSubtitles && (
        <div className="px-3 pb-2.5 border-t border-[var(--rf-border)] pt-2">
          <p className="text-[9px] font-bold text-[var(--rf-text-dim)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Globe size={9} /> Subtitles
          </p>
          <div className="flex flex-wrap gap-1">
            {ep.subtitles.map((sub: any, i: number) => {
              const downloadId = `batch_sub_ep${ep.episode}_${sub.id || i}`;
              const progress = activeDownloads[downloadId] || 0;
              const isDownloading = progress > 0;
              return (
                <button
                  key={downloadId}
                  onClick={() => handleSubtitleDownload(sub)}
                  className="px-2 py-1 glass-2 rounded-md text-[9px] font-medium text-[var(--rf-text-muted)] hover:text-blue-400 transition-all flex items-center gap-1 relative overflow-hidden active:scale-95"
                >
                  {isDownloading && <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" style={{ width: `${progress}%` }} />}
                  <span className="relative z-10">{sub.lanName}</span>
                  {isDownloading ? <Loader2 size={8} className="relative z-10 animate-spin text-blue-400" /> : <Download size={8} className="relative z-10 opacity-40" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

BatchEpisodeCard.displayName = 'BatchEpisodeCard';
