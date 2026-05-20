import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchMaintenanceStatus, updateMaintenanceStatus } from '../api/maintenance';

const DEFAULT_MESSAGE =
  'We are performing scheduled core upgrades to offer you a faster and smoother cinematic experience. Runflix Entertainment will be back online shortly!';

interface MaintenanceState {
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  isBypassed: boolean;
  isSynced: boolean;
  setMaintenanceMode: (active: boolean, message?: string) => Promise<void>;
  setBypassed: (bypassed: boolean) => void;
  syncFromServer: () => Promise<void>;
}

export const useMaintenanceStore = create<MaintenanceState>()(
  persist(
    (set, get) => ({
      isMaintenanceMode: false,
      maintenanceMessage: DEFAULT_MESSAGE,
      isBypassed: false,
      isSynced: false,

      syncFromServer: async () => {
        try {
          const data = await fetchMaintenanceStatus();
          set({
            isMaintenanceMode: data.enabled,
            maintenanceMessage: data.message,
            isBypassed: data.enabled ? get().isBypassed : false,
            isSynced: true,
          });
        } catch {
          set({ isSynced: true });
        }
      },

      setMaintenanceMode: async (active, message) => {
        const msg = message !== undefined ? message : get().maintenanceMessage;
        const data = await updateMaintenanceStatus(active, msg);
        set({
          isMaintenanceMode: data.enabled,
          maintenanceMessage: data.message,
          isSynced: true,
          isBypassed: active ? get().isBypassed : false,
        });
        // If maintenance mode is being disabled by admin, leave immediately
        if (!active) {
          // Refresh the page to exit maintenance view
          window.location.reload();
        }
      },

      setBypassed: (bypassed) => set({ isBypassed: bypassed }),
    }),
    {
      name: 'rf-maintenance',
      partialize: (state) => ({ isBypassed: state.isBypassed }),
    }
  )
);
