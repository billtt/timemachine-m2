import { create } from 'zustand';
import { Slice, SliceFormData } from '../types';
import { useOfflineStore } from './offlineStore';
import { useUIStore } from './uiStore';
import operationQueue from '../services/operationQueue';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface SliceWithStatus extends Slice {
  pending?: boolean;
  tempId?: string;
  error?: string;
  isDeleting?: boolean;
}

interface SliceStore {
  slices: SliceWithStatus[];
  setSlices: (slices: Slice[]) => void;
  addSliceOptimistically: (data: SliceFormData) => Promise<string>;
  updateSliceOptimistically: (id: string, data: Partial<SliceFormData>) => Promise<void>;
  deleteSliceOptimistically: (id: string) => Promise<void>;
  markSliceAsCompleted: (tempId: string, realSlice?: Slice) => void;
  markSliceAsError: (tempId: string, error: string) => void;
  removeSlice: (id: string) => void;
}

export const useSliceStore = create<SliceStore>((set, get) => ({
  slices: [],

  setSlices: (slices: Slice[]) => {
    set({ slices: slices.map(slice => ({ ...slice, pending: false })) });
  },

  addSliceOptimistically: async (data: SliceFormData) => {
    const tempId = uuidv4();
    const optimisticSlice: SliceWithStatus = {
      id: tempId,
      content: data.content,
      type: data.type,
      time: data.time,
      user: 'temp', // Will be replaced when synced
      createdAt: new Date(),
      updatedAt: new Date(),
      pending: true,
      tempId
    };

    // Add to UI immediately
    set(state => ({
      slices: [optimisticSlice, ...state.slices]
    }));

    try {
      const { isOnline } = useUIStore.getState();
      
      if (isOnline) {
        // Queue the operation for immediate processing
        await useOfflineStore.getState().addPendingOperation({
          type: 'create',
          operation: 'slice',
          data: {
            content: data.content,
            type: data.type,
            time: data.time.toISOString()
          },
          tempId
        });
      } else {
        // Just queue it for later
        await useOfflineStore.getState().addPendingOperation({
          type: 'create',
          operation: 'slice',
          data: {
            content: data.content,
            type: data.type,
            time: data.time.toISOString()
          },
          tempId
        });
        
        toast.success('Slice queued for sync');
      }

      return tempId;
    } catch (error) {
      // Remove the optimistic slice on error
      set(state => ({
        slices: state.slices.filter(slice => slice.tempId !== tempId)
      }));
      
      toast.error('Failed to add slice');
      throw error;
    }
  },

  updateSliceOptimistically: async (id: string, data: Partial<SliceFormData>) => {
    const originalSlice = get().slices.find(slice => slice.id === id);
    if (!originalSlice) return;

    const tempId = uuidv4();

    // Update UI immediately
    set(state => ({
      slices: state.slices.map(slice =>
        slice.id === id
          ? {
              ...slice,
              ...data,
              time: data.time || slice.time,
              pending: true,
              tempId
            }
          : slice
      )
    }));

    try {
      const updateData: any = {};
      if (data.content !== undefined) updateData.content = data.content;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.time !== undefined) updateData.time = data.time.toISOString();

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

  markSliceAsCompleted: (tempId: string, realSlice?: Slice) => {
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
      }).map(slice => {
        if (slice.tempId === tempId) {
          if (realSlice) {
            // Replace with real slice from server, keeping the order
            return { 
              ...realSlice, 
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
operationQueue.onOperationSuccess((operationId: string, tempId?: string, result?: any) => {
  if (tempId) {
    const { markSliceAsCompleted } = useSliceStore.getState();
    
    // If it's a create operation, pass the real slice data
    if (result && result.slice) {
      markSliceAsCompleted(tempId, result.slice);
    } else {
      markSliceAsCompleted(tempId);
    }
  }
});

operationQueue.onOperationError((operationId: string, tempId?: string, error: string) => {
  if (tempId) {
    const { markSliceAsError } = useSliceStore.getState();
    markSliceAsError(tempId, error);
  }
});