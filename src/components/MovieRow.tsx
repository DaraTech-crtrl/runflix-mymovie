import { useRef, useState, useEffect, memo, ReactNode, useCallback } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface MovieRowProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onViewAll?: () => void;
}

export const MovieRow = memo(({ title, subtitle, children, onViewAll }: MovieRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const rafRef = useRef<number | null>(null);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const onScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      checkScroll();
    });
  }, [checkScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [checkScroll, onScroll]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'auto',
    });
  };

  return (
    <section className="relative pb-8 md:pb-10">
      {/* Section Header */}
      <div className="flex items-end justify-between px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 mb-4 md:mb-5">
        <div>
          <h3 className="text-lg md:text-xl font-bold tracking-tight text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[var(--rf-text-dim)] mt-0.5">{subtitle}</p>
          )}
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-[var(--rf-red)] text-xs font-semibold flex items-center gap-0.5 hover:gap-1.5 transition-all group"
          >
            View All
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Scroll Container */}
      <div className="relative group/row">
        {/* Scroll Arrows - Desktop */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="hidden md:flex absolute left-0 top-0 bottom-4 z-20 w-16 items-center justify-center bg-gradient-to-r from-[var(--rf-black)] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"
            aria-label="Scroll left"
          >
            <div className="w-10 h-10 rounded-full glass-2 flex items-center justify-center hover:bg-white/10 transition-colors">
              <ChevronLeft size={18} />
            </div>
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="hidden md:flex absolute right-0 top-0 bottom-4 z-20 w-16 items-center justify-center bg-gradient-to-l from-[var(--rf-black)] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"
            aria-label="Scroll right"
          >
            <div className="w-10 h-10 rounded-full glass-2 flex items-center justify-center hover:bg-white/10 transition-colors">
              <ChevronRight size={18} />
            </div>
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-5 overflow-x-auto px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 pb-3 scrollbar-hide snap-x snap-mandatory"
        >
          {children}
          {/* WebKit right-padding fix */}
          <div className="shrink-0 w-1 sm:w-4 md:w-10 lg:w-14" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
});

MovieRow.displayName = 'MovieRow';
