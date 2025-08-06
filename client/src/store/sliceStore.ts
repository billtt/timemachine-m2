import { create } from 'zustand';
import { Slice, SliceFormData } from '../types';
import { useOfflineStore } from './offlineStore';
import { useUIStore } from './uiStore';
import operationQueue from '../services/operationQueue';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { encryptionService } from '../services/encryption';

// Global query client reference for cache invalidation
let queryClient: any = null;

export const setQueryClient = (client: any) => {
  queryClient = client;
};

interface SliceWithStatus extends Slice {
  pending?: boolean;
  tempId?: string | undefined;
  error?: string;
  isDeleting?: boolean | undefined;
}

interface SliceStore {
  slices: SliceWithStatus[];
  setSlices: (slices: Slice[]) => void;
  setDecryptedSlices: (slices: Slice[]) => void;
  addSlice: (data: SliceFormData) => Promise<any>;
  updateSliceOptimistically: (id: string, data: Partial<SliceFormData>) => Promise<void>;
  deleteSliceOptimistically: (id: string) => Promise<void>;
  markSliceAsCompleted: (tempId: string, realSlice?: Slice) => void;
  markSliceAsError: (tempId: string, error: string) => void;
  removeSlice: (id: string) => void;
}

export const useSliceStore = create<SliceStore>((set, get) => ({
  slices: [],

  setSlices: async (slices: Slice[]) => {
    try {
      // Ensure encryption service is initialized
      await encryptionService.initialize();
      
      // Decrypt slice content
      const decryptedSlices = await Promise.all(
        slices.map(async (slice) => ({
          ...slice,
          content: await encryptionService.getDisplayText(slice.content),
          pending: false
        }))
      );
      
      set({ slices: decryptedSlices });
    } catch (error) {
      console.error('Error setting slices:', error);
      // Fallback to original slices if decryption fails
      set({ slices: slices.map(slice => ({ ...slice, pending: false })) });
    }
  },

  setDecryptedSlices: (slices: Slice[]) => {
    // For slices that are already decrypted (e.g., from HomePage query)
    set({ slices: slices.map(slice => ({ ...slice, pending: false })) });
  },

  addSlice: async (data: SliceFormData) => {
    // Ensure encryption service is initialized
    await encryptionService.initialize();
    
    // Encrypt content before saving
    const encryptedContent = await encryptionService.encrypt(data.content);
    const searchTokens = await encryptionService.generateSearchTokens(data.content);
    
    try {
      const { isOnline } = useUIStore.getState();
      
      if (isOnline) {
        // Add operation to queue
        await useOfflineStore.getState().addPendingOperation({
          type: 'create',
          operation: 'slice',
          data: {
            content: encryptedContent, // Send encrypted content to server
            type: data.type,
            time: data.time.toISOString(),
            searchTokens // Include search tokens
          }
        });

        // Process operations immediately (which will handle our operation)
        await useOfflineStore.getState().processOperations();

        // Immediately refetch slices instead of just invalidating
        if (queryClient) {
          await queryClient.refetchQueries({ queryKey: ['slices'] });
          await queryClient.refetchQueries({ queryKey: ['decrypted-slices'] });
        }

        return 'success';
      } else {
        // Queue for later and add optimistically for offline
        const tempId = uuidv4();
        const optimisticSlice: SliceWithStatus = {
          id: tempId,
          content: data.content, // Store decrypted content for immediate readable UI
          type: data.type,
          time: data.time,
          user: 'temp', // Will be replaced when synced
          createdAt: new Date(),
          updatedAt: new Date(),
          pending: true,
          tempId
        };

        // Add to UI immediately for offline mode
        set(state => ({
          slices: [optimisticSlice, ...state.slices]
        }));

        await useOfflineStore.getState().addPendingOperation({
          type: 'create',
          operation: 'slice',
          data: {
            content: encryptedContent, // Send encrypted content to server
            type: data.type,
            time: data.time.toISOString(),
            searchTokens // Include search tokens
          },
          tempId
        });
        
        toast.success('Slice queued for sync');
        return tempId;
      }
    } catch (error) {
      toast.error('Failed to add slice');
      throw error;
    }
  },

  updateSliceOptimistically: async (id: string, data: Partial<SliceFormData>) => {
    const originalSlice = get().slices.find(slice => slice.id === id);
    if (!originalSlice) return;

    const tempId = uuidv4();

    try {
      // Ensure encryption service is initialized
      await encryptionService.initialize();
      
      const updateData: any = {};
      let encryptedContent: string | undefined;
      
      if (data.content !== undefined) {
        // Encrypt content if provided
        encryptedContent = await encryptionService.encrypt(data.content);
        updateData.content = encryptedContent;
        updateData.searchTokens = await encryptionService.generateSearchTokens(data.content);
      }
      if (data.type !== undefined) updateData.type = data.type;
      if (data.time !== undefined) updateData.time = data.time.toISOString();

      // Update UI immediately with decrypted content for readable display
      set(state => ({
        slices: state.slices.map(slice =>
          slice.id === id
            ? {
                ...slice,
                content: data.content !== undefined ? data.content : slice.content,
                type: data.type !== undefined ? data.type : slice.type,
                time: data.time || slice.time,
                pending: true,
                tempId
              }
            : slice
        )
      }));

      await useOfflineStore.getState().addPendingOperation({
        type: 'update',
        operation: 'slice',
        data: updateData,
        originalId: id,
        tempId
      });

      const { isOnline } = useUIStore.getState();
      if (!isOnline) {
        toast.success('Update queued for sync');
      }
    } catch (error) {
      // Revert the optimistic update on error
      set(state => ({
        slices: state.slices.map(slice =>
          slice.id === id ? { ...originalSlice, pending: false } : slice
        )
      }));
      
      toast.error('Failed to update slice');
      throw error;
    }
  },

  deleteSliceOptimistically: async (id: string) => {
    const originalSlice = get().slices.find(slice => slice.id === id);
    if (!originalSlice) return;

    const tempId = uuidv4();

    // Mark as pending delete in UI (but don't remove it yet)
    set(state => ({
      slices: state.slices.map(slice =>
        slice.id === id
          ? { ...slice, pending: true, tempId, isDeleting: true }
          : slice
      )
    }));

    try {
      await useOfflineStore.getState().addPendingOperation({
        type: 'delete',
        operation: 'slice',
        data: null,
        originalId: id,
        tempId
      });

      const { isOnline } = useUIStore.getState();
      if (!isOnline) {
        toast.success('Delete queued for sync');
      }
    } catch (error) {
      // Revert the optimistic delete on error
      set(state => ({
        slices: state.slices.map(slice =>
          slice.id === id ? { ...originalSlice, pending: false } : slice
        )
      }));
      
      toast.error('Failed to delete slice');
      throw error;
    }
  },

  markSliceAsCompleted: async (tempId: string, realSlice?: Slice) => {
    // This is only used for offline mode now, so keep it simple
    let decryptedRealSlice = realSlice;
    
    // If we have a real slice from server, decrypt its content for display
    if (realSlice) {
      try {
        await encryptionService.initialize();
        decryptedRealSlice = {
          ...realSlice,
          content: await encryptionService.getDisplayText(realSlice.content)
        };
      } catch (error) {
        console.error('Failed to decrypt real slice content:', error);
        // Keep original slice if decryption fails
      }
    }
    
    set(state => ({
      slices: state.slices.filter(slice => {
        if (slice.tempId === tempId) {
          // If it was a delete operation, remove it entirely
          if ((slice as any).isDeleting) {
            return false;
          }
          // Otherwise keep it but mark as completed
          return true;
        }
        return true;
      }).map((slice): SliceWithStatus => {
        if (slice.tempId === tempId) {
          if (decryptedRealSlice) {
            // Replace with decrypted real slice from server
            return { 
              ...decryptedRealSlice, 
              pending: false,
              tempId: undefined,
              isDeleting: undefined
            };
          } else {
            // Just mark as completed and clear temporary fields
            return { 
              ...slice, 
              pending: false, 
              tempId: undefined,
              isDeleting: undefined
            };
          }
        }
        return slice;
      })
    }));
  },

  markSliceAsError: (tempId: string, error: string) => {
    set(state => ({
      slices: state.slices.map(slice =>
        slice.tempId === tempId
          ? { ...slice, pending: false, error }
          : slice
      )
    }));
  },

  removeSlice: (id: string) => {
    set(state => ({
      slices: state.slices.filter(slice => slice.id !== id)
    }));
  }
}));

// Register callbacks for operation completion
operationQueue.onOperationSuccess(async (_operationId, tempId, result) => {
  if (tempId) {
    const { markSliceAsCompleted } = useSliceStore.getState();
    
    // If it's a create operation, pass the real slice data
    if (result && result.slice) {
      await markSliceAsCompleted(tempId, result.slice);
    } else {
      await markSliceAsCompleted(tempId);
    }
    
    // Invalidate React Query cache for all slice queries
    if (queryClient) {
      queryClient.invalidateQueries({ queryKey: ['slices'] });
      queryClient.invalidateQueries({ queryKey: ['decrypted-slices'] });
    }
  }
});

operationQueue.onOperationError((_operationId, tempId, error) => {
  if (tempId) {
    const { markSliceAsError } = useSliceStore.getState();
    markSliceAsError(tempId, error);
  }
});