import { useState } from 'react';
import { fetchBatchSources } from '../../../api/client';
import { BatchEpisodeResult, SourceItem } from '../types';
import { useDownloadStore } from './useDownloadStore';
import { batchDownloadMovies, downloadSubtitle } from '../../../utils/download';

export const useBatchDownloads = (id: string | undefined, isTvSeries: boolean, selectedSeason: number, title: string) => {
  const [batchResults, setBatchResults] = useState<BatchEpisodeResult[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const setProgress = useDownloadStore((state) => state.setProgress);

  const fetchBatch = async (maxEp: number) => {
    if (!id || !isTvSeries || maxEp === 0) return;
    
    setBatchLoading(true);
    setBatchResults([]);
    try {
      const results = await fetchBatchSources(id, selectedSeason, maxEp);
      setBatchResults(results as BatchEpisodeResult[]);
    } finally {
      setBatchLoading(false);
    }
  };

  /**
   * Download all episodes in the batch.
   * If preferredQuality is provided, picks the source matching that quality
   * for each episode (falls back to first available source).
   */
  const startBatchDownload = async (preferredQuality?: string) => {
    const items = batchResults
      .map((ep) => {
        // Find the source matching the preferred quality, or fall back to first
        let best = ep.sources[0];
        if (preferredQuality && ep.sources.length > 0) {
          const matched = ep.sources.find(
            (s) => s.quality?.toLowerCase() === preferredQuality.toLowerCase()
          );
          if (matched) best = matched;
        }
        if (!best) return null;
        return {
          url: best.download_url || best.stream_url,
          title,
          quality: best.quality || 'HD',
          format: best.format,
          episodeLabel: `S${selectedSeason}E${ep.episode}`,
          episode: ep.episode,
          id: best.id,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const addToHistory = useDownloadStore.getState().addToHistory;

    items.forEach((item) => {
      const downloadId = `batch_ep${item.episode}_${item.id}`;
      addToHistory({
        id: downloadId,
        title,
        filename: `${title} - ${item.episodeLabel}`,
        quality: item.quality,
        type: 'movie',
        url: item.url,
      });
      setProgress(downloadId, 1, false);
    });

    await batchDownloadMovies(items as any[], (idx: number, p: any) => {
      const item = items[idx];
      const isComplete = p.status === 'done' || p.status === 'error';
      setProgress(`batch_ep${item.episode}_${item.id}`, p.progress, isComplete);
    });
  };

  /**
   * Download all subtitles from batch results.
   * For each episode that has subtitles, downloads the first available subtitle.
   * If a specific language is provided, filters to that language only.
   */
  const startBatchSubtitleDownload = async (language?: string) => {
    const addToHistory = useDownloadStore.getState().addToHistory;

    const subtitleItems = batchResults
      .filter((ep) => ep.subtitles && ep.subtitles.length > 0)
      .map((ep) => {
        // Pick matching language or first available
        const sub = language
          ? ep.subtitles.find((s: any) => s.lanName === language) || ep.subtitles[0]
          : ep.subtitles[0];

        if (!sub?.url) return null;

        return {
          url: sub.url,
          lanName: sub.lanName || 'Unknown',
          episode: ep.episode,
          episodeLabel: `S${selectedSeason}E${ep.episode}`,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (subtitleItems.length === 0) return;

    // Stagger downloads to avoid browser blocking
    for (let i = 0; i < subtitleItems.length; i++) {
      const item = subtitleItems[i];
      const downloadId = `batch_sub_ep${item.episode}_${item.lanName}`;

      addToHistory({
        id: downloadId,
        title,
        filename: `${title} - ${item.episodeLabel} - ${item.lanName}`,
        type: 'subtitle',
        url: item.url,
      });
      setProgress(downloadId, 1, false);

      await downloadSubtitle(item.url, `${title}_${item.episodeLabel}`, item.lanName, undefined, (p) => {
        const isComplete = p.status === 'done' || p.status === 'error';
        setProgress(downloadId, p.progress, isComplete);
      });

      // Small delay between downloads
      if (i < subtitleItems.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  };

  const resetBatch = () => {
    setBatchResults([]);
    setBatchLoading(false);
  };

  return {
    batchResults,
    batchLoading,
    fetchBatch,
    startBatchDownload,
    startBatchSubtitleDownload,
    resetBatch,
  };
};
