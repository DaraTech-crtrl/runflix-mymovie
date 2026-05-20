import { memo, useMemo } from 'react';
import { Season } from '../types';
import { cn } from '../../../utils/cn';
import { ChevronDown } from 'lucide-react';
import { useProgressStore } from '../../../stores/useProgressStore';

interface EpisodeSelectorProps {
  seasons: Season[];
  selectedSeason: number;
  selectedEpisode: number;
  downloadMode: 'single' | 'batch';
  onSeasonChange: (season: number) => void;
  onEpisodeChange: (episode: number) => void;
  subjectId?: string;
}

export const EpisodeSelector = memo(({
  seasons,
  selectedSeason,
  selectedEpisode,
  downloadMode,
  onSeasonChange,
  onEpisodeChange,
  subjectId,
}: EpisodeSelectorProps) => {
  const isEpisodeComplete = useProgressStore((s) => s.isEpisodeComplete);
  const activeSeason = seasons.find((s) => s.se === selectedSeason);
  const maxEp = activeSeason?.maxEp || 10;
  const episodes = useMemo(() => Array.from({ length: maxEp }, (_, i) => i + 1), [maxEp]);

  if (seasons.length === 0) return null;

  return (
    <div className={cn('flex gap-2.5 mb-4', downloadMode === 'batch' && 'mb-3')}>
      {/* Season Select */}
      <div className={downloadMode === 'batch' ? 'w-full' : 'flex-1'}>
        <label className="block text-[9px] sm:text-[10px] font-bold text-[var(--rf-text-dim)] mb-1.5 uppercase tracking-wider">
          Season
        </label>
        <div className="relative">
          <select
            className="w-full bg-[var(--rf-surface)] border border-[var(--rf-border)] rounded-xl p-2 sm:p-3 pr-8 sm:pr-10 text-white text-xs sm:text-sm font-medium appearance-none focus:border-[var(--rf-red)]/50 outline-none transition-colors cursor-pointer"
            value={selectedSeason}
            onChange={(e) => onSeasonChange(Number(e.target.value))}
            aria-label="Select Season"
          >
            {seasons
              .filter((s) => s.se > 0)
              .map((s) => (
                <option key={`season-${s.se}`} value={s.se}>
                  Season {s.se} ({s.maxEp} eps)
                </option>
              ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--rf-text-dim)] pointer-events-none" />
        </div>
      </div>

      {/* Episode Select */}
      {downloadMode === 'single' && (
        <div className="flex-1">
          <label className="block text-[9px] sm:text-[10px] font-bold text-[var(--rf-text-dim)] mb-1.5 uppercase tracking-wider">
            Episode
          </label>
          <div className="relative">
            <select
              className="w-full bg-[var(--rf-surface)] border border-[var(--rf-border)] rounded-xl p-2 sm:p-3 pr-8 sm:pr-10 text-white text-xs sm:text-sm font-medium appearance-none focus:border-[var(--rf-red)]/50 outline-none transition-colors cursor-pointer"
              value={selectedEpisode}
              onChange={(e) => onEpisodeChange(Number(e.target.value))}
              aria-label="Select Episode"
            >
              {episodes.map((ep) => {
                const isCompleted = subjectId && isEpisodeComplete(subjectId, selectedSeason, ep);
                return (
                  <option key={`s${selectedSeason}-e${ep}`} value={ep}>
                    Episode {ep} {isCompleted ? '✓' : ''}
                  </option>
                );
              })}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--rf-text-dim)] pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
});

EpisodeSelector.displayName = 'EpisodeSelector';
