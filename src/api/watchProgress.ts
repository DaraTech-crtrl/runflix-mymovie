import { getOrCreateVisitorId } from './analytics';
import type { ProgressData } from '../stores/useProgressStore';

const API_URL = `${import.meta.env.BASE_URL}watch_progress_api.php`.replace(/\/{2,}/g, '/');

export async function fetchServerProgress(): Promise<Record<string, ProgressData>> {
  const visitorId = getOrCreateVisitorId();
  const res = await fetch(`${API_URL}?visitorId=${encodeURIComponent(visitorId)}&_=${Date.now()}`, {
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) {
    return {};
  }
  return (json.progress as Record<string, ProgressData>) || {};
}

export async function pushServerProgress(
  subjectId: string,
  season: number,
  episode: number,
  lastTime: number,
  duration: number,
  options?: { markComplete?: boolean; completedEpisodes?: number[] }
): Promise<void> {
  const visitorId = getOrCreateVisitorId();
  await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId,
      subjectId,
      season,
      episode,
      lastTime,
      duration,
      markComplete: options?.markComplete,
      completedEpisodes: options?.completedEpisodes,
    }),
    keepalive: true,
  }).catch(() => {});
}
