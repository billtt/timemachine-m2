import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { OfflineSlice, Slice } from '../types';
import { v4 as uuidv4 } from 'uuid';

// @ts-ignore - Temporary fix for schema typing issue
interface TimeMachineDB extends DBSchema {
  slices: {
    key: string;
    value: Slice;
    indexes: { 'by-time': Date; 'by-type': string };
  };
  // @ts-ignore
  offlineSlices: {
    key: string;
    value: OfflineSlice;
    indexes: { 'by-synced': boolean; 'by-time': Date };
  };
  syncData: {
    key: string;
    value: {
      id: string;
      lastSyncTime: Date;
      pendingCount: number;
    };
  };
}

class OfflineStorageService {
  private db: IDBPDatabase<TimeMachineDB> | null = null;
  private dbName = 'timemachine-db';
  private dbVersion = 1;

  async init(): Promise<void> {
    try {
      this.db = await openDB<TimeMachineDB>(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Slices store for caching
          if (!db.objectStoreNames.contains('slices')) {
            const slicesStore = db.createObjectStore('slices', { keyPath: 'id' });
            slicesStore.createIndex('by-time', 'time');
            slicesStore.createIndex('by-type', 'type');
          }

          // Offline slices store for queued items
          if (!db.objectStoreNames.contains('offlineSlices')) {
            const offlineStore = db.createObjectStore('offlineSlices', { keyPath: 'id' });
            offlineStore.createIndex('by-synced', 'synced');
            offlineStore.createIndex('by-time', 'time');
          }

          // Sync data store
          if (!db.objectStoreNames.contains('syncData')) {
            db.createObjectStore('syncData', { keyPath: 'id' });
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
    }
  }

  private async ensureDb(): Promise<IDBPDatabase<TimeMachineDB>> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Cache management
  async cacheSlices(slices: Slice[]): Promise<void> {
    const db = await this.ensureDb();
    const tx = db.transaction('slices', 'readwrite');
    
    await Promise.all(
      slices.map(slice => tx.store.put(slice))
    );
    
    await tx.done;
  }

  async getCachedSlices(limit = 50): Promise<Slice[]> {
    const db = await this.ensureDb();
    const tx = db.transaction('slices', 'readonly');
    const index = tx.store.index('by-time');
    
    // Get slices in reverse chronological order
    const slices = await index.getAll(IDBKeyRange.upperBound(new Date()));
    return slices.reverse().slice(0, limit);
  }

  async clearCache(): Promise<void> {
    const db = await this.ensureDb();
    const tx = db.transaction('slices', 'readwrite');
    await tx.store.clear();
    await tx.done;
  }

  // Offline slice management
  async addOfflineSlice(slice: Omit<OfflineSlice, 'id' | 'createdAt' | 'synced'>): Promise<string> {
    const db = await this.ensureDb();
    const id = uuidv4();
    
    const offlineSlice: OfflineSlice = {
      ...slice,
      id,
      createdAt: new Date(),
      synced: false
    };

    const tx = db.transaction('offlineSlices', 'readwrite');
    await tx.store.put(offlineSlice);
    await tx.done;

    return id;
  }

  async getOfflineSlices(): Promise<OfflineSlice[]> {
    try {
      const db = await this.ensureDb();
      const tx = db.transaction('offlineSlices', 'readonly');
      const store = tx.store;
      
      // Get all slices and filter for unsynced ones
      const allSlices = await store.getAll();
      return allSlices.filter(slice => !slice.synced);
    } catch (error) {
      console.error('Error getting offline slices:', error);
      return [];
    }
  }

  async markSliceAsSynced(id: string): Promise<void> {
    const db = await this.ensureDb();
    const tx = db.transaction('offlineSlices', 'readwrite');
    
    const slice = await tx.store.get(id);
    if (slice) {
      slice.synced = true;
      await tx.store.put(slice);
    }
    
    await tx.done;
  }

  async removeOfflineSlice(id: string): Promise<void> {
    const db = await this.ensureDb();
    const tx = db.transaction('offlineSlices', 'readwrite');
    await tx.store.delete(id);
    await tx.done;
  }

  async clearSyncedOfflineSlices(): Promise<void> {
    const db = await this.ensureDb();
    const tx = db.transaction('offlineSlices', 'readwrite');
    const index = tx.store.index('by-synced');
    
    const syncedSlices = await index.getAll(true);
    await Promise.all(
      syncedSlices.map(slice => tx.store.delete(slice.id))
    );
    
    await tx.done;
  }

  // Sync data management
  async updateSyncData(lastSyncTime: Date, pendingCount: number): Promise<void> {
    const db = await this.ensureDb();
    const tx = db.transaction('syncData', 'readwrite');
    
    await tx.store.put({
      id: 'sync-info',
      lastSyncTime,
      pendingCount
    });
    
    await tx.done;
  }

  async getSyncData(): Promise<{ lastSyncTime: Date | null; pendingCount: number }> {
    const db = await this.ensureDb();
    const tx = db.transaction('syncData', 'readonly');
    const data = await tx.store.get('sync-info');
    
    return {
      lastSyncTime: data?.lastSyncTime || null,
      pendingCount: data?.pendingCount || 0
    };
  }

  // Search cached slices
  async searchCachedSlices(query: string, type?: string): Promise<Slice[]> {
    const db = await this.ensureDb();
    const tx = db.transaction('slices', 'readonly');
    
    let slices: Slice[];
    
    if (type) {
      const index = tx.store.index('by-type');
      slices = await index.getAll(type);
    } else {
      slices = await tx.store.getAll();
    }
    
    // Simple text search
    const searchTerm = query.toLowerCase();
    return slices.filter(slice => 
      slice.content.toLowerCase().includes(searchTerm)
    ).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }

  // Utility methods
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { used: 0, quota: 0 };
  }

  async clearAllData(): Promise<void> {
    const db = await this.ensureDb();
    const tx = db.transaction(['slices', 'offlineSlices', 'syncData'], 'readwrite');
    
    await Promise.all([
      tx.objectStore('slices').clear(),
      tx.objectStore('offlineSlices').clear(),
      tx.objectStore('syncData').clear()
    ]);
    
    await tx.done;
  }
}

export const offlineStorage = new OfflineStorageService();
export default offlineStorage;