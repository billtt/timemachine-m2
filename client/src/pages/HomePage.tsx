import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar } from 'lucide-react';
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import { useUIStore } from '../store/uiStore';
import { useSearchStore } from '../store/searchStore';
import { useOfflineStore } from '../store/offlineStore';
import { useSliceStore } from '../store/sliceStore';
import { Slice, SliceFormData, SliceType, STORAGE_KEYS, PendingSliceDraft, ReflectionStatus } from '../types';
import apiService from '../services/api';
import offlineStorage from '../services/offline';
import { encryptionService } from '../services/encryption';
import SliceItem from '../components/SliceItem';
import DayHeader from '../components/DayHeader';
import DaySummarySidebar from '../components/DaySummarySidebar';
import SliceForm from '../components/SliceForm';
import Modal from '../components/Modal';
import Button from '../components/Button';
import ReflectionModal, { REFLECTION_EMOJI } from '../components/ReflectionModal';
import Loading from '../components/Loading';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { withViewTransition } from '../utils/viewTransition';
import PullToRefresh from '../components/PullToRefresh';
import { useIsMobile } from '../hooks/useIsMobile';
import { PAGINATION } from '../../../shared/constants';

// Draft expiry time (24 hours in ms) - should match SliceForm constant
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000;

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
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<PendingSliceDraft | undefined>(undefined);
  const draftCheckedRef = useRef(false);  // Prevent duplicate draft checks in StrictMode
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

  // Fetch reflection status for the selected date (used to color the reflection button)
  const { data: reflectionData, refetch: refetchReflection } = useQuery({
    queryKey: ['reflection', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => apiService.getReflection(format(selectedDate, 'yyyy-MM-dd')),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5
  });

  // Derive reflection status from raw server data without decrypting
  // (empty answers are stored as "" regardless of encryption state)
  const reflectionStatus: ReflectionStatus = useMemo(() => {
    const reflection = reflectionData?.reflection;
    if (!reflection || reflection.questions.length === 0) return 'empty';
    const nonEmpty = reflection.questions.filter(q => q.answer.trim() !== '');
    if (nonEmpty.length === 0) return 'empty';
    if (nonEmpty.length === reflection.questions.length) return 'full';
    return 'partial';
  }, [reflectionData]);

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

  // Check for pending slice draft on mount (for session timeout recovery)
  useEffect(() => {
    // Prevent duplicate execution in React StrictMode
    if (draftCheckedRef.current) return;
    draftCheckedRef.current = true;

    const checkPendingDraft = () => {
      try {
        const draftJson = localStorage.getItem(STORAGE_KEYS.PENDING_SLICE_DRAFT);
        if (!draftJson) return;

        const draft: PendingSliceDraft = JSON.parse(draftJson);

        // Check if draft is expired (older than 24 hours)
        const now = Date.now();
        if (now - draft.savedAt > DRAFT_EXPIRY_MS) {
          // Draft expired, remove it
          localStorage.removeItem(STORAGE_KEYS.PENDING_SLICE_DRAFT);
          return;
        }

        // Valid draft found - restore it
        setPendingDraft(draft);
        setShowAddModal(true);
        toast.success('Your unsaved slice has been restored');
      } catch (error) {
        // Invalid draft data, clear it
        localStorage.removeItem(STORAGE_KEYS.PENDING_SLICE_DRAFT);
      }
    };

    checkPendingDraft();
  }, []);

  // Create slice mutation (wait for server completion)
  const createSliceMutation = useMutation({
    mutationFn: async (data: SliceFormData) => {
      return await addSlice(data);
    },
    onSuccess: () => {
      setShowAddModal(false);
      setPendingDraft(undefined);  // Clear draft state on success
    },
    onError: (error: any) => {
      console.error('Failed to create slice:', error);
    }
  });

  // Handle closing the add modal
  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setPendingDraft(undefined);  // Clear draft state when modal is closed
  };

  // Update slice mutation (now using optimistic updates)
  const updateSliceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SliceFormData }) => {
      return await updateSliceOptimistically(id, data);
    },
    onSuccess: async () => {
      setEditingSlice(null);
      // Refetch current date's data after update
      const currentDateStr = format(selectedDate, 'yyyy-MM-dd');
      await queryClient.refetchQueries({ 
        queryKey: ['slices', currentDateStr],
        exact: true
      });
      await queryClient.refetchQueries({ 
        queryKey: ['decrypted-slices', currentDateStr],
        exact: true
      });
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
    onSuccess: async () => {
      // Refetch current date's data after delete
      const currentDateStr = format(selectedDate, 'yyyy-MM-dd');
      await queryClient.refetchQueries({ 
        queryKey: ['slices', currentDateStr],
        exact: true
      });
      await queryClient.refetchQueries({ 
        queryKey: ['decrypted-slices', currentDateStr],
        exact: true
      });
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
          
          setSelectedDate(sliceDate);
          
          // Refetch (not just invalidate) the specific date's data
          await queryClient.refetchQueries({ 
            queryKey: ['slices', sliceDateStr],
            exact: true
          });
          await queryClient.refetchQueries({ 
            queryKey: ['decrypted-slices', sliceDateStr],
            exact: true  
          });
          
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

  const typeCounts = useMemo(() => {
    const counts: Partial<Record<SliceType, number>> = {};
    for (const slice of displaySlices) {
      counts[slice.type] = (counts[slice.type] || 0) + 1;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slices, selectedDate]);
  
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const goToPreviousDay = () => {
    withViewTransition(() => setSelectedDate(subDays(selectedDate, 1)));
  };

  const goToNextDay = () => {
    withViewTransition(() => setSelectedDate(addDays(selectedDate, 1)));
  };

  const goToToday = () => {
    withViewTransition(() => {
      setSelectedDate(new Date());
      setIsFromSearch(false); // Clear the return button when clicking Today
      setHighlightedSliceId(null); // Clear any highlighting
    });
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
      <div className={`${isMobile ? 'sticky top-0 z-20 px-2 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800' : ''}`}>
        <DayHeader
          selectedDate={selectedDate}
          isToday={isToday}
          isMobile={isMobile}
          typeCounts={typeCounts}
          reflectionEmoji={REFLECTION_EMOJI[reflectionStatus]}
          isRefreshing={isLoading || isRefreshing}
          onPrev={goToPreviousDay}
          onNext={goToNextDay}
          onToday={goToToday}
          onSelectDate={(date) => withViewTransition(() => setSelectedDate(date))}
          onReflection={() => setShowReflectionModal(true)}
          onAdd={() => setShowAddModal(true)}
          onRefresh={handleRefresh}
        />
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
          <div className="text-center py-12 px-4 mt-4 animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-900/10 flex items-center justify-center">
              <Calendar className="w-9 h-9 text-primary-400 dark:text-primary-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">
              {isToday ? 'A blank page today' : 'Nothing recorded'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs mx-auto">
              {isToday ? 'Capture your first moment of the day.' : 'No activity was recorded for this date.'}
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Slice
            </Button>
          </div>
        ) : (
          <div className="timeline space-y-3 mx-4 mb-4 mt-4">
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
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6 lg:items-start">
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
              <div className="text-center py-12 animate-fade-in">
                <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-900/10 flex items-center justify-center">
                  <Calendar className="w-9 h-9 text-primary-400 dark:text-primary-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">
                  {isToday ? 'A blank page today' : 'Nothing recorded'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs mx-auto">
                  {isToday ? 'Capture your first moment of the day.' : 'No activity was recorded for this date.'}
                </p>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Slice
                </Button>
              </div>
            ) : (
              <div className="timeline space-y-3">
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

          {/* Right sidebar - wide screens only */}
          <div className="hidden lg:block sticky top-20">
            <DaySummarySidebar
              typeCounts={typeCounts}
              total={displaySlices.length}
              reflectionStatus={reflectionStatus}
              reflectionEmoji={REFLECTION_EMOJI[reflectionStatus]}
              onOpenReflection={() => setShowReflectionModal(true)}
            />
          </div>
          </div>
        )}
      </div>

      {/* Floating add button - mobile only */}
      {isMobile && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed right-5 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-600/40 active:scale-95 transition-transform flex items-center justify-center"
          style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
          title="Add Slice"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Add Slice Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        title="Add New Slice"
      >
        <SliceForm
          onSubmit={handleCreateSlice}
          onCancel={handleCloseAddModal}
          isLoading={createSliceMutation.isPending}
          initialDraft={pendingDraft}
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

      {/* Daily Reflection Modal */}
      <ReflectionModal
        isOpen={showReflectionModal}
        onClose={() => setShowReflectionModal(false)}
        date={selectedDate}
        onSaved={() => {
          refetchReflection();
        }}
      />
    </div>
  );
};

export default HomePage;