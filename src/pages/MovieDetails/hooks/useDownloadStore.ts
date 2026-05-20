import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DownloadHistoryItem {
  id: string;
  title: string;
  filename: string;
  quality?: string;
  timestamp: number;
  type: 'movie' | 'subtitle';
  url?: string;
}

interface DownloadState {
  activeDownloads: Record<string, number>;
  history: DownloadHistoryItem[];
  setProgress: (id: string, progress: number, isComplete?: boolean) => void;
  removeProgress: (id: string) => void;
  addToHistory: (item: Omit<DownloadHistoryItem, 'timestamp'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
}

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set, get) => ({
      activeDownloads: {},
      history: [],
      setProgress: (id, progress, isComplete) => {
        set((state) => ({
          activeDownloads: {
            ...state.activeDownloads,
            [id]: Math.max(progress, 1),
          },
        }));

        if (isComplete) {
          setTimeout(() => {
            get().removeProgress(id);
          }, 1500);
        }
      },
      removeProgress: (id) => {
        set((state) => {
          const newDownloads = { ...state.activeDownloads };
          delete newDownloads[id];
          return { activeDownloads: newDownloads };
        });
      },
      addToHistory: (item) => {
        set((state) => ({
          history: [
            { 
              ...item, 
              id: `${item.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, 
              timestamp: Date.now() 
            },
            ...state.history,
          ],
        }));
      },
      removeFromHistory: (id) => {
        set((state) => ({
          history: state.history.filter((h) => h.id !== id),
        }));
      },
      clearHistory: () => {
        set({ history: [] });
      },
    }),
    {
      name: 'runflix-downloads',
      partialize: (state) => ({ history: state.history }), // Only persist history
    }
  )
);
