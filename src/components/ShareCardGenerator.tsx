import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image, Download, X, Share2, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { shareImageNative, saveImageBlob } from '../utils/share';
import { isMobileDevice } from '../utils/platform';

interface ShareCardGeneratorProps {
  title: string;
  coverUrl?: string;
  rating?: number;
  year?: string;
  genre?: string;
  description?: string;
}

export default function ShareCardGenerator({ title, coverUrl, rating, year, genre, description }: ShareCardGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCard = useCallback(async () => {
    setGenerating(true);
    setCardDataUrl(null);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const W = 1080;
      const H = 1350;
      canvas.width = W;
      canvas.height = H;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#0a0a10');
      bgGrad.addColorStop(0.5, '#0d0515');
      bgGrad.addColorStop(1, '#030305');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Load and draw cover image
      if (coverUrl) {
        try {
          const img = await loadImage(coverUrl);
          // Draw full-width blurred background
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.drawImage(img, 0, 0, W, H);
          ctx.restore();

          // Gradient overlay
          const overlay = ctx.createLinearGradient(0, 0, 0, H);
          overlay.addColorStop(0, 'rgba(10,10,16,0.3)');
          overlay.addColorStop(0.4, 'rgba(10,10,16,0.7)');
          overlay.addColorStop(0.7, 'rgba(10,10,16,0.95)');
          overlay.addColorStop(1, 'rgba(3,3,5,1)');
          ctx.fillStyle = overlay;
          ctx.fillRect(0, 0, W, H);

          // Poster card (rounded rectangle with shadow)
          const posterW = 480;
          const posterH = 720;
          const posterX = (W - posterW) / 2;
          const posterY = 100;

          // Shadow
          ctx.save();
          ctx.shadowColor = 'rgba(229, 9, 20, 0.15)';
          ctx.shadowBlur = 60;
          ctx.shadowOffsetY = 20;
          roundRect(ctx, posterX, posterY, posterW, posterH, 24);
          ctx.fillStyle = '#111';
          ctx.fill();
          ctx.restore();

          // Poster image clipped
          ctx.save();
          roundRect(ctx, posterX, posterY, posterW, posterH, 24);
          ctx.clip();
          ctx.drawImage(img, posterX, posterY, posterW, posterH);
          ctx.restore();

          // Poster border
          ctx.save();
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 2;
          roundRect(ctx, posterX, posterY, posterW, posterH, 24);
          ctx.stroke();
          ctx.restore();
        } catch {
          // If image fails, just continue with text
        }
      }

      // Rating badge
      const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
      if (numRating && numRating > 0) {
        const badgeX = W / 2 - 50;
        const badgeY = 860;
        ctx.save();
        ctx.fillStyle = 'rgba(251, 197, 49, 0.15)';
        roundRect(ctx, badgeX, badgeY, 100, 36, 18);
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 197, 49, 0.3)';
        ctx.lineWidth = 1;
        roundRect(ctx, badgeX, badgeY, 100, 36, 18);
        ctx.stroke();
        ctx.fillStyle = '#fbc531';
        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`★ ${numRating.toFixed(1)}`, badgeX + 50, badgeY + 24);
        ctx.restore();
      }

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px "Outfit", "Inter", sans-serif';
      ctx.textAlign = 'center';
      wrapText(ctx, title, W / 2, 940, W - 120, 56);

      // Metadata line (year + genre)
      const metaParts: string[] = [];
      if (year) metaParts.push(year);
      if (genre) metaParts.push(genre.split(',').slice(0, 3).map(g => g.trim()).join(' • '));

      if (metaParts.length > 0) {
        ctx.fillStyle = 'rgba(155, 160, 176, 0.8)';
        ctx.font = '500 22px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(metaParts.join('  |  '), W / 2, 1060);
      }

      // Description (truncated)
      if (description) {
        ctx.fillStyle = 'rgba(155, 160, 176, 0.5)';
        ctx.font = '400 18px "Inter", sans-serif';
        ctx.textAlign = 'center';
        const shortDesc = description.length > 120 ? description.slice(0, 120) + '...' : description;
        wrapText(ctx, shortDesc, W / 2, 1110, W - 160, 26);
      }

      // Runflix Entertainment branding
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = 'bold 18px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎬 Runflix Entertainment Entertainment', W / 2, H - 50);

      // Accent line
      const accentGrad = ctx.createLinearGradient(W / 2 - 60, 0, W / 2 + 60, 0);
      accentGrad.addColorStop(0, 'transparent');
      accentGrad.addColorStop(0.5, '#e50914');
      accentGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = accentGrad;
      ctx.fillRect(W / 2 - 60, H - 70, 120, 2);

      setCardDataUrl(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error('Card generation failed:', err);
      toast.error('Failed to generate card');
    } finally {
      setGenerating(false);
    }
  }, [title, coverUrl, rating, year, genre, description]);

  const handleDownload = async () => {
    if (!cardDataUrl) return;
    const blob = await (await fetch(cardDataUrl)).blob();
    const filename = `RUNFlix-${title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    const saved = await saveImageBlob(blob, filename);
    if (saved) {
      toast.success(
        isMobileDevice()
          ? 'Use “Save Image” in the share menu'
          : 'Card saved!'
      );
    } else {
      toast.error('Could not save card');
    }
  };

  const handleShare = async () => {
    if (!cardDataUrl) return;
    try {
      const blob = await (await fetch(cardDataUrl)).blob();
      const filename = `RUNFlix-${title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

      if (navigator.share) {
        const result = await shareImageNative({
          blob,
          filename,
          title: `${title} — Runflix Entertainment`,
          text: `Check out "${title}" on Runflix Entertainment!`,
        });
        if (result === 'shared') return;
        if (result === 'cancelled') return;
      }

      void handleDownload();
    } catch {
      void handleDownload();
    }
  };

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); generateCard(); }}
        aria-label="Generate shareable card"
        className="w-12 h-12 rounded-xl glass-2 flex items-center justify-center hover:bg-white/[0.08] transition-colors"
        title="Create shareable card"
      >
        <Image size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm glass-3 rounded-3xl overflow-hidden border border-white/[0.06] shadow-2xl"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>

              <div className="px-6 pt-6 pb-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={24} className="text-pink-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Share Card</h3>
                <p className="text-xs text-[var(--rf-text-dim)]">Beautiful poster card for social media</p>
              </div>

              {/* Preview */}
              <div className="px-6 pb-4 flex justify-center">
                {generating ? (
                  <div className="w-[250px] h-[312px] rounded-2xl glass flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 size={24} className="animate-spin text-pink-400 mx-auto mb-2" />
                      <p className="text-[10px] text-[var(--rf-text-dim)]">Generating...</p>
                    </div>
                  </div>
                ) : cardDataUrl ? (
                  <img
                    src={cardDataUrl}
                    alt="Share card preview"
                    className="w-[250px] rounded-2xl shadow-2xl border border-white/[0.06]"
                  />
                ) : null}
              </div>

              {/* Actions */}
              {cardDataUrl && (
                <div className="px-6 pb-6 grid grid-cols-2 gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl glass hover:bg-white/5 transition-all text-sm font-bold text-white"
                  >
                    <Download size={16} />
                    Save
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-orange-500/20 hover:from-pink-500/30 hover:to-orange-500/30 transition-all text-sm font-bold text-pink-400"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Helpers
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  let lineCount = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
      lineCount++;
      if (lineCount >= 3) return; // Max 3 lines
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
}
