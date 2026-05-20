import { memo } from 'react';
import { Download, Loader2, Globe } from 'lucide-react';
import { useDownloadStore } from '../hooks/useDownloadStore';
import { downloadSubtitle } from '../../../utils/download';

interface SubtitleListProps {
  subtitles: any[];
  title: string;
}

export const SubtitleList = memo(({ subtitles, title }: SubtitleListProps) => {
  const setProgress = useDownloadStore((state) => state.setProgress);
  const addToHistory = useDownloadStore((state) => state.addToHistory);
  const activeDownloads = useDownloadStore((state) => state.activeDownloads);

  if (!subtitles || subtitles.length === 0) return null;

  return (
    <div className="mt-5 relative z-10">
      <h3 className="text-xs font-bold text-[var(--rf-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
        <Globe size={12} />
        Subtitles
      </h3>
      <div className="flex flex-wrap gap-2">
        {subtitles.map((sub: any, i: number) => {
          const downloadId = `sub_${sub.id || i}`;
          const progress = activeDownloads[downloadId] || 0;
          const isDownloading = progress > 0;

          return (
            <button
              key={downloadId}
              onClick={() => {
                const ext = sub.url ? sub.url.split('.').pop()?.split('?')[0] || 'srt' : 'srt';
                const formattedFilename = `${title.replace(/\s+/g, '_')}_${sub.lanName.replace(/\s+/g, '_')}.${ext}`;
                addToHistory({
                  id: downloadId,
                  title: title,
                  filename: formattedFilename,
                  type: 'subtitle',
                  url: sub.url,
                });
                downloadSubtitle(sub.url, title, sub.lanName, ext, (p) => {
                  setProgress(downloadId, p.progress, p.status === 'done' || p.status === 'error');
                });
              }}
              aria-label={`Download ${sub.lanName} subtitle`}
              className="px-3 py-1.5 glass-2 rounded-lg text-[11px] font-medium text-[var(--rf-text-muted)] hover:text-white transition-all flex items-center gap-1.5 relative overflow-hidden active:scale-95"
            >
              {isDownloading && (
                <div
                  className="absolute inset-0 bg-blue-500/10 pointer-events-none transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              )}
              <span className="relative z-10">{sub.lanName}</span>
              {isDownloading ? (
                <Loader2 size={10} className="relative z-10 animate-spin text-blue-400" />
              ) : (
                <Download size={10} className="relative z-10 opacity-40" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

SubtitleList.displayName = 'SubtitleList';
