import { memo } from 'react';
import { useEpisodeLocalProgress } from '../hooks/useEpisodeLocalProgress';

interface EpisodeProgressBarProps {
  episodeTitle: string;
  isCompleted: boolean;
  className?: string;
}

/** Thin progress bar — reads localStorage once per episode via memoized hook. */
export const EpisodeProgressBar = memo(({ episodeTitle, isCompleted, className }: EpisodeProgressBarProps) => {
  const percent = useEpisodeLocalProgress(episodeTitle, isCompleted);
  if (percent <= 0) return null;

  return (
    <div className={className ?? 'absolute bottom-0 left-0 w-full h-1 bg-white/20 z-[3]'}>
      <div
        className="h-full bg-[var(--rf-red)] shadow-[0_0_8px_var(--rf-red)] transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
});

EpisodeProgressBar.displayName = 'EpisodeProgressBar';

/** Inline progress line for episode list rows */
export const EpisodeProgressLine = memo(({ episodeTitle, isCompleted }: Omit<EpisodeProgressBarProps, 'className'>) => {
  const percent = useEpisodeLocalProgress(episodeTitle, isCompleted);

  return (
    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2">
      <div
        style={{ width: `${percent}%` }}
        className={`h-full rounded-full transition-all duration-300 ${percent > 0 ? 'bg-[var(--rf-red)]' : 'bg-white/40'}`}
      />
    </div>
  );
});

EpisodeProgressLine.displayName = 'EpisodeProgressLine';
