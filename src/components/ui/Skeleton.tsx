import { memo } from 'react';

interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export const Skeleton = memo(({ className = '', rounded = 'md' }: SkeletonProps) => {
  const roundedMap = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
    '2xl': 'rounded-[24px]',
    full: 'rounded-full',
  };

  return <div className={`skeleton ${roundedMap[rounded]} ${className}`} />;
});

Skeleton.displayName = 'Skeleton';

/* Movie Card Skeleton */
export const MovieCardSkeleton = memo(() => (
  <div className="flex flex-col gap-2.5">
    <Skeleton className="w-full aspect-[2/3]" rounded="lg" />
    <Skeleton className="h-4 w-3/4" rounded="sm" />
    <Skeleton className="h-3 w-1/2" rounded="sm" />
  </div>
));

MovieCardSkeleton.displayName = 'MovieCardSkeleton';

/* Row Skeleton */
export const MovieRowSkeleton = memo(() => (
  <div className="px-5 lg:px-10 pb-10">
    <Skeleton className="h-6 w-40 mb-5" rounded="sm" />
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="shrink-0 w-[140px] md:w-[170px]">
          <MovieCardSkeleton />
        </div>
      ))}
    </div>
  </div>
));

MovieRowSkeleton.displayName = 'MovieRowSkeleton';

/* Hero Skeleton */
export const HeroSkeleton = memo(() => (
  <div className="relative w-full h-[65vh] md:h-[80vh] overflow-hidden">
    <Skeleton className="absolute inset-0" rounded="sm" />
    <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12 space-y-4">
      <Skeleton className="h-4 w-24" rounded="full" />
      <Skeleton className="h-12 w-96 max-w-[80%]" rounded="lg" />
      <Skeleton className="h-4 w-80 max-w-[70%]" rounded="sm" />
      <Skeleton className="h-4 w-64 max-w-[60%]" rounded="sm" />
      <div className="flex gap-3 pt-2">
        <Skeleton className="h-14 w-44" rounded="xl" />
        <Skeleton className="h-14 w-32" rounded="xl" />
      </div>
    </div>
  </div>
));

HeroSkeleton.displayName = 'HeroSkeleton';

/* Detail Page Skeleton */
export const DetailSkeleton = memo(() => (
  <div className="min-h-screen">
    <Skeleton className="w-full h-[50vh]" rounded="sm" />
    <div className="max-w-7xl mx-auto px-5 -mt-32 relative z-10 space-y-6">
      <div className="flex flex-col md:flex-row gap-8">
        <Skeleton className="w-[220px] md:w-[280px] aspect-[2/3] shrink-0 mx-auto md:mx-0" rounded="xl" />
        <div className="flex-1 space-y-4 pt-4">
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20" rounded="full" />
            <Skeleton className="h-7 w-16" rounded="full" />
            <Skeleton className="h-7 w-24" rounded="full" />
          </div>
          <Skeleton className="h-10 w-80 max-w-full" rounded="lg" />
          <Skeleton className="h-4 w-full" rounded="sm" />
          <Skeleton className="h-4 w-4/5" rounded="sm" />
          <Skeleton className="h-4 w-3/5" rounded="sm" />
          <Skeleton className="h-14 w-52 mt-4" rounded="xl" />
        </div>
      </div>
    </div>
  </div>
));

DetailSkeleton.displayName = 'DetailSkeleton';

/* Grid Skeleton */
export const GridSkeleton = memo(({ count = 10 }: { count?: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
    {Array.from({ length: count }).map((_, i) => (
      <MovieCardSkeleton key={i} />
    ))}
  </div>
));

GridSkeleton.displayName = 'GridSkeleton';
GridSkeleton.displayName = 'GridSkeleton';
