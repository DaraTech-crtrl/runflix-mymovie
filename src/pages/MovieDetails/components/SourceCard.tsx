import { memo, useEffect } from 'react';
import { Download, Loader2, HardDrive, Star } from 'lucide-react';
import { SourceItem } from '../types';
import { useDownloadStore } from '../hooks/useDownloadStore';
import { formatFileSize } from '../../../utils/format';

interface SourceCardProps {
  src: SourceItem;
  downloadId: string;
  title: string;
  episodeLabel?: string;
  onDownload: (src: SourceItem, id: string) => void;
}

// Preferred quality helper
const PREF_KEY = 'rf-preferred-quality';

function getPreferredQuality(): string | null {
  try {
    return localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}

function setPreferredQuality(quality: string): void {
  try {
    localStorage.setItem(PREF_KEY, quality);
  } catch {
    // ignore
  }
}

export const SourceCard = memo(({ src, downloadId, title, episodeLabel, onDownload }: SourceCardProps) => {
  const progress = useDownloadStore((state) => state.activeDownloads[downloadId] || 0);
  const isDownloading = progress > 0;

  const quality = src.quality || 'HD';
  const preferredQuality = getPreferredQuality();
  const isPreferred = preferredQuality && quality.toLowerCase() === preferredQuality.toLowerCase();

  const handleDownload = () => {
    setPreferredQuality(quality);
    onDownload(src, downloadId);
  };

  return (
    <button
      onClick={handleDownload}
      aria-label={`Download ${title} ${episodeLabel || ''} ${quality} Quality`}
      className={`w-full text-left flex items-center justify-between p-4 glass-2 hover:bg-white/[0.06] rounded-xl transition-all group relative overflow-hidden active:scale-[0.99] ${
        isPreferred ? 'ring-1 ring-[var(--rf-red)]/30 bg-[var(--rf-red)]/[0.03]' : ''
      }`}
    >
      {/* Progress Bar */}
      {isDownloading && (
        <div
          className="absolute inset-0 bg-[var(--rf-red)]/8 pointer-events-none transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      )}

      <div className="flex items-center gap-3.5 relative z-10">
        {/* Quality Badge */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black border text-sm ${
          isPreferred
            ? 'bg-[var(--rf-red)]/10 text-[var(--rf-red)] border-[var(--rf-red)]/20'
            : 'bg-[var(--rf-surface)] text-[var(--rf-red)] border-[var(--rf-border)]'
        }`}>
          {quality.replace('p', '') || 'HD'}
        </div>

        {/* Info */}
        <div>
          <div className="font-semibold text-white text-sm group-hover:text-[var(--rf-red)] transition-colors flex items-center gap-2">
            {quality} Quality
            {isPreferred && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-[var(--rf-gold)] uppercase tracking-wider">
                <Star size={8} className="fill-current" />
                Preferred
              </span>
            )}
            {isDownloading && (
              <span className="text-xs text-[var(--rf-red)] font-bold">{progress}%</span>
            )}
          </div>
          <div className="text-[11px] text-[var(--rf-text-dim)] flex items-center gap-2 mt-0.5">
            {src.format && <span className="uppercase font-medium">{src.format}</span>}
            {src.size && (
              <span className="flex items-center gap-1">
                <HardDrive size={9} />
                {formatFileSize(src.size)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Download Icon */}
      <div className="relative z-10 w-10 h-10 rounded-xl bg-[var(--rf-red)]/10 text-[var(--rf-red)] flex items-center justify-center group-hover:bg-[var(--rf-red)] group-hover:text-white transition-all shrink-0">
        {isDownloading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
      </div>
    </button>
  );
});

SourceCard.displayName = 'SourceCard';
