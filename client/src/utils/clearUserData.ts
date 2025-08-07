import { encryptionService } from '../services/encryption';

/**
 * Clear all user-specific data on logout for security
 * Note: React Query cache should be cleared by the calling component
 */
export const clearAllUserData = async (): Promise<void> => {
  try {
    // 1. Clear encryption key
    encryptionService.clearStoredKey();
    
    // 2. Clear IndexedDB databases (offline data and operation queue)
    if ('indexedDB' in window) {
      try {
        // Clear offline storage database
        const deleteOfflineDB = indexedDB.deleteDatabase('timemachine-db');
        await new Promise((resolve, reject) => {
          deleteOfflineDB.onsuccess = () => resolve(void 0);
          deleteOfflineDB.onerror = () => reject(deleteOfflineDB.error);
          deleteOfflineDB.onblocked = () => {
            console.warn('Offline DB deletion blocked, will clear on next app restart');
            resolve(void 0);
          };
        });
        
        // Clear operation queue database
        const deleteQueueDB = indexedDB.deleteDatabase('operation-queue-db');
        await new Promise((resolve, reject) => {
          deleteQueueDB.onsuccess = () => resolve(void 0);
          deleteQueueDB.onerror = () => reject(deleteQueueDB.error);
          deleteQueueDB.onblocked = () => {
            console.warn('Queue DB deletion blocked, will clear on next app restart');
            resolve(void 0);
          };
        });
      } catch (error) {
        console.warn('Failed to clear IndexedDB databases:', error);
        // Continue with other cleanup even if IndexedDB fails
      }
    }
    
    // 3. Clear any other localStorage items that might contain user data
    // (auth token is already cleared by authStore, but let's be thorough)
    const keysToRemove = [
      'timemachine_encryption_key', // Encryption key (redundant but safe)
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove localStorage key ${key}:`, error);
      }
    });
    
    // 4. Clear service worker caches (optional, for privacy)
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      } catch (error) {
        console.warn('Failed to clear service worker caches:', error);
        // Continue, cache clearing is not critical
      }
    }
    
    console.log('Successfully cleared all user data');
  } catch (error) {
    console.error('Error during user data cleanup:', error);
    // Don't throw - logout should still proceed even if cleanup fails
  }
};