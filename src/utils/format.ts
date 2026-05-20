/**
 * Formatting utilities for the Runflix Entertainment platform
 */

/**
 * Format movie duration from seconds to human-readable
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

/**
 * Format file size from bytes to human-readable
 */
export function formatFileSize(bytes: string | number): string {
  const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (!size || isNaN(size)) return '';
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(0)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format year from ISO date string
 */
export function formatYear(date?: string): string {
  if (!date) return '';
  return date.substring(0, 4);
}

/**
 * Format rating for display
 */
export function formatRating(rating?: number | string): string {
  if (rating === undefined || rating === null || rating === '') return 'N/A';
  const num = typeof rating === 'string' ? parseFloat(rating) : rating;
  if (isNaN(num)) return 'N/A';
  return num.toFixed(1);
}

/**
 * Format number with commas
 */
export function formatCount(count: number): string {
  if (!count) return '0';
  return count.toLocaleString();
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
