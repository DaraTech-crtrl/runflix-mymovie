import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, X, Download, Copy, Check, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  copyTextToClipboard,
  copyTextToClipboardAsync,
} from '../utils/clipboard';
import { saveImageBlob } from '../utils/share';

interface QRShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  coverUrl?: string;
}

// Lightweight QR code generator (no external dependency)
function generateQRCode(text: string, size: number = 256): string {
  // Use Google Charts API for QR generation (free, no key needed)
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=${size}x${size}&bgcolor=0a0a0f&color=ffffff&format=png&margin=10`;
}

export default function QRShareModal({ isOpen, onClose, title, url, coverUrl }: QRShareModalProps) {
  const [copied, setCopied] = useState(false);
  const qrUrl = generateQRCode(url, 300);

  const handleCopy = () => {
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

  const handleDownloadQR = async () => {
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const filename = `RUNFlix-${title.replace(/[^a-zA-Z0-9]/g, '_')}-QR.png`;
      const saved = await saveImageBlob(blob, filename);
      if (saved) toast.success('QR code saved!');
      else toast.error('Could not save QR code');
    } catch {
      toast.error('Could not save QR code');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} — Runflix Entertainment`,
          text: `Check out "${title}" on Runflix Entertainment!`,
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm glass-3 rounded-3xl overflow-hidden border border-white/[0.06] shadow-2xl"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="relative px-6 pt-6 pb-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-3">
              <QrCode size={24} className="text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Share with QR Code</h3>
            <p className="text-xs text-[var(--rf-text-dim)] line-clamp-1">{title}</p>
          </div>

          {/* QR Code */}
          <div className="px-6 pb-4 flex justify-center">
            <div className="relative p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <img
                src={qrUrl}
                alt={`QR code for ${title}`}
                className="w-[200px] h-[200px] rounded-xl"
                loading="eager"
              />
              {/* Center Logo */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[var(--rf-black)] border-2 border-white/10 flex items-center justify-center shadow-lg">
                <img src="/favicon.png" alt="" className="w-6 h-6 object-contain" />
              </div>
            </div>
          </div>

          {/* URL */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl glass border border-white/[0.06]">
              <span className="text-[10px] text-[var(--rf-text-dim)] truncate flex-1 font-mono">{url}</span>
              <button
                onClick={handleCopy}
                className="shrink-0 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-[var(--rf-text-dim)]" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 grid grid-cols-3 gap-2">
            <button
              onClick={handleCopy}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl glass hover:bg-white/5 transition-all"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-[var(--rf-text-dim)]" />}
              <span className="text-[9px] font-bold text-[var(--rf-text-dim)] uppercase">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownloadQR}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl glass hover:bg-white/5 transition-all"
            >
              <Download size={16} className="text-[var(--rf-text-dim)]" />
              <span className="text-[9px] font-bold text-[var(--rf-text-dim)] uppercase">Save QR</span>
            </button>
            <button
              onClick={handleNativeShare}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl glass hover:bg-white/5 transition-all"
            >
              <Share2 size={16} className="text-[var(--rf-text-dim)]" />
              <span className="text-[9px] font-bold text-[var(--rf-text-dim)] uppercase">Share</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
