/**
 * SEO-friendly slug utilities for Runflix Entertainment URLs
 */

/**
 * Convert a movie title to a URL-safe slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Build a SEO-friendly movie URL path segment
 * e.g., "citadel-Maf0aT2zq24"
 */
export function buildMovieSlug(title: string, id: string): string {
  const slug = slugify(title);
  return slug ? `${slug}-${id}` : id;
}

/**
 * Extract the real movie ID from a slug
 * Handles both "citadel-Maf0aT2zq24" and plain "Maf0aT2zq24"
 */
export function extractIdFromSlug(slug: string): string {
  if (!slug) return '';

  // The ID is the last segment after the final hyphen,
  // but only if the part after the last hyphen looks like an ID
  const lastHyphenIndex = slug.lastIndexOf('-');
  
  if (lastHyphenIndex === -1) {
    // No hyphen found, the whole thing is the ID
    return slug;
  }

  const potentialId = slug.slice(lastHyphenIndex + 1);

  // If the potential ID is alphanumeric and reasonably short, it's the ID
  if (potentialId.length > 0 && /^[a-zA-Z0-9]+$/.test(potentialId)) {
    return potentialId;
  }

  // Otherwise, the whole slug is the ID
  return slug;
}

/**
 * Build a full movie path for routing
 */
export function buildMoviePath(title: string, id: string): string {
  return `/movie/${buildMovieSlug(title, id)}`;
}
