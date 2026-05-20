import { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Film } from 'lucide-react';
import { getOptimizedImageUrl } from '../../utils/image';

interface OptimizedImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  aspectRatio?: string;
  priority?: boolean;
  width?: number; // Optional target width for image proxy optimization
}

export const OptimizedImage = memo(({
  src,
  alt,
  className = '',
  fallbackIcon,
  aspectRatio,
  priority = false,
  width,
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(
    src ? getOptimizedImageUrl(src, width || 400) : null
  );
  const [attemptedOriginal, setAttemptedOriginal] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Initialize and update the currentSrc when src or width changes
  useEffect(() => {
    if (src) {
      setError(false);
      setAttemptedOriginal(false);
      // For priority images, bypass CDN proxy and load directly
      if (priority) {
        setCurrentSrc(src);
        setLoaded(true); // Immediately mark as loaded for priority images
      } else {
        setLoaded(false);
        setCurrentSrc(getOptimizedImageUrl(src, width || 400));
      }
    } else {
      setCurrentSrc(null);
    }
  }, [src, width, priority]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    // If the proxied image fails to load, seamlessly fallback to the original image URL
    if (src && !attemptedOriginal) {
      setAttemptedOriginal(true);
      setCurrentSrc(src);
    } else {
      setError(true);
    }
  }, [src, attemptedOriginal]);

  // Preload priority images to achieve near‑instant display
  useEffect(() => {
    if (priority && src) {
      setLoaded(true);
      const img = new Image();
      img.src = src;
    }
  }, [priority, src]);


  // For non‑priority images, use a lightweight placeholder and lazy load the full image during idle time
  if (!src || error) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--rf-glass-2)] ${className}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {fallbackIcon || <Film size={24} className="text-[var(--rf-text-dim)]" />}
      </div>
    );
  }

  // Render image element
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Show low‑res placeholder when not loaded */}
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        ref={imgRef}
        src={currentSrc || null}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        {...(priority ? { fetchPriority: 'high' } as any : {})}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover ${priority
          ? 'opacity-100'
          : `transition-opacity duration-250 ${loaded ? 'opacity-100' : 'opacity-0'}`
          }`}
      />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';
