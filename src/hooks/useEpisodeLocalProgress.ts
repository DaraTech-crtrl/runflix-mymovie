import { useMemo } from 'react';

/** Read episode playback % from localStorage (cached per title key). */
export function useEpisodeLocalProgress(episodeTitle: string, isCompleted: boolean): number {
  return useMemo(() => {
    if (isCompleted) return 100;
    try {
      const savedTime = localStorage.getItem(`rf_progress_${episodeTitle}`);
      const duration = localStorage.getItem(`rf_progress_${episodeTitle}_duration`);
      if (savedTime && duration) {
        const t = parseFloat(savedTime);
        const d = parseFloat(duration);
        if (d > 0) return Math.min((t / d) * 100, 100);
      }
    } catch {
      /* ignore */
    }
    return 0;
  }, [episodeTitle, isCompleted]);
}
