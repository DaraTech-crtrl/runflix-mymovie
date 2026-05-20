import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WatchlistItem {
  subjectId: string;
  title: string;
  coverUrl?: string;
  subjectType: number;
  imdbRatingValue?: number;
  releaseDate?: string;
  addedAt: number;
}

interface WatchlistState {
  items: WatchlistItem[];
  addItem: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  removeItem: (subjectId: string) => void;
  isInWatchlist: (subjectId: string) => boolean;
  clear: () => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const existing = get().items.find((i) => i.subjectId === item.subjectId);
        if (existing) return;
        set((state) => ({
          items: [{ ...item, addedAt: Date.now() }, ...state.items].slice(0, 100),
        }));
      },

      removeItem: (subjectId) => {
        set((state) => ({
          items: state.items.filter((i) => i.subjectId !== subjectId),
        }));
      },

      isInWatchlist: (subjectId) => {
        return get().items.some((i) => i.subjectId === subjectId);
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: 'rf-watchlist',
    }
  )
);
