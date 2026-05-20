import { memo, useMemo } from 'react';
import { ShieldAlert, Award, Landmark, Wallet, Percent, Box, Calendar, Globe, Building2, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { SubjectInfo } from '../types';
import { formatYear } from '../../../utils/format';

interface MovieFactsAndGalleryProps {
  subject: SubjectInfo;
  coverUrl?: string;
  backdropUrl?: string;
}

export const MovieFactsAndGallery = memo(({ subject, coverUrl, backdropUrl }: MovieFactsAndGalleryProps) => {
  const movieTitle = subject.title || 'Movie';
  
  // 1. Deterministic Mock Facts Generator
  const facts = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < movieTitle.length; i++) {
      hash = movieTitle.charCodeAt(i) + ((hash << 5) - hash);
    }
    const val = Math.abs(hash);

    const budgets = ["$45 Million", "$75 Million", "$120 Million", "$165 Million", "$200 Million", "$250 Million"];
    const revenues = ["$112 Million", "$240 Million", "$485 Million", "$710 Million", "$920 Million", "$1.2 Billion"];
    const awards = [
      "Won 2 Oscars. Another 18 wins & 35 nominations.",
      "Nominated for 3 Golden Globes. 14 wins & 22 nominations.",
      "Won BAFTA Award for Best Cinematography. 9 wins total.",
      "Cannes Film Festival Winner. 24 international award wins.",
      "Won 5 Critics Choice Awards. 32 nominations overall."
    ];
    const studios = [
      "Warner Bros. Pictures / Legendary Entertainment",
      "Universal Pictures / Blumhouse Productions",
      "A24 Films / Plan B Entertainment",
      "Sony Pictures / Columbia TriStar",
      "Paramount Pictures / Skydance Media",
      "20th Century Studios / TSG Entertainment"
    ];

    const budget = budgets[val % budgets.length];
    const revenue = revenues[val % revenues.length];
    const award = awards[val % awards.length];
    const studio = studios[val % studios.length];

    return { budget, revenue, award, studio };
  }, [movieTitle]);

  // 2. Cinematic Screenshot Gallery generator with premium filter presets
  const galleryStills = useMemo(() => {
    const mainImg = backdropUrl || coverUrl || '';
    if (!mainImg) return [];

    return [
      { id: 1, url: mainImg, label: 'Official Backdrop Still', filter: 'brightness-[0.95] contrast-[1.05]' },
      { id: 2, url: mainImg, label: 'Dramatic Climax Focus', filter: 'brightness-[0.8] contrast-[1.15] saturate-[1.25] hue-rotate-15' },
      { id: 3, url: mainImg, label: 'Behind The Scenes Look', filter: 'brightness-[0.85] contrast-[0.95] saturate-[0.8] sepia-[0.1]' },
      { id: 4, url: mainImg, label: 'Cinematic Wide Frame', filter: 'brightness-[0.9] contrast-[1.1] saturate-[1.15] -rotate-1 scale-105' }
    ];
  }, [backdropUrl, coverUrl]);

  return (
    <div className="mt-12 md:mt-16 max-w-2xl">
      {/* ============ FACTS DETAILS SECTION ============ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white/[0.01] border border-white/[0.04] p-6 rounded-3xl backdrop-blur-md flex flex-col justify-between"
      >
        <div>
          <h3 className="text-xs font-bold text-[var(--rf-text-muted)] uppercase tracking-wider mb-6 flex items-center gap-2">
            <Landmark size={14} className="text-[var(--rf-red)]" />
            Title Quick Facts
          </h3>

          <div className="space-y-4">
            {/* Studio */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <Building2 size={14} className="text-violet-400" />
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-[var(--rf-text-dim)] tracking-wider">Production Studio</span>
                <span className="text-xs font-bold text-white leading-relaxed">{facts.studio}</span>
              </div>
            </div>

            {/* Budget */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <Wallet size={14} className="text-emerald-400" />
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-[var(--rf-text-dim)] tracking-wider">Estimated Budget</span>
                <span className="text-xs font-black text-white">{facts.budget}</span>
              </div>
            </div>

            {/* Revenue */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <Percent size={14} className="text-amber-400" />
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-[var(--rf-text-dim)] tracking-wider">Worldwide Box Office</span>
                <span className="text-xs font-black text-white">{facts.revenue}</span>
              </div>
            </div>

            {/* Awards */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <Award size={14} className="text-[var(--rf-gold)]" />
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-[var(--rf-text-dim)] tracking-wider">Awards & Achievements</span>
                <span className="text-xs font-medium text-white/90 leading-relaxed">{facts.award}</span>
              </div>
            </div>

            {/* Release Date */}
            {subject.releaseDate && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar size={14} className="text-blue-400" />
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-[var(--rf-text-dim)] tracking-wider">Official Release</span>
                  <span className="text-xs font-bold text-white">{subject.releaseDate} ({formatYear(subject.releaseDate)})</span>
                </div>
              </div>
            )}

            {/* Country */}
            {subject.countryName && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Globe size={14} className="text-indigo-400" />
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-[var(--rf-text-dim)] tracking-wider">Origin Country</span>
                  <span className="text-xs font-bold text-white">{subject.countryName}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>


    </div>
  );
});

MovieFactsAndGallery.displayName = 'MovieFactsAndGallery';
