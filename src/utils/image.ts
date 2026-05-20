/**
 * Helper to get a fast, optimized image URL using the wsrv.nl CDN proxy.
 * This handles caching, WebP format conversion, resizing, and resolves CORS issues.
 */
export function getOptimizedImageUrl(url: string | undefined, width?: number): string {
  if (!url) return '';

  // If it's already a local asset, data URI, or placeholder, return it directly
  if (
    url.startsWith('/') ||
    url.startsWith('data:') ||
    url.includes('placehold.co') ||
    url.includes('ui-avatars.com')
  ) {
    return url;
  }

  const cleanUrl = url.trim();

  if (cleanUrl.includes('pbcdnw.aoneroom.com') || cleanUrl.includes('aoneroom.com')) {
    const proxyPath = `/img-proxy?url=${encodeURIComponent(cleanUrl)}`;

    // In production, we can run it through wsrv.nl with the proxy URL so it resizes & converts to WebP.
    // If it's localhost or a local IP, wsrv.nl cannot fetch it, so we fallback to raw proxyPath.
    if (
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1' &&
      !window.location.hostname.startsWith('192.168.') &&
      !window.location.hostname.startsWith('10.')
    ) {
      const w = width || 400;
      const absoluteProxyUrl = `${window.location.origin}${proxyPath}`;
      return `https://wsrv.nl/?url=${encodeURIComponent(absoluteProxyUrl)}&w=${w}&output=webp`;
    }
    return proxyPath;
  }

  let proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&output=webp`;

  if (width) {
    proxyUrl += `&w=${width}`;
  }

  return proxyUrl;
}
