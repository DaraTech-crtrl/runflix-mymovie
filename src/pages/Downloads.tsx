import { useState, useMemo } from 'react';
import { Trash2, Film, FileText, Download as DownloadIcon, Clock, HardDrive, ChevronDown, ChevronUp, RefreshCw, Loader2, RotateCw, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDownloadStore } from './MovieDetails/hooks/useDownloadStore';
import { getRelativeTime } from '../utils/format';
import { useSEO } from '../hooks/useSEO';
import { downloadFile } from '../utils/download';
import { buildMoviePath } from '../utils/slug';
import toast from 'react-hot-toast';

interface ProcessedDownloadItem {
  key: string;
  isBatch: boolean;
  type: 'movie' | 'subtitle';
  title: string;
  timestamp: number;
  quality?: string;
  filename?: string;
  count?: number;
  url?: string;
  id?: string;
  allIds?: string[];
  items?: {
    id: string;
    filename: string;
    quality?: string;
    timestamp: number;
    url?: string;
    count: number;
    allIds: string[];
  }[];
}

export default function Downloads() {
  useSEO({ title: 'Downloads', description: 'Your download history and queue' });

  const history = useDownloadStore((state) => state.history);
  const clearHistory = useDownloadStore((state) => state.clearHistory);
  const removeFromHistory = useDownloadStore((state) => state.removeFromHistory);

  const movieCount = history.filter((h) => h.type === 'movie').length;
  const subtitleCount = history.filter((h) => h.type === 'subtitle').length;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({});
  const [batchDownloading, setBatchDownloading] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleDownloadAgain = async (item: { url?: string; title: string; filename: string; id: string }) => {
    if (!item.url) {
      // Direct link is missing (legacy item). Professional redirection UX
      toast('Direct link not saved. Opening movie details page...', { icon: '🔍' });
      
      let subjectId = '';
      const parts = item.id.split('_');
      if (parts[0] && /^\d+$/.test(parts[0])) {
        subjectId = parts[0];
      } else if (parts[2] && /^\d+$/.test(parts[2])) {
        subjectId = parts[2];
      }

      if (subjectId) {
        window.location.href = buildMoviePath(item.title, subjectId);
      } else {
        window.location.href = `/search?q=${encodeURIComponent(item.title)}`;
      }
      return;
    }

    setDownloadingIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      await downloadFile(item.url, item.filename);
      toast.success(`Downloading ${item.filename}`);
    } catch (err) {
      console.error('Error re-downloading:', err);
      toast.error('Failed to trigger download');
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleDeleteMultiple = (ids: string[]) => {
    ids.forEach((id) => removeFromHistory(id));
    toast.success('Removed from history');
  };

  // Batch download all items in a group (series or subtitles)
  const handleBatchDownload = async (group: any) => {
    if (!group.items || group.items.length === 0) return;
    const key = group.key;
    setBatchDownloading((prev) => ({ ...prev, [key]: true }));
    try {
      await Promise.all(
        group.items.map(async (item: any) => {
          if (item.url) {
            await downloadFile(item.url, item.filename);
          }
        })
      );
      toast.success('Batch download started');
    } catch (err) {
      console.error('Batch download error:', err);
      toast.error('Batch download failed');
    } finally {
      setBatchDownloading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const processedItems = useMemo(() => {
    const processed: ProcessedDownloadItem[] = [];

    // Step 1: Merge identical downloads (same title, filename, and type) to count duplicates
    const fileGroups: Record<string, typeof history> = {};
    history.forEach((item) => {
      const key = `${item.title.trim()}_${(item.filename || '').trim()}_${item.type}`;
      if (!fileGroups[key]) {
        fileGroups[key] = [];
      }
      fileGroups[key].push(item);
    });

    const uniqueFiles = Object.entries(fileGroups).map(([key, items]) => {
      const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);
      const mostRecent = sorted[0];

      // Collect all unique qualities downloaded for this file
      const qualities = Array.from(new Set(items.map((i) => i.quality).filter(Boolean)));
      const displayQuality = qualities.length > 0 ? qualities.join('/') : mostRecent.quality;

      return {
        key,
        id: mostRecent.id,
        title: mostRecent.title,
        filename: mostRecent.filename,
        quality: displayQuality,
        type: mostRecent.type,
        timestamp: mostRecent.timestamp,
        url: mostRecent.url,
        count: items.length,
        allIds: items.map((i) => i.id),
      };
    });

    // Step 2: Separate unique files into TV series groups (episodes/subtitles) and Standalone movies
    const tvShowGroups: Record<string, typeof uniqueFiles> = {};
    const standaloneFiles: typeof uniqueFiles = [];

    uniqueFiles.forEach((file) => {
      // Robust regex detects if the filename or ID matches a TV show episode format
      const isTvEpisode = 
        /S\d+E\d+/i.test(file.filename) || 
        file.filename.toLowerCase().includes('episode') || 
        file.id.startsWith('batch_');

      if (isTvEpisode) {
        const groupKey = `tv_${file.title}_${file.type}`;
        if (!tvShowGroups[groupKey]) {
          tvShowGroups[groupKey] = [];
        }
        tvShowGroups[groupKey].push(file);
      } else {
        standaloneFiles.push(file);
      }
    });

    // Step 3: Populate batch groups
    Object.entries(tvShowGroups).forEach(([groupKey, episodes]) => {
      const first = episodes[0];
      const maxTimestamp = Math.max(...episodes.map((e) => e.timestamp));
      const sortedEpisodes = [...episodes].sort((a, b) => b.timestamp - a.timestamp);

      processed.push({
        key: groupKey,
        isBatch: true,
        type: first.type,
        title: first.title,
        timestamp: maxTimestamp,
        items: sortedEpisodes.map(ep => ({
          id: ep.id,
          filename: ep.filename,
          quality: ep.quality,
          timestamp: ep.timestamp,
          url: ep.url,
          count: ep.count,
          allIds: ep.allIds
        })),
      });
    });

    // Step 4: Populate standalone movies
    standaloneFiles.forEach((file) => {
      processed.push({
        key: file.key,
        isBatch: false,
        type: file.type,
        title: file.title,
        filename: file.filename,
        quality: file.quality,
        timestamp: file.timestamp,
        count: file.count,
        url: file.url,
        id: file.id,
        allIds: file.allIds,
      });
    });

    return processed.sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen px-4 md:px-10 max-w-4xl mx-auto w-full py-4 md:py-8"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <HardDrive size={24} className="text-[var(--rf-red)]" />
            My Downloads
          </h1>
          <p className="text-sm text-[var(--rf-text-dim)]">
            History of your recent downloads and subtitles
          </p>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-2 text-xs text-[var(--rf-text-dim)]">
              <span className="badge badge-quality">{movieCount} movies</span>
              <span className="badge badge-type">{subtitleCount} subtitles</span>
            </div>

            <button
              onClick={clearHistory}
              className="flex items-center gap-2 px-3 py-2 glass-2 rounded-xl text-xs font-semibold text-[var(--rf-text-muted)] hover:text-[var(--rf-red)] hover:bg-[var(--rf-red)]/5 transition-all"
            >
              <Trash2 size={14} />
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* ============ EMPTY STATE ============ */}
      {history.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-2 rounded-2xl p-10 md:p-14 text-center mb-8"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
            <DownloadIcon size={32} className="text-[var(--rf-text-dim)]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Downloads Yet</h3>
          <p className="text-sm text-[var(--rf-text-dim)] max-w-sm mx-auto leading-relaxed">
            When you download movies, TV episodes, or subtitles, they will appear here in your download history.
          </p>
        </motion.div>
      )}

      {/* ============ DOWNLOAD LIST ============ */}
      {history.length > 0 && (
        <div className="space-y-3 mb-8">
          <AnimatePresence initial={false}>
            {processedItems.map((group, idx) => {
              const isExpanded = !!expandedGroups[group.key];
              const totalBatchCount = group.items ? group.items.reduce((sum, item) => sum + item.count, 0) : 0;
              const uniqueBatchCount = group.items ? group.items.length : 0;
              
              const allIdsInGroup = group.isBatch 
                ? (group.items ? group.items.flatMap((item) => item.allIds) : [])
                : (group.allIds || [group.id!]);

              return (
                <motion.div
                  key={group.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2) }}
                  className="glass-2 rounded-2xl overflow-hidden border border-white/[0.04] hover:border-white/[0.08] transition-colors"
                >
                  {/* STANDALONE FILE ROW */}
                  {!group.isBatch ? (
                    <div className="flex items-center justify-between p-4 relative select-none">
                      <div className="flex items-center gap-4 overflow-hidden min-w-0 flex-1">
                        {/* Icon with beautiful glass style */}
                        <div className={cn(
                          'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner relative',
                          group.type === 'movie'
                            ? 'bg-[var(--rf-red)]/10 text-[var(--rf-red)] border border-[var(--rf-red)]/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        )}>
                          {group.type === 'movie' ? <Film size={18} /> : <FileText size={18} />}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h4 className="font-bold text-white text-sm truncate leading-snug">
                              {group.count && group.count > 1 ? (
                                <>
                                  <span className="text-[var(--rf-red)] font-black mr-1.5">{group.count}x</span>
                                  {group.title}
                                </>
                              ) : (
                                group.title
                              )}
                            </h4>
                            {group.quality && (
                              <span className="badge badge-quality text-[8px] py-0 px-1.5 font-bold">{group.quality}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[var(--rf-text-dim)] font-medium">
                            <span className="truncate max-w-[280px]">{group.filename}</span>
                            <span className="shrink-0 flex items-center gap-1">
                              <Clock size={10} />
                              {getRelativeTime(group.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {/* Individual Download Again (Beautiful and prominent!) */}
                        <button
                          onClick={() => handleDownloadAgain({
                            url: group.url,
                            title: group.title,
                            filename: group.filename || '',
                            id: group.id!
                          })}
                          disabled={downloadingIds[group.id!]}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/[0.1] text-xs font-bold text-white transition-all active:scale-95 shrink-0"
                          title="Download Again"
                          aria-label="Download again"
                        >
                          {downloadingIds[group.id!] ? (
                            <Loader2 size={14} className="animate-spin text-[var(--rf-red)]" />
                          ) : (
                            <div className="relative flex items-center justify-center">
                              <RotateCw size={14} className="text-[var(--rf-red)]" />
                              <ArrowDown size={8} className="absolute text-[var(--rf-red)]" />
                            </div>
                          )}
                          <span className="hidden sm:inline">Download Again</span>
                        </button>

                        {/* Trash Button */}
                        <button
                          onClick={() => handleDeleteMultiple(allIdsInGroup)}
                          className="p-2 rounded-xl text-[var(--rf-text-dim)] hover:text-[var(--rf-red)] hover:bg-[var(--rf-red)]/5 transition-all active:scale-95 shrink-0"
                          title="Delete from history"
                          aria-label="Delete history"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* COLLAPSIBLE TV SHOW BATCH CARD */
                    <div>
                      <div 
                        onClick={() => toggleGroup(group.key)}
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-all relative select-none"
                      >
                        <div className="flex items-center gap-4 overflow-hidden min-w-0 flex-1">
                          {/* Icon with beautiful glass style */}
                          <div className={cn(
                            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner relative',
                            group.type === 'movie'
                              ? 'bg-[var(--rf-red)]/10 text-[var(--rf-red)] border border-[var(--rf-red)]/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          )}>
                            {group.type === 'movie' ? <Film size={18} /> : <FileText size={18} />}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <h4 className="font-bold text-white text-sm truncate leading-snug">
                                {group.title}
                              </h4>
                              <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest py-0.5 px-2 rounded border",
                                group.type === 'movie'
                                  ? "bg-[var(--rf-red)]/10 text-[var(--rf-red)] border-[var(--rf-red)]/20 shadow-[0_0_10px_rgba(225,29,72,0.1)]"
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]"
                              )}>
                                Series
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-[var(--rf-text-dim)] font-medium">
                              <span>
                                {uniqueBatchCount} {group.type === 'movie' ? 'episodes' : 'subtitles'} 
                                {totalBatchCount > uniqueBatchCount && ` (${totalBatchCount} total)`}
                              </span>
                              <span className="shrink-0 flex items-center gap-1">
                                <Clock size={10} />
                                {getRelativeTime(group.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions and toggle */}
                        <div className="flex items-center gap-2 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                          {/* Trash Button for Group Delete */}
                          <button
                            onClick={() => handleDeleteMultiple(allIdsInGroup)}
                            className="p-2 rounded-xl text-[var(--rf-text-dim)] hover:text-[var(--rf-red)] hover:bg-[var(--rf-red)]/5 transition-all active:scale-95"
                            title="Delete whole series history"
                            aria-label="Delete history"
                          >
                            <Trash2 size={15} />
                          </button>

                          {/* Batch Download All Button */}
                          <button
                            onClick={() => handleBatchDownload(group)}
                            disabled={batchDownloading[group.key]}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/[0.1] text-xs font-bold text-white transition-all active:scale-95 shrink-0"
                            title="Download all in batch"
                            aria-label="Download all"
                          >
                            {batchDownloading[group.key] ? (
                              <Loader2 size={14} className="animate-spin text-[var(--rf-red)]" />
                            ) : (
                              <div className="relative flex items-center justify-center">
                                <RotateCw size={14} className="text-[var(--rf-red)]" />
                                <ArrowDown size={8} className="absolute text-[var(--rf-red)]" />
                              </div>
                            )}
                            <span className="hidden sm:inline">Download All</span>
                          </button>

                          {/* Chevron Toggle */}
                          <button
                            onClick={() => toggleGroup(group.key)}
                            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.04] transition-all active:scale-95"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Dropdown Items (Collapsible List for Series) */}
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="border-t border-white/[0.04] bg-white/[0.01] divide-y divide-white/[0.03]"
                        >
                          {group.items?.map((subItem) => {
                            const isSubDownloading = !!downloadingIds[subItem.id];
                            return (
                              <div 
                                key={subItem.id} 
                                className="flex items-center justify-between py-3 px-6 hover:bg-white/[0.02] transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                      <span className="text-xs font-semibold text-white/80 truncate block">
                                        {subItem.count > 1 ? (
                                          <>
                                            <span className="text-[var(--rf-red)] font-black mr-1.5">{subItem.count}x</span>
                                            {subItem.filename}
                                          </>
                                        ) : (
                                          subItem.filename
                                        )}
                                      </span>
                                      {subItem.quality && (
                                        <span className="badge badge-quality text-[8px] py-0 px-1 font-bold">{subItem.quality}</span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-[var(--rf-text-dim)] font-medium flex items-center gap-1">
                                      <Clock size={8} />
                                      {getRelativeTime(subItem.timestamp)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                  {/* Sub Item Download Again (Beautiful and prominent!) */}
                                  <button
                                    onClick={() => handleDownloadAgain({
                                      url: subItem.url,
                                      title: group.title,
                                      filename: subItem.filename,
                                      id: subItem.id
                                    })}
                                    disabled={isSubDownloading}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] text-[10px] font-bold text-white transition-all active:scale-95 shrink-0"
                                    title="Download Again"
                                    aria-label="Download again"
                                  >
                                    {isSubDownloading ? (
                                      <Loader2 size={12} className="animate-spin text-[var(--rf-red)]" />
                                    ) : (
                                      <div className="relative flex items-center justify-center">
                                        <RotateCw size={12} className="text-[var(--rf-red)]" />
                                        <ArrowDown size={7} className="absolute text-[var(--rf-red)]" />
                                      </div>
                                    )}
                                    <span className="hidden xs:inline">Download Again</span>
                                  </button>

                                  {/* Sub Item Delete */}
                                  <button
                                    onClick={() => handleDeleteMultiple(subItem.allIds)}
                                    className="p-1.5 rounded-lg text-[var(--rf-text-dim)] hover:text-[var(--rf-red)] hover:bg-[var(--rf-red)]/5 transition-all active:scale-95 shrink-0"
                                    title="Delete from history"
                                    aria-label="Delete history"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ============ DOWNLOAD ACCELERATOR & PLAYBACK GUIDE ============ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-3 rounded-2xl p-6 md:p-8 border border-white/[0.08] relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--rf-red)]/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <h3 className="text-base md:text-lg font-bold text-white mb-6 flex items-center gap-2 pb-3 border-b border-white/[0.06]">
          <span className="text-xl">💡</span> Download Accelerator & Playback Guidance
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          
          {/* Column 1: Speed Booster */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--rf-red)] flex items-center gap-1.5">
              ⚡ How to get 5x Faster Downloads
            </h4>
            <p className="text-xs text-[var(--rf-text-muted)] leading-relaxed">
              Browsers normally download using one single thread, which throttles speeds. You can split files and multiply your download speed instantly:
            </p>
            <ul className="space-y-3 text-[11px] text-[var(--rf-text-muted)] font-medium">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 shrink-0">✔</span>
                <span>
                  <strong className="text-white">Enable Parallel Downloading:</strong> Open <code className="px-1 py-0.5 rounded bg-white/[0.06] text-white">chrome://flags</code> (or edge://flags) in your mobile/desktop browser search bar, query <strong className="text-white">"parallel downloading"</strong>, and change it from Default to <strong className="text-emerald-400">Enabled</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 shrink-0">✔</span>
                <span>
                  <strong className="text-white">Use a Download Manager (Highly Recommended):</strong> Download <strong className="text-white">1DM</strong> or <strong className="text-white">ADM</strong> (Android) or <strong className="text-white">Internet Download Manager (IDM)</strong> (PC/Mac) which splits downloads into 16+ simultaneous connections for maximum server bandwidth extraction.
                </span>
              </li>
            </ul>
          </div>

          {/* Column 2: Playback & VLC */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              🎬 Where is my Movie & Best Player
            </h4>
            <p className="text-xs text-[var(--rf-text-muted)] leading-relaxed">
              Having trouble finding or playing your file? Follow this standard media player configuration to import subtitle tracks seamlessly:
            </p>
            <ul className="space-y-3 text-[11px] text-[var(--rf-text-muted)] font-medium">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5 shrink-0">✔</span>
                <span>
                  <strong className="text-white">File Location:</strong> Downloaded movies and subtitles are saved in your device's default <strong className="text-white">Downloads folder</strong>. Look for files ending with <code className="px-1 py-0.5 rounded bg-white/[0.06] text-white">.mp4</code>, <code className="px-1 py-0.5 rounded bg-white/[0.06] text-white">.mkv</code>, or <code className="px-1 py-0.5 rounded bg-white/[0.06] text-white">.srt</code>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5 shrink-0">✔</span>
                <span>
                  <strong className="text-white">Use VLC Media Player (Essential):</strong> Download the free <strong className="text-white">VLC Player</strong> app from your Play Store or App Store. VLC plays any video codec flawlessly, allows you to switch audio tracks (ideal for dual-audio anime/series), and imports downloaded <strong className="text-white">.srt subtitles</strong> in two taps!
                </span>
              </li>
            </ul>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}

// Utility since we can't import cn at top level cleanly with other imports
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
