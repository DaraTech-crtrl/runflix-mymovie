import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentItem {
  subjectId: string;
  title: string;
  coverUrl?: string;
  subjectType: number;
  imdbRatingValue?: number;
  releaseDate?: string;
  viewedAt: number;
}

interface RecentlyViewedState {
  items: RecentItem[];
  addItem: (item: Omit<RecentItem, 'viewedAt'>) => void;
  removeItem: (subjectId: string) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          // Remove existing entry if present, then prepend
          const filtered = state.items.filter((i) => i.subjectId !== item.subjectId);
          return {
            items: [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, 30),
          };
        });
      },

      removeItem: (subjectId) => {
        set((state) => ({
          items: state.items.filter((i) => i.subjectId !== subjectId),
        }));
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: 'rf-recently-viewed',
    }
  )
);
