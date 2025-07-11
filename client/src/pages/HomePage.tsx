import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, Filter, RefreshCw } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useUIStore } from '../store/uiStore';
import { useOfflineStore } from '../store/offlineStore';
import { Slice, SliceFormData } from '../types';
import apiService from '../services/api';
import offlineStorage from '../services/offline';
import SliceItem from '../components/SliceItem';
import SliceForm from '../components/SliceForm';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

const HomePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlice, setEditingSlice] = useState<Slice | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const { privacyMode, isOnline } = useUIStore();
  const { addOfflineSlice, syncPendingSlices } = useOfflineStore();
  const queryClient = useQueryClient();

  // Fetch slices for selected date
  const { data: slicesData, isLoading, error, refetch } = useQuery({
    queryKey: ['slices', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const startDate = startOfDay(selectedDate).toISOString();
      const endDate = endOfDay(selectedDate).toISOString();
      
      if (isOnline) {
        return apiService.getSlices({ startDate, endDate });
      } else {
        // Try to get from cache
        const cached = await offlineStorage.getCachedSlices();
        return {
          slices: cached.filter(slice => {
            const sliceDate = new Date(slice.time);
            return sliceDate >= startOfDay(selectedDate) && sliceDate <= endOfDay(selectedDate);
          }),
          pagination: { page: 1, limit: 50, total: 0, pages: 1 }
        };
      }
    },
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create slice mutation
  const createSliceMutation = useMutation({
    mutationFn: async (data: SliceFormData) => {
      if (isOnline) {
        return apiService.createSlice({
          content: data.content,
          type: data.type,
          time: data.time.toISOString()
        });
      } else {
        // Save offline
        await addOfflineSlice({
          content: data.content,
          type: data.type,
          time: data.time,
          user: 'offline', // Will be updated when synced
          tempId: `temp-${Date.now()}`
        });
        return { slice: null };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slices'] });
      setShowAddModal(false);
      toast.success(isOnline ? 'Slice created' : 'Slice saved offline');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create slice');
    }
  });

  // Update slice mutation
  const updateSliceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SliceFormData }) => {
      return apiService.updateSlice(id, {
        content: data.content,
        type: data.type,
        time: data.time.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slices'] });
      setEditingSlice(null);
      toast.success('Slice updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update slice');
    }
  });

  // Delete slice mutation
  const deleteSliceMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteSlice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slices'] });
      toast.success('Slice deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete slice');
    }
  });

  const handleCreateSlice = (data: SliceFormData) => {
    createSliceMutation.mutate(data);
  };

  const handleUpdateSlice = (data: SliceFormData) => {
    if (editingSlice) {
      updateSliceMutation.mutate({ id: editingSlice.id, data });
    }
  };

  const handleDeleteSlice = (id: string) => {
    if (window.confirm('Are you sure you want to delete this slice?')) {
      deleteSliceMutation.mutate(id);
    }
  };

  const handleEditSlice = (slice: Slice) => {
    setEditingSlice(slice);
  };

  const handleRefresh = () => {
    refetch();
    if (isOnline) {
      syncPendingSlices();
    }
  };

  const slices = slicesData?.slices || [];
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isToday ? 'Today' : format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {slices.length} {slices.length === 1 ? 'slice' : 'slices'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Slice
          </Button>
        </div>
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            You're offline. New slices will be saved locally and synced when you're back online.
          </p>
        </div>
      )}

      {/* Content */}
      <div className="space-y-4">
        {isLoading ? (
          <Loading text="Loading slices..." />
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">
              Failed to load slices
            </p>
            <Button onClick={handleRefresh} variant="secondary">
              Try Again
            </Button>
          </div>
        ) : slices.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No slices yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {isToday ? 'Start tracking your day by adding your first slice!' : 'No activity recorded for this date.'}
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Slice
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {slices.map((slice) => (
              <SliceItem
                key={slice.id}
                slice={slice}
                onEdit={handleEditSlice}
                onDelete={handleDeleteSlice}
                privacyMode={privacyMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Slice Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Slice"
      >
        <SliceForm
          onSubmit={handleCreateSlice}
          onCancel={() => setShowAddModal(false)}
          isLoading={createSliceMutation.isPending}
        />
      </Modal>

      {/* Edit Slice Modal */}
      <Modal
        isOpen={!!editingSlice}
        onClose={() => setEditingSlice(null)}
        title="Edit Slice"
      >
        {editingSlice && (
          <SliceForm
            slice={editingSlice}
            onSubmit={handleUpdateSlice}
            onCancel={() => setEditingSlice(null)}
            isLoading={updateSliceMutation.isPending}
          />
        )}
      </Modal>
    </div>
  );
};

export default HomePage;