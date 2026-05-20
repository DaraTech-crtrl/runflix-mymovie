import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchServerProgress, pushServerProgress } from '../api/watchProgress';

/** Season-scoped episode id: S2E3 → 2003 */
export function episodeProgressKey(season: number, episode: number): number {
  return season * 1000 + episode;
}

/** Drop legacy bare episode numbers (cross-season leak); keep composite keys only */
function normalizeCompletedEpisodes(episodes: number[]): number[] {
  return [...new Set(episodes.filter((e) => e >= 1001))];
}

const saveFlushTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingSavePayloads = new Map<
  string,
  { season: number; episode: number; lastTime: number; duration: number }
>();
const SAVE_DEBOUNCE_MS = 4000;

function scheduleSaveFlush(subjectId: string, apply: () => void): void {
  const existing = saveFlushTimers.get(subjectId);
  if (existing) clearTimeout(existing);
  saveFlushTimers.set(
    subjectId,
    setTimeout(() => {
      saveFlushTimers.delete(subjectId);
      apply();
    }, SAVE_DEBOUNCE_MS)
  );
}

export interface ProgressData {
  lastEpisode: number;
  lastSeason: number;
  lastTime?: number;
  duration?: number;
  updatedAt: number;
  completedEpisodes: number[];
}

interface ProgressStore {
  progress: Record<string, ProgressData>;
  markEpisodeComplete: (subjectId: string, season: number, episode: number) => void;
  saveProgress: (
    subjectId: string,
    season: number,
    episode: number,
    lastTime: number,
    duration: number
  ) => void;
  getProgress: (subjectId: string) => ProgressData | null;
  isEpisodeComplete: (subjectId: string, season: number, episode: number) => boolean;
  removeProgress: (subjectId: string) => void;
  clearProgress: () => void;
  syncFromServer: () => Promise<void>;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progress: {},

      markEpisodeComplete: (subjectId, season, episode) => {
        set((state) => {
          const current = state.progress[subjectId] || {
            lastEpisode: 0,
            lastSeason: 1,
            updatedAt: 0,
            completedEpisodes: [],
          };

          const key = episodeProgressKey(season, episode);
          const newCompleted = [...new Set([...current.completedEpisodes, key])];
          const updated = {
            ...current,
            lastSeason: season,
            lastEpisode: episode,
            updatedAt: Date.now(),
            completedEpisodes: newCompleted,
          };

          void pushServerProgress(
            subjectId,
            season,
            episode,
            updated.lastTime ?? 0,
            updated.duration ?? 0,
            { markComplete: true, completedEpisodes: newCompleted }
          );

          return {
            progress: {
              ...state.progress,
              [subjectId]: updated,
            },
          };
        });
      },

      saveProgress: (subjectId, season, episode, lastTime, duration) => {
        pendingSavePayloads.set(subjectId, { season, episode, lastTime, duration });
        scheduleSaveFlush(subjectId, () => {
          const payload = pendingSavePayloads.get(subjectId);
          if (!payload) return;
          set((state) => {
            const current = state.progress[subjectId] || {
              lastEpisode: 1,
              lastSeason: 1,
              updatedAt: 0,
              completedEpisodes: [],
            };

            const entry = {
              ...current,
              lastSeason: payload.season,
              lastEpisode: payload.episode,
              lastTime: payload.lastTime,
              duration: payload.duration,
              updatedAt: Date.now(),
            };

            void pushServerProgress(
              subjectId,
              payload.season,
              payload.episode,
              payload.lastTime,
              payload.duration,
              { completedEpisodes: entry.completedEpisodes }
            );

            return {
              progress: {
                ...state.progress,
                [subjectId]: entry,
              },
            };
          });
        });
      },

      syncFromServer: async () => {
        try {
          const remote = await fetchServerProgress();
          if (Object.keys(remote).length === 0) return;
          set((state) => {
            const merged = { ...state.progress };
            for (const [id, remoteData] of Object.entries(remote)) {
              const local = merged[id];
              const remoteAt = remoteData.updatedAt || 0;
              const localAt = local?.updatedAt || 0;
              if (!local || remoteAt >= localAt) {
                merged[id] = {
                  ...remoteData,
                  completedEpisodes: normalizeCompletedEpisodes(
                    remoteData.completedEpisodes || []
                  ),
                };
              }
            }
            return { progress: merged };
          });
        } catch {
          /* offline or API not deployed */
        }
      },

      getProgress: (subjectId) => {
        return get().progress[subjectId] || null;
      },

      isEpisodeComplete: (subjectId, season, episode) => {
        const prog = get().progress[subjectId];
        if (!prog) return false;
        const key = episodeProgressKey(season, episode);
        return prog.completedEpisodes.includes(key);
      },

      removeProgress: (subjectId) =>
        set((state) => {
          const newProgress = { ...state.progress };
          delete newProgress[subjectId];
          return { progress: newProgress };
        }),

      clearProgress: () => set({ progress: {} }),
    }),
    {
      name: 'runflix-progress-storage',
      version: 2,
      migrate: (persisted: unknown) => {
        const state = persisted as { progress?: Record<string, ProgressData> } | undefined;
        if (!state?.progress) return persisted as ProgressStore;
        const progress: Record<string, ProgressData> = {};
        for (const [id, data] of Object.entries(state.progress)) {
          progress[id] = {
            ...data,
            completedEpisodes: normalizeCompletedEpisodes(data.completedEpisodes || []),
          };
        }
        return { ...state, progress };
      },
    }
  )
);
