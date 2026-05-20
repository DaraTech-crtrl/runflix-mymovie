/** Canonical site URL (set VITE_SITE_URL in .env for production). */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://runflix.name.ng'
).replace(/\/$/, '');

/** Default share image for WhatsApp, Twitter, Discord, etc. (1200×630 PNG in /public). */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/** Fallback if og-image.png is missing on the server. */
export const FALLBACK_OG_IMAGE = `${SITE_URL}/logo.png`;

/**
 * Resolve an absolute OG image URL.
 * Prefer movie cover; otherwise site og-image (then logo).
 */
export function resolveOgImage(image?: string | null): string {
  if (image && typeof image === 'string' && image.trim()) {
    const trimmed = image.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (trimmed.startsWith('//')) {
      return `https:${trimmed}`;
    }
    if (trimmed.startsWith('/')) {
      return `${SITE_URL}${trimmed}`;
    }
    return trimmed;
  }
  return DEFAULT_OG_IMAGE;
}

/** Pick best share image for a title (cover → stills → default OG). */
export function getTitleOgImage(subject?: {
  cover?: { url?: string };
  stills?: { url?: string };
  image?: string;
} | null): string {
  const url =
    subject?.cover?.url ||
    subject?.stills?.url ||
    (typeof subject?.image === 'string' ? subject.image : undefined);
  return resolveOgImage(url);
}
