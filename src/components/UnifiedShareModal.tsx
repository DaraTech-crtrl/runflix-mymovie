import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Share2,
  Download,
  Check,
  QrCode,
  Image,
  Sparkles,
  Instagram,
  MessageSquare,
  Link2,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  copyTextToClipboard,
  copyTextToClipboardAsync,
} from '../utils/clipboard';
import { isMobileDevice } from '../utils/platform';
import { saveImageBlob, shareImageNative } from '../utils/share';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { getOptimizedImageUrl } from '../utils/image';
import { CinematicPoster, PosterRef } from './CinematicPoster';
import { StoryPoster } from './StoryPoster';

// Helper to convert base64 dataURL to Blob for sharing/saving
function dataURLtoBlob(dataurl: string): Blob | null {
  if (!dataurl) return null;
  try {
    const arr = dataurl.split(',');
    const match = arr[0].match(/:(.*?);/);
    if (!match) return null;
    const mime = match[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error('Failed to convert dataURL to Blob:', e);
    return null;
  }
}

interface UnifiedShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  coverUrl?: string;
  rating?: string | number;
  year?: string;
  genre?: string;
  description?: string;
  url: string;
  isTvSeries?: boolean;
  seasonsCount?: number;
  duration?: string;
}

function generateQRCode(text: string, size: number = 256): string {
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=${size}x${size}&bgcolor=0b0b0f&color=ffffff&format=png&margin=10`;
}

export default function UnifiedShareModal({
  isOpen,
  onClose,
  title,
  coverUrl,
  rating,
  year,
  genre,
  url,
  description,
  isTvSeries,
  seasonsCount,
  duration,
}: UnifiedShareModalProps) {
  const [activeTab, setActiveTab] = useState<'poster' | 'qr' | 'caption'>('poster');
  const [format, setFormat] = useState<'cinematic' | 'story'>('cinematic');
  const [copied, setCopied] = useState(false);
  const [selectedCaptionStyle, setSelectedCaptionStyle] = useState<
    'trending' | 'hype' | 'critic' | 'minimal' | 'binge' | 'premium'
  >('trending');

  const [captionSeed, setCaptionSeed] = useState(() =>
    Math.floor(Math.random() * 999999)
  );

  const cinematicPosterRef = useRef<PosterRef | null>(null);
  const storyPosterRef = useRef<PosterRef | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(340);

  const qrUrl = generateQRCode(url, 320);
  const siteDomain = window.location.host || 'runflix.name.ng';

  // ResizeObserver to calculate CSS scale factor dynamically
  useEffect(() => {
    if (activeTab !== 'poster' || !previewContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, [activeTab]);

  // ============================================
  // CREATE POSTER IMAGE FROM PREVIEW
  // ============================================
  const generatePosterBlob = async (): Promise<Blob | null> => {
    try {
      const dataUrl = format === 'story'
        ? storyPosterRef.current?.getStageDataUrl()
        : cinematicPosterRef.current?.getStageDataUrl();

      if (!dataUrl) return null;
      return dataURLtoBlob(dataUrl);
    } catch (err) {
      console.error('Failed to generate poster blob:', err);
      return null;
    }
  };

  // ============================================
  // DOWNLOAD POSTER
  // ============================================
  const handleDownloadPoster = async () => {
    try {
      const blob = await generatePosterBlob();

      if (!blob) {
        toast.error('Failed to generate poster');
        return;
      }

      const filename = `${title}-runflix.png`;
      const saved = await saveImageBlob(blob, filename);

      if (saved) {
        toast.success(
          isMobileDevice()
            ? 'Use “Save Image” in the share menu'
            : 'Poster saved!'
        );
      } else {
        toast.error('Failed to save poster');
      }
    } catch {
      toast.error('Failed to save poster');
    }
  };

  // ============================================
  // SHARE POSTER
  // ============================================
  const handleShare = async () => {
    const captionText = getCaptionText(selectedCaptionStyle);

    try {
      const blob = await generatePosterBlob();

      if (!blob) {
        toast.error('Failed to generate poster');
        return;
      }

      const filename = `${title}-runflix.png`;

      if (isMobileDevice() && navigator.share) {
        const result = await shareImageNative({
          blob,
          filename,
          title,
          text: captionText,
          url,
        });

        if (result === 'shared') {
          toast.success('Shared!');
        } else if (result === 'cancelled') {
          return;
        } else {
          toast.error('Unable to share — try Save, then share from Photos');
        }
        return;
      }

      if (navigator.share) {
        const result = await shareImageNative({
          blob,
          filename,
          title,
          text: captionText,
          url,
        });

        if (result === 'shared') {
          toast.success('Link shared! Saving poster...');
          void handleDownloadPoster();
        } else if (result === 'cancelled') {
          return;
        } else {
          handleDownloadPoster();
        }
        return;
      }

      handleDownloadPoster();
    } catch {
      toast.error('Unable to share');
    }
  };

  // ============================================
  // COPY LINK
  // ============================================
  const handleCopyLink = () => {
    const applySuccess = () => {
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    };

    if (copyTextToClipboard(url)) {
      applySuccess();
      return;
    }

    void copyTextToClipboardAsync(url).then((ok) => {
      if (ok) applySuccess();
      else toast.error('Failed to copy');
    });
  };

  // ============================================
  // CAPTIONS
  // ============================================
  // ============================================
  // CAPTIONS
  // ============================================
  const getCaptionText = (
    style:
      | 'trending'
      | 'hype'
      | 'critic'
      | 'minimal'
      | 'binge'
      | 'premium'
  ) => {
    const movieTitle = title.toUpperCase();
    const movieRating = rating || '8.4';
    const movieGenre = genre?.split(',')[0] || 'Trending';
    const movieYear = year || '2026';

    const captionGroups = {
      trending: [
        `🍿 NOW STREAMING ON Runflix Entertainment 🔥

🎬 ${movieTitle}
⭐ ${movieRating}/10 IMDb
📺 Ultra HD Quality
⬇️ Unlimited Free Downloads
🚫 Zero Annoying Ads

Stream instantly:
🔗 ${url}`,

        `🔥 TRENDING ON Runflix Entertainment

🎬 ${movieTitle}
🎭 ${movieGenre}
⭐ Rated ${movieRating}/10 on IMDb
📡 Smooth HD Streaming
🚫 No Popups • No Stress

Watch now:
🔗 ${url}`,

        `🎥 MOVIE NIGHT JUST GOT BETTER 🍿

🎬 ${movieTitle}
📅 ${movieYear}
⭐ IMDb ${movieRating}/10
📺 Crystal Clear HD
⬇️ Download & Stream Free

Start watching:
🔗 ${url}`,
      ],

      hype: [
        `🚨 EVERYONE IS TALKING ABOUT THIS MOVIE 🔥

🎬 ${movieTitle}
⭐ ${movieRating}/10 IMDb
📺 Ultra HD Streaming
🍿 Pure Cinema Experience
🚫 No Annoying Ads

Watch now before spoilers catch you 😭
🔗 ${url}`,

        `😳 THIS MOVIE IS ACTUALLY CRAZY

🎬 ${movieTitle}
🔥 ${movieGenre}
⭐ ${movieRating}/10 IMDb
📺 HD Streaming Available
⬇️ Unlimited Downloads

Now streaming on Runflix Entertainment:
🔗 ${url}`,

        `🔥 YOU NEED TO WATCH THIS TONIGHT

🎬 ${movieTitle}
⭐ ${movieRating}/10 IMDb
📺 High Quality Streaming
🚫 Zero Ads
🍿 Non-stop Entertainment

Watch instantly:
🔗 ${url}`,
      ],

      critic: [
        `🎞️ CINEMA PICK OF THE NIGHT

"${title}" is one of those movies you start casually...
then end up finishing in one sitting 🍿

🎭 ${movieGenre}
⭐ ${movieRating}/10 IMDb
📺 Ultra HD Experience

Now streaming:
🔗 ${url}`,

        `🎬 EDITOR'S MOVIE PICK

${title} delivers an unforgettable experience from start to finish.

⭐ IMDb: ${movieRating}/10
🎭 Genre: ${movieGenre}
📺 HD Streaming
🚫 Ad-Free Watching

Stream now:
🔗 ${url}`,

        `🍿 MOVIE RECOMMENDATION

If you're looking for something intense, entertaining and worth your time...

🎬 ${movieTitle}
⭐ ${movieRating}/10 IMDb
📺 Premium HD Quality

Watch instantly:
🔗 ${url}`,
      ],

      minimal: [
        `🎬 ${movieTitle}

⭐ ${movieRating}/10 IMDb
📺 HD Streaming

🔗 ${url}`,

        `🍿 ${movieTitle}

📺 Stream in HD
🚫 No Ads

🔗 ${url}`,

        `🔥 ${movieTitle}

⭐ IMDb ${movieRating}/10
⬇️ Download & Stream

🔗 ${url}`,
      ],

      binge: [
        `🍿 PERFECT FOR BINGE NIGHT

🎬 ${movieTitle}
📺 Full HD Streaming
⬇️ Download Anytime
⭐ ${movieRating}/10 IMDb

Get snacks ready 😭🔥

🔗 ${url}`,

        `🌙 LATE NIGHT MOVIE VIBES

🎬 ${movieTitle}
🎭 ${movieGenre}
⭐ ${movieRating}/10 IMDb
📺 Smooth HD Playback

Start watching:
🔗 ${url}`,

        `😮‍💨 JUST ONE EPISODE?
Yeah right...

🎬 ${movieTitle}
⭐ ${movieRating}/10 IMDb
📺 Ultra HD Streaming

Watch now:
🔗 ${url}`,
      ],

      premium: [
        `✨ PREMIUM ENTERTAINMENT EXPERIENCE

🎬 ${movieTitle}
⭐ ${movieRating}/10 IMDb
📺 Ultra HD Quality
🚫 Ad-Free Streaming
⬇️ Unlimited Access

Exclusively on Runflix Entertainment
🔗 ${url}`,

        `🎥 WATCH IN CINEMATIC QUALITY

🎬 ${movieTitle}
🎭 ${movieGenre}
⭐ IMDb ${movieRating}/10
📺 Crystal Clear Streaming

Experience it now:
🔗 ${url}`,

        `🍿 STREAM SMART WITH Runflix Entertainment

🎬 ${movieTitle}
⭐ ${movieRating}/10 IMDb
📺 Fast Streaming Servers
⬇️ Unlimited Downloads
🚫 No Interruptions

Watch now:
🔗 ${url}`,
      ],
    };

    const selectedGroup = captionGroups[style];
    const index = captionSeed % selectedGroup.length;

    return selectedGroup[index];
  };

  // ============================================
  // COPY CAPTION
  // ============================================
  const handleCopyCaption = () => {
    const caption = getCaptionText(selectedCaptionStyle);

    if (copyTextToClipboard(caption)) {
      toast.success('Caption copied!');
      setCaptionSeed(Math.floor(Math.random() * 999999));
      return;
    }

    void copyTextToClipboardAsync(caption).then((ok) => {
      if (ok) {
        toast.success('Caption copied!');
        setCaptionSeed(Math.floor(Math.random() * 999999));
      } else {
        toast.error('Failed to copy');
      }
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  if (!isOpen) return null;

  const modal = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-0 md:p-6"
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${title}`}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/92 backdrop-blur-2xl" />

        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 w-[min(100vw,500px)] h-[min(100vw,500px)] rounded-full bg-red-600/10 blur-[160px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 24,
          }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 flex flex-col w-full h-full min-h-[100dvh] max-h-[100dvh] md:min-h-0 md:max-h-[90vh] md:h-auto md:w-[850px] md:rounded-[32px] md:border md:border-white/10 md:shadow-2xl overflow-hidden bg-[#0c0c11]/98 backdrop-blur-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:pt-6 md:pb-6"
        >
          {/* TOP BORDER */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/70 to-transparent" />

          {/* CLOSE */}
          <button
            onClick={onClose}
            className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 md:top-6 md:right-6 z-20 w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>

          {/* HEADER */}
          <div className="px-6 pt-7 pb-4 text-center md:pt-4 md:pb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400 mb-3">
              <Sparkles size={10} />
              Share
            </span>

            <h2 className="text-white text-xl md:text-2xl font-black tracking-tight leading-tight px-6 truncate">
              {title}
            </h2>

            <p className="text-white/40 text-[11px] mt-1">
              Share with friends
            </p>
          </div>

          {/* TABS */}
          <div className="px-6 mb-5">
            <div className="flex gap-1 p-1 rounded-2xl border border-white/5 bg-white/[0.03]">
              {[
                { key: 'poster', label: 'Poster', icon: Image },
                { key: 'qr', label: 'QR', icon: QrCode },
                { key: 'caption', label: 'Caption', icon: MessageSquare },
              ].map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold transition-all cursor-pointer ${activeTab === tab.key
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white/70'
                      }`}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CONTENT */}
          <div className="px-6 pb-6 overflow-y-auto flex-1 min-h-0">
            {/* POSTER TAB */}
            {activeTab === 'poster' && (
              <div className="flex flex-col md:grid md:grid-cols-12 gap-6 items-center md:items-stretch h-full">
                {/* Left: Preview */}
                <div className="w-full md:col-span-6 flex flex-col items-center justify-center bg-white/[0.01] md:bg-white/[0.02] border border-white/[0.04] rounded-3xl p-4 md:p-6 gap-4 min-h-[360px] md:min-h-0">
                  {/* FORMAT SWITCHER */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormat('cinematic')}
                      className={`px-4 h-9 rounded-xl border text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer ${format === 'cinematic'
                        ? 'bg-white/10 border-white/15 text-white'
                        : 'border-white/5 text-white/40'
                        }`}
                    >
                      Cinematic
                    </button>

                    <button
                      onClick={() => setFormat('story')}
                      className={`px-4 h-9 rounded-xl border text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer ${format === 'story'
                        ? 'bg-white/10 border-white/15 text-white'
                        : 'border-white/5 text-white/40'
                        }`}
                    >
                      Story
                    </button>
                  </div>

                  {/* POSTER PREVIEW */}
                  {(() => {
                    const W = format === 'story' ? 460 : 580;
                    const H = format === 'story' ? 660 : 400;
                    // Cap max visual height on mobile to 300px, on desktop/tablet to 420px for perfect responsive layout
                    const maxH = isMobileDevice() ? 300 : 420;
                    const scale = Math.min(1, containerWidth / W, maxH / H);

                    return (
                      <div
                        ref={previewContainerRef}
                        className="w-full flex justify-center items-start overflow-hidden rounded-[24px]"
                        style={{
                          height: H * scale,
                        }}
                      >
                        <div
                          style={{
                            width: W,
                            height: H,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top center',
                            flexShrink: 0,
                          }}
                        >
                          {format === 'story' ? (
                            <StoryPoster
                              ref={storyPosterRef}
                              title={title}
                              coverUrl={coverUrl}
                              rating={rating}
                              year={year}
                              genre={genre}
                              description={description}
                              isTvSeries={isTvSeries}
                              seasonsCount={seasonsCount}
                              duration={duration}
                              shareUrl={url}
                            />
                          ) : (
                            <CinematicPoster
                              ref={cinematicPosterRef}
                              title={title}
                              coverUrl={coverUrl}
                              rating={rating}
                              year={year}
                              genre={genre}
                              description={description}
                              isTvSeries={isTvSeries}
                              seasonsCount={seasonsCount}
                              duration={duration}
                              shareUrl={url}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Right: Actions */}
                <div className="w-full md:col-span-6 flex flex-col justify-center gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadPoster}
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase text-white/80 cursor-pointer"
                    >
                      <Download size={14} />
                      Save
                    </button>

                    <button
                      onClick={handleShare}
                      className="h-12 rounded-2xl bg-red-500 hover:bg-red-600 transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase text-white cursor-pointer"
                    >
                      <Share2 size={14} />
                      Share
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      handleDownloadPoster();
                      toast.success('Saved for Instagram!');
                    }}
                    className="h-12 rounded-2xl border border-pink-500/10 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 flex items-center justify-center gap-2 text-[11px] font-bold uppercase text-pink-300 cursor-pointer"
                  >
                    <Instagram size={14} />
                    Instagram Story
                  </button>
                </div>
              </div>
            )}

            {/* QR TAB */}
            {activeTab === 'qr' && (
              <div className="flex flex-col md:grid md:grid-cols-12 gap-6 items-center md:items-stretch h-full">
                {/* Left: Preview */}
                <div className="w-full md:col-span-6 flex flex-col items-center justify-center bg-white/[0.01] md:bg-white/[0.02] border border-white/[0.04] rounded-3xl p-4 md:p-6 gap-4 min-h-[300px] md:min-h-0">
                  <div className="relative p-5 rounded-[30px] bg-white/[0.03] border border-white/10">
                    <div className="relative rounded-2xl overflow-hidden">
                      <img src={qrUrl} alt="QR Code" className="w-[180px] h-[180px] sm:w-[200px] sm:h-[200px]" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 rounded-2xl bg-black border border-white/10 flex items-center justify-center">
                          <span className="text-red-500 text-xs font-black">R</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-white font-bold text-sm">Scan to Watch</p>
                    <p className="text-white/40 text-xs mt-1">Open instantly on any device</p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="w-full md:col-span-6 flex flex-col justify-center gap-3">
                  <button
                    onClick={handleCopyLink}
                    className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase text-white/80 cursor-pointer"
                  >
                    {copied ? (
                      <Check size={14} className="text-green-400" />
                    ) : (
                      <Link2 size={14} />
                    )}
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>
            )}

            {/* CAPTION TAB */}
            {activeTab === 'caption' && (
              <div className="flex flex-col md:grid md:grid-cols-12 gap-6 items-center md:items-stretch h-full">
                {/* Left: Preview */}
                <div className="w-full md:col-span-6 flex flex-col justify-center bg-white/[0.01] md:bg-white/[0.02] border border-white/[0.04] rounded-3xl p-4 md:p-6 gap-4 min-h-[220px] md:min-h-0">
                  <div className="w-full rounded-[24px] border border-white/10 bg-white/[0.02] p-4 max-h-[220px] md:max-h-[300px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-white/80 font-medium font-sans">
                      {getCaptionText(selectedCaptionStyle)}
                    </pre>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="w-full md:col-span-6 flex flex-col justify-center gap-4">
                  {/* Style switcher */}
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-2xl bg-white/[0.02] border border-white/5">
                    {[
                      { key: 'trending', label: 'Trending 🔥' },
                      { key: 'hype', label: 'Hype 🚀' },
                      { key: 'critic', label: 'Critic 🎬' },
                      { key: 'minimal', label: 'Minimal ✨' },
                      { key: 'binge', label: 'Binge 🍿' },
                      { key: 'premium', label: 'Premium 👑' },
                    ].map((tpl) => (
                      <button
                        key={tpl.key}
                        onClick={() => {
                          setSelectedCaptionStyle(tpl.key as any);
                          setCaptionSeed(Math.floor(Math.random() * 999999));
                        }}
                        className={`h-11 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${selectedCaptionStyle === tpl.key
                            ? 'bg-red-500 text-white shadow-lg shadow-red-950/30'
                            : 'bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06]'
                          }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleCopyCaption}
                    className="h-12 rounded-2xl bg-red-500 hover:bg-red-600 transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase text-white shadow-lg shadow-red-950/20 cursor-pointer"
                  >
                    <Copy size={14} />
                    Copy Caption
                  </button>
                  <button
                    onClick={() => {
                      setCaptionSeed(Math.floor(Math.random() * 999999));
                      toast.success('New caption generated!');
                    }}
                    className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase text-white/80 cursor-pointer"
                  >
                    <Sparkles size={14} />
                    Shuffle Caption
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}