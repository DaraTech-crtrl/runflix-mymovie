import { useEffect, useState } from 'react';

type Rotation = 0 | 90 | 180 | 270;

/**
 * Computes extra scale so 90°/270° video fits inside the player box when not in native fullscreen.
 */
export function useVideoRotationFit(
  containerRef: React.RefObject<HTMLElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  rotation: Rotation,
  isFullscreen: boolean
): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (isFullscreen || rotation === 0 || rotation === 180) {
      setScale(1);
      return;
    }

    const update = () => {
      const container = containerRef.current;
      const video = videoRef.current;
      if (!container || !video) return;

      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (!cw || !ch) return;

      const vw = video.videoWidth || cw;
      const vh = video.videoHeight || ch;
      if (!vw || !vh) return;

      const rotatedW = vh;
      const rotatedH = vw;
      const fit = Math.min(cw / rotatedW, ch / rotatedH, 1);
      setScale(Number.isFinite(fit) ? fit : 1);
    };

    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    videoRef.current?.addEventListener('loadedmetadata', update);

    return () => {
      ro.disconnect();
      videoRef.current?.removeEventListener('loadedmetadata', update);
    };
  }, [containerRef, videoRef, rotation, isFullscreen]);

  return scale;
}
