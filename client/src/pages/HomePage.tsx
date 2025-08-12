import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, RefreshCw, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { useUIStore } from '../store/uiStore';
import { useSearchStore } from '../store/searchStore';
import { useOfflineStore } from '../store/offlineStore';
import { useSliceStore } from '../store/sliceStore';
import { Slice, SliceFormData } from '../types';
import apiService from '../services/api';
import offlineStorage from '../services/offline';
import { encryptionService } from '../services/encryption';
import SliceItem from '../components/SliceItem';
import SliceForm from '../components/SliceForm';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Loading from '../components/Loading';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefresh from '../components/PullToRefresh';
import { useIsMobile } from '../hooks/useIsMobile';
import { PAGINATION } from '../../../shared/constants';

const HomePage: React.FC = () => {
  const { privacyMode, isOnline, navigationDate, setNavigationDate, highlightedSliceId, setHighlightedSliceId } = useUIStore();
  const { setIsFromSearch } = useSearchStore();
  const [selectedDate, setSelectedDate] = useState(() => {
    // Use navigation date if available, otherwise use today
    if (navigationDate) {
      return new Date(navigationDate);
    }
    return new Date();
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlice, setEditingSlice] = useState<Slice | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const { syncPendingSlices, loadPendingOperations, processOperations } = useOfflineStore();
  const { 
    slices, 
    setDecryptedSlices, 
    addSlice, 
    updateSliceOptimistically, 
    deleteSliceOptimistically 
  } = useSliceStore();
  const queryClient = useQueryClient();

  // Clear navigation date after using it
  useEffect(() => {
    if (navigationDate) {
      // Clear it after component mounts to prevent using it again
      setNavigationDate(null);
    }
  }, [navigationDate, setNavigationDate]);

  // Scroll to and highlight the selected slice
  useEffect(() => {
    if (highlightedSliceId && slices.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(`slice-${highlightedSliceId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Find the child div with the SliceItem content and add highlight
          const sliceContent = element.querySelector('.slice-content');
          if (sliceContent) {
            sliceContent.classList.add('slice-highlighted');
            
            // Remove highlight after 0.5 seconds
            setTimeout(() => {
              sliceContent.classList.remove('slice-highlighted');
              setHighlightedSliceId(null);
            }, 500);
          }
        }
      }, 300);
    }
  }, [highlightedSliceId, slices, setHighlightedSliceId]);

  // Track encryption status changes
  useEffect(() => {
    const checkEncryption = () => {
      const isEnabled = encryptionService.isEncryptionEnabled();
      setEncryptionEnabled(isEnabled);
    };
    
    // Initial check
    encryptionService.initialize().then(checkEncryption);
    
    // Poll for changes (when user sets password in settings)
    const interval = setInterval(checkEncryption, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch slices for selected date (get encrypted data)
  const { data: slicesData, isLoading, error } = useQuery({
    queryKey: ['slices', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const startDate = startOfDay(selectedDate).toISOString();
      const endDate = endOfDay(selectedDate).toISOString();
      
      if (isOnline) {
        return await apiService.getSlices({ startDate, endDate });
      } else {
        // Try to get from cache
        const cached = await offlineStorage.getCachedSlices();
        return {
          slices: cached.filter(slice => {
            const sliceDate = new Date(slice.time);
            return sliceDate >= startOfDay(selectedDate) && sliceDate <= endOfDay(selectedDate);
          }),
          pagination: { page: PAGINATION.DEFAULT_PAGE, limit: PAGINATION.DEFAULT_PAGE_SIZE, total: 0, pages: 1 }
        };
      }
    },
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Separate query for decryption that depends on encryption service state
  const { data: decryptedSlicesData } = useQuery({
    queryKey: ['decrypted-slices', format(selectedDate, 'yyyy-MM-dd'), encryptionEnabled],
    queryFn: async () => {
      if (!slicesData?.slices) return null;
      
      // Ensure encryption service is initialized
      await encryptionService.initialize();
      
      // Decrypt slices
      const decryptedSlices = await Promise.all(
        slicesData.slices.map(async (slice) => {
          const decryptedContent = await encryptionService.getDisplayText(slice.content);
          return {
            ...slice,
            content: decryptedContent
          };
        })
      );
      
      return { ...slicesData, slices: decryptedSlices };
    },
    enabled: !!slicesData?.slices,
    staleTime: 0, // Always decrypt fresh to handle key changes
  });

  // Update slice store when decrypted data changes
  useEffect(() => {
    if (decryptedSlicesData?.slices) {
      // Slices are already decrypted, so we set them directly
      setDecryptedSlices(decryptedSlicesData.slices);
    }
  }, [decryptedSlicesData, setDecryptedSlices]);

  // Listen for slice store changes and invalidate decryption cache
  useEffect(() => {
    // Force refetch decrypted slices when raw slice data changes
    if (slicesData?.slices) {
      queryClient.invalidateQueries({ 
        queryKey: ['decrypted-slices', format(selectedDate, 'yyyy-MM-dd'), encryptionEnabled] 
      });
    }
  }, [slicesData, queryClient, selectedDate, encryptionEnabled]);

  // Load pending operations on mount
  useEffect(() => {
    loadPendingOperations();
  }, [loadPendingOperations]);

  // Create slice mutation (wait for server completion)
  const createSliceMutation = useMutation({
    mutationFn: async (data: SliceFormData) => {
      return await addSlice(data);
    },
    onSuccess: () => {
      setShowAddModal(false);
    },
    onError: (error: any) => {
      console.error('Failed to create slice:', error);
    }
  });

  // Update slice mutation (now using optimistic updates)
  const updateSliceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SliceFormData }) => {
      return await updateSliceOptimistically(id, data);
    },
    onSuccess: () => {
      setEditingSlice(null);
    },
    onError: (error: any) => {
      console.error('Failed to update slice:', error);
    }
  });

  // Delete slice mutation (now using optimistic updates)
  const deleteSliceMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteSliceOptimistically(id);
    },
    onSuccess: () => {
      // No need to do anything, optimistic update already handled it
    },
    onError: (error: any) => {
      console.error('Failed to delete slice:', error);
    }
  });

  const handleCreateSlice = async (data: SliceFormData) => {
    return new Promise<void>((resolve, reject) => {
      createSliceMutation.mutate(data, {
        onSuccess: async () => {
          // Navigate to the date of the created slice
          const sliceDate = new Date(data.time);
          const sliceDateStr = format(sliceDate, 'yyyy-MM-dd');
          const currentDateStr = format(selectedDate, 'yyyy-MM-dd');
          
          setSelectedDate(sliceDate);
          
          // If we're navigating to a different date, ensure that date's data is fetched
          if (sliceDateStr !== currentDateStr) {
            await queryClient.invalidateQueries({ 
              queryKey: ['slices', sliceDateStr] 
            });
            await queryClient.invalidateQueries({ 
              queryKey: ['decrypted-slices', sliceDateStr] 
            });
          }
          
          resolve();
        },
        onError: (error) => reject(error)
      });
    });
  };

  const handleUpdateSlice = async (data: SliceFormData) => {
    if (editingSlice) {
      return new Promise<void>((resolve, reject) => {
        updateSliceMutation.mutate({ id: editingSlice.id, data }, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error)
        });
      });
    }
    return Promise.resolve();
  };

  const handleDeleteSlice = (id: string) => {
    if (window.confirm('Are you sure you want to delete this slice?')) {
      deleteSliceMutation.mutate(id);
    }
  };

  const handleEditSlice = (slice: Slice) => {
    setEditingSlice(slice);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Process any pending operations first
      if (isOnline) {
        processOperations();
        syncPendingSlices();
      }
      
      // Invalidate and refetch slice queries for the current date only
      await queryClient.invalidateQueries({ 
        queryKey: ['slices', format(selectedDate, 'yyyy-MM-dd')] 
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const displaySlices = slices.filter(slice => {
    const sliceDate = new Date(slice.time);
    return sliceDate >= startOfDay(selectedDate) && sliceDate <= endOfDay(selectedDate);
  });
  
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const goToPreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
    setIsFromSearch(false); // Clear the return button when clicking Today
    setHighlightedSliceId(null); // Clear any highlighting
  };

  // Mobile detection
  const isMobile = useIsMobile();

  // Pull to refresh setup (only on mobile)
  const {
    isPulling,
    pullDistance,
    isRefreshing: isPullRefreshing,
    willRefresh
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: isLoading || !isMobile
  });

  return (
    <div className={`max-w-4xl mx-auto ${isMobile ? '' : 'space-y-6'}`}>
      {/* Header - Sticky on mobile */}
      <div className={`flex items-center justify-between ${isMobile ? 'sticky top-0 z-20 px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700' : ''}`}>
        <div className="flex items-center space-x-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={goToPreviousDay}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={goToNextDay}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {!isToday && (
            <Button
              variant="secondary"
              size="sm"
              onClick={goToToday}
              title="Go to Today"
            >
              <Home className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {!isMobile && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            title="Add Slice"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>


      {/* Content */}
      <div 
        className={`${isMobile ? 'relative' : 'space-y-4'}`}
        style={isMobile ? { WebkitOverflowScrolling: 'touch' } : {}}
      >
        {isMobile && (
          <PullToRefresh
            isPulling={isPulling}
            pullDistance={pullDistance}
            isRefreshing={isPullRefreshing}
            willRefresh={willRefresh}
          >
            <div className="space-y-4">
              {/* Offline indicator - Mobile */}
              {!isOnline && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mx-4 mt-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    You're offline. New slices will be saved locally and synced when you're back online.
                  </p>
                </div>
              )}
              
        {isLoading ? (
          <div className="px-4 mt-4">
            <Loading text="Loading slices..." />
          </div>
        ) : error ? (
          <div className="text-center py-8 px-4 mt-4">
            <p className="text-red-600 dark:text-red-400 mb-4">
              Failed to load slices
            </p>
            <Button onClick={handleRefresh} variant="secondary">
              Try Again
            </Button>
          </div>
        ) : displaySlices.length === 0 ? (
          <div className="text-center py-12 px-4 mt-4">
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
          <div className="space-y-4 px-4 pb-4 mt-4">
            {displaySlices.map((slice) => {
              const sliceWithStatus = slice as any;
              // Use tempId for stable keys if available, otherwise use slice.id
              const key = sliceWithStatus.tempId || slice.id;
              const isHighlighted = highlightedSliceId === slice.id;
              
              return (
                <div key={key} id={`slice-${slice.id}`} className={isHighlighted ? 'highlight-target' : ''}>
                  <SliceItem
                    slice={slice}
                    onEdit={handleEditSlice}
                    onDelete={handleDeleteSlice}
                    privacyMode={privacyMode}
                  />
                </div>
              );
            })}
          </div>
        )}
            </div>
          </PullToRefresh>
        )}
        
        {!isMobile && (
          <div className="space-y-4">
            {/* Offline indicator - Desktop in content */}
            {!isOnline && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  You're offline. New slices will be saved locally and synced when you're back online.
                </p>
              </div>
            )}
            
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
            ) : displaySlices.length === 0 ? (
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
                {displaySlices.map((slice) => {
                  const sliceWithStatus = slice as any;
                  // Use tempId for stable keys if available, otherwise use slice.id
                  const key = sliceWithStatus.tempId || slice.id;
                  const isHighlighted = highlightedSliceId === slice.id;
                  
                  return (
                    <div key={key} id={`slice-${slice.id}`} className={isHighlighted ? 'highlight-target' : ''}>
                      <SliceItem
                        slice={slice}
                        onEdit={handleEditSlice}
                        onDelete={handleDeleteSlice}
                        privacyMode={privacyMode}
                      />
                    </div>
                  );
                })}
              </div>
            )}
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