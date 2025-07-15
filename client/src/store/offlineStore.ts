import { create } from 'zustand';
import { OfflineState, OfflineSlice, PendingOperation } from '../types';
import offlineStorage from '../services/offline';
import operationQueue from '../services/operationQueue';
import apiService from '../services/api';
import toast from 'react-hot-toast';

interface OfflineStore extends OfflineState {
  addOfflineSlice: (slice: Omit<OfflineSlice, 'id' | 'createdAt' | 'synced'>) => Promise<string>;
  syncPendingSlices: () => Promise<void>;
  loadPendingSlices: () => Promise<void>;
  clearSyncedSlices: () => Promise<void>;
  getSyncData: () => Promise<{ lastSyncTime: Date | null; pendingCount: number }>;
  pendingOperations: PendingOperation[];
  loadPendingOperations: () => Promise<void>;
  addPendingOperation: (operation: Omit<PendingOperation, 'id' | 'createdAt' | 'retryCount'>) => Promise<string>;
  processOperations: () => Promise<void>;
}

export const useOfflineStore = create<OfflineStore>((set, get) => ({
  isOnline: navigator.onLine,
  pendingSlices: [],
  syncInProgress: false,
  lastSyncTime: null,
  pendingOperations: [],

  addOfflineSlice: async (slice: Omit<OfflineSlice, 'id' | 'createdAt' | 'synced'>) => {
    try {
      const id = await offlineStorage.addOfflineSlice(slice);
      
      // Update local state
      const newSlice: OfflineSlice = {
        ...slice,
        id,
        createdAt: new Date(),
        synced: false
      };
      
      set(state => ({
        pendingSlices: [...state.pendingSlices, newSlice]
      }));
      
      toast.success('Slice saved offline');
      
      // Try to sync immediately if online
      if (navigator.onLine) {
        setTimeout(() => {
          get().syncPendingSlices();
        }, 1000);
      }
      
      return id;
    } catch (error) {
      console.error('Failed to save slice offline:', error);
      toast.error('Failed to save slice offline');
      throw error;
    }
  },

  syncPendingSlices: async () => {
    const { pendingSlices, syncInProgress } = get();
    
    if (syncInProgress || !navigator.onLine || pendingSlices.length === 0) {
      return;
    }
    
    set({ syncInProgress: true });
    
    try {
      // Convert offline slices to sync format
      const slicesToSync = pendingSlices.filter(slice => !slice.synced);
      
      if (slicesToSync.length === 0) {
        set({ syncInProgress: false });
        return;
      }
      
      // Sync with server
      const response = await apiService.syncSlices({ slices: slicesToSync });
      
      // Mark synced slices as synced
      for (const syncedId of response.synced) {
        await offlineStorage.markSliceAsSynced(syncedId);
      }
      
      // Update local state
      set(state => ({
        pendingSlices: state.pendingSlices.map(slice => ({
          ...slice,
          synced: response.synced.includes(slice.id)
        })),
        lastSyncTime: new Date(),
        syncInProgress: false
      }));
      
      // Update sync data
      await offlineStorage.updateSyncData(
        new Date(),
        response.failed.length
      );
      
      if (response.synced.length > 0) {
        toast.success(`Synced ${response.synced.length} slices`);
      }
      
      if (response.failed.length > 0) {
        toast.error(`Failed to sync ${response.failed.length} slices`);
      }
      
      // Clean up synced slices after a delay
      setTimeout(() => {
        get().clearSyncedSlices();
      }, 5000);
      
    } catch (error) {
      console.error('Sync failed:', error);
      set({ syncInProgress: false });
      toast.error('Sync failed');
    }
  },

  loadPendingSlices: async () => {
    try {
      const slices = await offlineStorage.getOfflineSlices();
      const syncData = await offlineStorage.getSyncData();
      
      set({
        pendingSlices: slices,
        lastSyncTime: syncData.lastSyncTime
      });
    } catch (error) {
      console.error('Failed to load pending slices:', error);
    }
  },

  clearSyncedSlices: async () => {
    try {
      await offlineStorage.clearSyncedOfflineSlices();
      
      set(state => ({
        pendingSlices: state.pendingSlices.filter(slice => !slice.synced)
      }));
    } catch (error) {
      console.error('Failed to clear synced slices:', error);
    }
  },

  getSyncData: async () => {
    try {
      return await offlineStorage.getSyncData();
    } catch (error) {
      console.error('Failed to get sync data:', error);
      return { lastSyncTime: null, pendingCount: 0 };
    }
  },

  loadPendingOperations: async () => {
    try {
      const operations = await operationQueue.getAllOperations();
      set({ pendingOperations: operations });
    } catch (error) {
      console.error('Failed to load pending operations:', error);
    }
  },

  addPendingOperation: async (operation: Omit<PendingOperation, 'id' | 'createdAt' | 'retryCount'>) => {
    try {
      const id = await operationQueue.addOperation(operation);
      const operations = await operationQueue.getAllOperations();
      set({ pendingOperations: operations });
      return id;
    } catch (error) {
      console.error('Failed to add pending operation:', error);
      throw error;
    }
  },

  processOperations: async () => {
    if (!navigator.onLine) return;
    
    try {
      await operationQueue.processAllOperations();
      const operations = await operationQueue.getAllOperations();
      set({ pendingOperations: operations });
    } catch (error) {
      console.error('Failed to process operations:', error);
    }
  }
}));

// Set up online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.setState({ isOnline: true });
    // Try to process operations when coming back online
    setTimeout(() => {
      useOfflineStore.getState().processOperations();
      useOfflineStore.getState().syncPendingSlices();
    }, 1000);
  });
  
  window.addEventListener('offline', () => {
    useOfflineStore.setState({ isOnline: false });
  });
  
  // Periodic sync when online
  setInterval(() => {
    if (navigator.onLine) {
      useOfflineStore.getState().processOperations();
      useOfflineStore.getState().syncPendingSlices();
    }
  }, 60000); // Sync every minute
}