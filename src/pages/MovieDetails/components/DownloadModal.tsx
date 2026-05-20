import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  HardDriveDownload, Download, ListVideo, Loader2, X,
  Film, Tv, Star, Clock, ChevronDown, Zap,
  Globe, Monitor, FileVideo, Sparkles, Check,
  ArrowDownToLine, Package
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { Season, SourceItem, SubjectInfo, BatchEpisodeResult } from '../types';
import { useDownloadStore } from '../hooks/useDownloadStore';
import { downloadMovie, downloadSubtitle } from '../../../utils/download';
import { formatFileSize } from '../../../utils/format';
import { lockBodyScroll, unlockBodyScroll } from '../../../utils/scrollLock';
import { OptimizedImage } from '../../../components/ui/OptimizedImage';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: SubjectInfo;
  isTvSeries: boolean;
  seasons: Season[];
  selectedSeason: number;
  selectedEpisode: number;
  downloadMode: 'single' | 'batch';
  sources: SourceItem[];
  subtitles: any[];
  sourcesLoading: boolean;
  batchResults: BatchEpisodeResult[];
  batchLoading: boolean;
  onSeasonChange: (s: number) => void;
  onEpisodeChange: (e: number) => void;
  onModeChange: (m: 'single' | 'batch') => void;
  onFetchBatch: () => void;
  onDownloadBatchAll: (preferredQuality?: string) => void;
  onDownloadBatchAllSubtitles: (language?: string) => void;
}

/* ============ QUALITY CONFIG ============ */
const QUALITY_META: Record<string, { icon: string; color: string; label: string }> = {
  '4k': { icon: '✦', color: 'from-amber-400 to-orange-500', label: 'Ultra HD' },
  '2160p': { icon: '✦', color: 'from-amber-400 to-orange-500', label: 'Ultra HD' },
  '1080p': { icon: '⚡', color: 'from-blue-400 to-indigo-500', label: 'Full HD' },
  '720p': { icon: '●', color: 'from-emerald-400 to-teal-500', label: 'HD' },
  '480p': { icon: '○', color: 'from-slate-400 to-slate-500', label: 'SD' },
  '360p': { icon: '○', color: 'from-zinc-400 to-zinc-500', label: 'Low' },
};

function getQualityMeta(quality: string) {
  const q = quality?.toLowerCase() || '';
  return QUALITY_META[q] || { icon: '●', color: 'from-purple-400 to-purple-600', label: quality || 'HD' };
}

/* ============ PREFERRED QUALITY ============ */
const PREF_KEY = 'rf-preferred-quality';
function getPreferredQuality(): string | null { try { return localStorage.getItem(PREF_KEY); } catch { return null; } }
function setPreferredQuality(q: string) { try { localStorage.setItem(PREF_KEY, q); } catch { /* */ } }

/* ============ MAIN MODAL ============ */
export const DownloadModal = ({
  isOpen, onClose, subject, isTvSeries, seasons,
  selectedSeason, selectedEpisode, downloadMode,
  sources, subtitles, sourcesLoading,
  batchResults, batchLoading,
  onSeasonChange, onEpisodeChange, onModeChange,
  onFetchBatch, onDownloadBatchAll, onDownloadBatchAllSubtitles,
}: DownloadModalProps) => {
  const setProgress = useDownloadStore((state) => state.setProgress);
  const addToHistory = useDownloadStore((state) => state.addToHistory);
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'subtitle'>('video');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    lockBodyScroll();
    window.addEventListener('keydown', handleKeyDown);
    return () => { unlockBodyScroll(); window.removeEventListener('keydown', handleKeyDown); };
  }, [isOpen, onClose]);

  // Reset tab on open
  useEffect(() => { if (isOpen) setActiveTab('video'); }, [isOpen]);

  const handleSingleDownload = (src: SourceItem, downloadId: string, episodeLabel?: string) => {
    setPreferredQuality(src.quality || 'HD');
    addToHistory({
      id: downloadId, title: subject.title,
      filename: episodeLabel ? `${subject.title} - ${episodeLabel}` : subject.title,
      quality: src.quality || 'HD', type: 'movie',
      url: src.download_url || src.stream_url,
    });
    downloadMovie(
      src.download_url || src.stream_url, subject.title,
      src.quality || 'HD', src.format, episodeLabel,
      (p) => setProgress(downloadId, p.progress, p.status === 'done' || p.status === 'error')
    );
  };

  const coverUrl = subject.cover?.url || subject.stills?.url;
  const activeSeason = seasons.find((s) => s.se === selectedSeason);
  const maxEp = activeSeason?.maxEp || 10;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="relative z-[9999]" role="dialog" aria-modal="true" aria-labelledby="dl-modal-title">
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-xl"
          />

          {/* Modal Sheet */}
          <motion.div
            ref={modalRef}
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 32, stiffness: 300, mass: 0.8 }}
            className="fixed bottom-0 left-0 right-0 max-h-[88vh] flex flex-col rounded-t-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(18,18,24,0.97) 0%, rgba(10,10,14,0.99) 100%)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 -20px 80px rgba(0,0,0,0.6), 0 -4px 20px rgba(255,30,39,0.05)',
            }}
          >
            {/* ─── Drag Handle ─── */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/15 cursor-pointer" onClick={onClose} />
            </div>

            {/* ─── Header with Movie Context ─── */}
            <div className="px-5 pb-4 flex items-start gap-4 relative">
              {/* Mini Poster */}
              {coverUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="w-14 h-[82px] rounded-xl overflow-hidden border border-white/[0.08] shadow-lg shadow-black/40 shrink-0 hidden sm:block"
                >
                  <OptimizedImage src={coverUrl} alt="" className="w-full h-full object-cover" />
                </motion.div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--rf-red)]/15 text-[var(--rf-red)] text-[9px] font-black uppercase tracking-wider">
                    {isTvSeries ? <><Tv size={9} /> Series</> : <><Film size={9} /> Movie</>}
                  </span>
                  {subject.imdbRatingValue > 0 && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[var(--rf-gold)]">
                      <Star size={8} className="fill-[var(--rf-gold)]" />{subject.imdbRatingValue}
                    </span>
                  )}
                </div>
                <h2 id="dl-modal-title" className="text-sm sm:text-base font-black text-white truncate leading-tight">
                  {subject.title}
                </h2>
                {isTvSeries && (
                  <p className="text-[10px] text-[var(--rf-text-dim)] mt-0.5">
                    Season {selectedSeason} • {maxEp} episodes available
                  </p>
                )}
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-all shrink-0 group"
                aria-label="Close"
              >
                <X size={14} className="text-white/50 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* ─── Mode Toggle for TV Series ─── */}
            {isTvSeries && seasons.length > 0 && (
              <div className="px-5 mb-3">
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                  <button
                    onClick={() => onModeChange('single')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300',
                      downloadMode === 'single'
                        ? 'bg-gradient-to-r from-[var(--rf-red)] to-rose-600 text-white shadow-lg shadow-[var(--rf-red)]/25'
                        : 'text-[var(--rf-text-dim)] hover:text-white'
                    )}
                  >
                    <Download size={13} />
                    Single Episode
                  </button>
                  <button
                    onClick={() => onModeChange('batch')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300',
                      downloadMode === 'batch'
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                        : 'text-[var(--rf-text-dim)] hover:text-white'
                    )}
                  >
                    <Package size={13} />
                    Batch Download
                  </button>
                </div>
              </div>
            )}

            {/* ─── Season / Episode Selectors ─── */}
            {isTvSeries && seasons.length > 0 && (
              <div className="px-5 mb-4 flex gap-2.5">
                {/* Season */}
                <div className={downloadMode === 'batch' ? 'w-full' : 'flex-1'}>
                  <label className="block text-[9px] font-black text-[var(--rf-text-dim)] uppercase tracking-widest mb-1.5">Season</label>
                  <div className="relative">
                    <select
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-xs font-semibold appearance-none focus:border-[var(--rf-red)]/50 outline-none transition-all cursor-pointer hover:bg-white/[0.06]"
                      value={selectedSeason}
                      onChange={(e) => onSeasonChange(Number(e.target.value))}
                    >
                      {seasons.filter((s) => s.se > 0).map((s) => (
                        <option key={s.se} value={s.se}>Season {s.se} ({s.maxEp} eps)</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--rf-text-dim)] pointer-events-none" />
                  </div>
                </div>
                {/* Episode */}
                {downloadMode === 'single' && (
                  <div className="flex-1">
                    <label className="block text-[9px] font-black text-[var(--rf-text-dim)] uppercase tracking-widest mb-1.5">Episode</label>
                    <div className="relative">
                      <select
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-xs font-semibold appearance-none focus:border-[var(--rf-red)]/50 outline-none transition-all cursor-pointer hover:bg-white/[0.06]"
                        value={selectedEpisode}
                        onChange={(e) => onEpisodeChange(Number(e.target.value))}
                      >
                        {Array.from({ length: maxEp }, (_, i) => i + 1).map((ep) => (
                          <option key={ep} value={ep}>Episode {ep}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--rf-text-dim)] pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Scrollable Content Area ─── */}
            <div className="flex-1 overflow-y-auto px-5 pb-8" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
              {/* BATCH MODE */}
              {downloadMode === 'batch' && (
                <BatchSection
                  batchResults={batchResults}
                  batchLoading={batchLoading}
                  title={subject.title}
                  selectedSeason={selectedSeason}
                  onFetchBatch={onFetchBatch}
                  onDownloadAll={onDownloadBatchAll}
                  onDownloadAllSubtitles={onDownloadBatchAllSubtitles}
                  onDownloadSingle={(src, id, ep) => handleSingleDownload(src, id, `S${selectedSeason}E${ep}`)}
                />
              )}

              {/* SINGLE MODE */}
              {downloadMode === 'single' && (
                <>
                  {/* Video / Subtitle Tab Switcher */}
                  {subtitles && subtitles.length > 0 && (
                    <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.04] mb-4">
                      <button
                        onClick={() => setActiveTab('video')}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all',
                          activeTab === 'video'
                            ? 'bg-white/[0.08] text-white'
                            : 'text-[var(--rf-text-dim)] hover:text-white'
                        )}
                      >
                        <FileVideo size={12} /> Video Sources
                      </button>
                      <button
                        onClick={() => setActiveTab('subtitle')}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all',
                          activeTab === 'subtitle'
                            ? 'bg-white/[0.08] text-white'
                            : 'text-[var(--rf-text-dim)] hover:text-white'
                        )}
                      >
                        <Globe size={12} /> Subtitles ({subtitles.length})
                      </button>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {activeTab === 'video' && (
                      <motion.div key="video-tab" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                        {sourcesLoading ? (
                          <LoadingState />
                        ) : sources.length > 0 ? (
                          <div className="space-y-2">
                            {sources.map((src, i) => {
                              const downloadId = `single_${subject.title}_S${selectedSeason}E${selectedEpisode}_${src.quality || 'HD'}_${i}`;
                              return (
                                <QualitySourceCard
                                  key={downloadId}
                                  src={src}
                                  downloadId={downloadId}
                                  title={subject.title}
                                  episodeLabel={isTvSeries ? `S${selectedSeason}E${selectedEpisode}` : undefined}
                                  onDownload={(s, id) => handleSingleDownload(s, id, isTvSeries ? `S${selectedSeason}E${selectedEpisode}` : undefined)}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <EmptyState />
                        )}
                      </motion.div>
                    )}
                    {activeTab === 'subtitle' && (
                      <motion.div key="sub-tab" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                        <SubtitleGrid subtitles={subtitles} title={subject.title} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Show subtitles inline if no tab switcher (no subtitles) */}
                  {(!subtitles || subtitles.length === 0) && !sourcesLoading && sources.length > 0 && (
                    <p className="text-[10px] text-[var(--rf-text-dim)] text-center mt-4">No subtitles available for this episode</p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

/* ─── Quality Source Card ─── */
function QualitySourceCard({
  src, downloadId, title, episodeLabel, onDownload,
}: {
  src: SourceItem; downloadId: string; title: string; episodeLabel?: string;
  onDownload: (src: SourceItem, id: string) => void;
}) {
  const progress = useDownloadStore((state) => state.activeDownloads[downloadId] || 0);
  const isDownloading = progress > 0;
  const quality = src.quality || 'HD';
  const meta = getQualityMeta(quality);
  const preferred = getPreferredQuality();
  const isPreferred = preferred && quality.toLowerCase() === preferred.toLowerCase();

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onDownload(src, downloadId)}
      aria-label={`Download ${quality}`}
      className={cn(
        'w-full text-left flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 relative overflow-hidden group',
        'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1]',
        isPreferred && 'ring-1 ring-[var(--rf-red)]/30 bg-[var(--rf-red)]/[0.03]',
      )}
    >
      {/* Progress fill */}
      {isDownloading && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--rf-red)]/10 to-[var(--rf-red)]/5 pointer-events-none"
        />
      )}

      {/* Quality badge */}
      <div className={cn(
        'w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 relative',
        `bg-gradient-to-br ${meta.color} bg-opacity-15`,
      )}
        style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))`, border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="text-lg font-black text-white leading-none">{quality.replace('p', '')}</span>
        <span className="text-[7px] font-bold text-white/50 uppercase tracking-wider">{meta.label}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold text-white">{quality} Quality</span>
          {isPreferred && (
            <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-[var(--rf-gold)] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--rf-gold)]/10">
              <Sparkles size={7} /> Preferred
            </span>
          )}
          {isDownloading && (
            <span className="text-[10px] font-black text-[var(--rf-red)] tabular-nums">{progress}%</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[var(--rf-text-dim)]">
          {src.format && <span className="uppercase font-bold tracking-wider">{src.format}</span>}
          {src.size && <span className="flex items-center gap-1"><Monitor size={9} />{formatFileSize(src.size)}</span>}
          {episodeLabel && <span className="font-medium">{episodeLabel}</span>}
        </div>
      </div>

      {/* Download arrow */}
      <div className={cn(
        'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300',
        isDownloading
          ? 'bg-[var(--rf-red)]/20 text-[var(--rf-red)]'
          : 'bg-white/[0.04] text-white/40 group-hover:bg-[var(--rf-red)] group-hover:text-white group-hover:shadow-lg group-hover:shadow-[var(--rf-red)]/30'
      )}>
        {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
      </div>
    </motion.button>
  );
}

/* ─── Subtitle Grid ─── */
function SubtitleGrid({ subtitles, title }: { subtitles: any[]; title: string }) {
  const setProgress = useDownloadStore((state) => state.setProgress);
  const addToHistory = useDownloadStore((state) => state.addToHistory);
  const activeDownloads = useDownloadStore((state) => state.activeDownloads);

  if (!subtitles || subtitles.length === 0) return (
    <div className="text-center py-10 text-[var(--rf-text-dim)] text-xs">No subtitles available</div>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {subtitles.map((sub: any, i: number) => {
        const downloadId = `sub_${sub.id || i}`;
        const progress = activeDownloads[downloadId] || 0;
        const isDownloading = progress > 0;

        return (
          <motion.button
            key={downloadId}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const ext = sub.url ? sub.url.split('.').pop()?.split('?')[0] || 'srt' : 'srt';
              addToHistory({ id: downloadId, title, filename: `${title}_${sub.lanName}.${ext}`, type: 'subtitle', url: sub.url });
              downloadSubtitle(sub.url, title, sub.lanName, ext, (p) => {
                setProgress(downloadId, p.progress, p.status === 'done' || p.status === 'error');
              });
            }}
            className={cn(
              'relative flex items-center gap-2.5 p-3 rounded-xl text-left transition-all overflow-hidden',
              'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-blue-500/20',
            )}
          >
            {isDownloading && (
              <div className="absolute inset-y-0 left-0 bg-blue-500/10 pointer-events-none transition-all" style={{ width: `${progress}%` }} />
            )}
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 relative z-10">
              {isDownloading
                ? <Loader2 size={12} className="animate-spin text-blue-400" />
                : <Globe size={12} className="text-blue-400" />
              }
            </div>
            <div className="relative z-10 min-w-0">
              <span className="text-xs font-semibold text-white block truncate">{sub.lanName}</span>
              <span className="text-[9px] text-[var(--rf-text-dim)]">.srt</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─── Batch Section ─── */
import { useMemo } from 'react';
function BatchSection({
  batchResults, batchLoading, title, selectedSeason,
  onFetchBatch, onDownloadAll, onDownloadAllSubtitles, onDownloadSingle,
}: {
  batchResults: BatchEpisodeResult[];
  batchLoading: boolean;
  title: string;
  selectedSeason: number;
  onFetchBatch: () => void;
  onDownloadAll: (q?: string) => void;
  onDownloadAllSubtitles: (l?: string) => void;
  onDownloadSingle: (src: SourceItem, id: string, ep: number) => void;
}) {
  const [selectedQuality, setSelectedQuality] = useState('');
  const [selectedLang, setSelectedLang] = useState('');

  const availableCount = batchResults.filter((r) => r.sources.length > 0).length;
  const subtitleCount = batchResults.filter((r) => r.subtitles?.length > 0).length;

  const allQualities = useMemo(() => {
    const set = new Set<string>();
    batchResults.forEach((ep) => ep.sources.forEach((s) => { if (s.quality) set.add(s.quality); }));
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numB - numA;
    });
  }, [batchResults]);

  const allLangs = useMemo(() => Array.from(new Set(
    batchResults.flatMap((ep) => ep.subtitles?.map((s: any) => s.lanName) || []).filter(Boolean)
  )), [batchResults]);

  const activeQ = selectedQuality || allQualities[0] || '';
  const activeLang = selectedLang || allLangs[0] || '';

  // Not fetched yet — show loading since auto-fetch kicks in
  if (!batchLoading && batchResults.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-purple-400" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-white mb-0.5">Preparing Batch...</p>
          <p className="text-[10px] text-[var(--rf-text-dim)]">Season {selectedSeason} — Initializing</p>
        </div>
      </div>
    );
  }

  // Loading
  if (batchLoading) {
    return (
      <div className="py-16 flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-purple-400" />
          </div>
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-2xl bg-purple-500/20"
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-white mb-0.5">Analyzing Episodes...</p>
          <p className="text-[10px] text-[var(--rf-text-dim)]">Fetching download links for Season {selectedSeason}</p>
        </div>
      </div>
    );
  }

  // Results
  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1 text-emerald-400 font-bold">
          <Check size={12} />{availableCount}/{batchResults.length} available
        </span>
        {subtitleCount > 0 && (
          <span className="flex items-center gap-1 text-blue-400 font-bold">
            <Globe size={11} />{subtitleCount} with subs
          </span>
        )}
      </div>

      {/* Quality select + Download All */}
      {allQualities.length > 0 && (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={12} className="text-[var(--rf-red)]" />
            <span className="text-[10px] font-black text-[var(--rf-text-muted)] uppercase tracking-widest">Quick Download</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allQualities.map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuality(q)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all',
                  activeQ === q
                    ? 'bg-gradient-to-r from-[var(--rf-red)] to-rose-600 text-white shadow-lg shadow-[var(--rf-red)]/20'
                    : 'bg-white/[0.04] text-[var(--rf-text-muted)] hover:text-white border border-white/[0.05]'
                )}
              >
                {q}
              </button>
            ))}
          </div>
          <button
            onClick={() => onDownloadAll(activeQ || undefined)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--rf-red)] to-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--rf-red)]/20 hover:shadow-[var(--rf-red)]/40 transition-all active:scale-[0.98]"
          >
            <Download size={14} />
            Download All — {activeQ}
          </button>
        </div>
      )}

      {/* Subtitles batch download */}
      {subtitleCount > 0 && allLangs.length > 0 && (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={12} className="text-blue-400" />
            <span className="text-[10px] font-black text-[var(--rf-text-muted)] uppercase tracking-widest">Subtitles</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allLangs.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all',
                  activeLang === lang
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white/[0.04] text-[var(--rf-text-muted)] hover:text-white border border-white/[0.05]'
                )}
              >
                {lang}
              </button>
            ))}
          </div>
          <button
            onClick={() => onDownloadAllSubtitles(activeLang || undefined)}
            className="w-full py-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Globe size={14} />
            Download All Subtitles — {activeLang}
          </button>
        </div>
      )}


    </div>
  );
}

/* ─── Loading State ─── */
function LoadingState() {
  return (
    <div className="py-16 flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-[var(--rf-red)]/10 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[var(--rf-red)]" />
        </div>
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.05, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-2xl bg-[var(--rf-red)]/15"
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-white mb-0.5">Finding Sources...</p>
        <p className="text-[10px] text-[var(--rf-text-dim)]">Scanning for the best download links</p>
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState() {
  return (
    <div className="py-16 flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
        <HardDriveDownload size={28} className="text-[var(--rf-text-dim)]" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-white mb-0.5">No Sources Found</p>
        <p className="text-[10px] text-[var(--rf-text-dim)] max-w-[220px]">
          Try selecting a different season or episode. Sources may not be available yet.
        </p>
      </div>
    </div>
  );
}
