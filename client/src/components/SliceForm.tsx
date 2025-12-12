import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Calendar, Clock, Type } from 'lucide-react';
import { SliceFormProps, SliceFormData, SliceType, STORAGE_KEYS, PendingSliceDraft } from '../types';
import Button from './Button';
import { encryptionService } from '../services/encryption';
import toast from 'react-hot-toast';

// Draft auto-save debounce delay (ms)
const DRAFT_SAVE_DELAY = 500;

const SliceForm: React.FC<SliceFormProps> = ({
  slice,
  onSubmit,
  onCancel,
  isLoading = false,
  initialDraft
}) => {
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const lastSubmissionRef = useRef<number>(0);
  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Determine initial values: prioritize slice (for edit), then initialDraft (for recovery), then defaults
  const getInitialContent = () => {
    if (slice?.content) return slice.content;
    if (initialDraft?.content) return initialDraft.content;
    return '';
  };

  const getInitialDate = () => {
    if (slice?.time) return format(new Date(slice.time), 'yyyy-MM-dd');
    if (initialDraft?.date) return initialDraft.date;
    return format(new Date(), 'yyyy-MM-dd');
  };

  const getInitialTime = () => {
    if (slice?.time) return format(new Date(slice.time), 'HH:mm');
    if (initialDraft?.time) return initialDraft.time;
    return format(new Date(), 'HH:mm');
  };

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<SliceFormData>({
    defaultValues: {
      content: getInitialContent(),
      type: slice?.type || 'other',
      time: slice?.time || new Date()
    }
  });

  const selectedType: SliceType = 'other';
  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [selectedTime, setSelectedTime] = useState(getInitialTime());

  // Watch content for draft auto-save
  const watchedContent = watch('content');

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.PENDING_SLICE_DRAFT);
  }, []);

  // Save draft to localStorage (only for new slices, not edits)
  const saveDraft = useCallback(() => {
    // Don't save draft when editing existing slice
    if (slice) return;

    const content = contentRef.current?.value || '';
    // Only save if there's meaningful content
    if (content.trim()) {
      const draft: PendingSliceDraft = {
        content,
        date: selectedDate,
        time: selectedTime,
        savedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.PENDING_SLICE_DRAFT, JSON.stringify(draft));
    } else {
      // Clear draft if content is empty
      clearDraft();
    }
  }, [slice, selectedDate, selectedTime, clearDraft]);

  // Debounced draft save on content change
  useEffect(() => {
    // Don't auto-save for edit mode
    if (slice) return;

    // Clear any existing timeout
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    // Set new timeout for draft save
    draftSaveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, DRAFT_SAVE_DELAY);

    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [watchedContent, selectedDate, selectedTime, slice, saveDraft]);

  // Also save draft when date/time changes
  useEffect(() => {
    if (!slice && contentRef.current?.value?.trim()) {
      saveDraft();
    }
  }, [selectedDate, selectedTime, slice, saveDraft]);

  useEffect(() => {
    if (slice) {
      setValue('content', slice.content);
      setValue('type', 'other');
      setValue('time', new Date(slice.time));
      setSelectedDate(format(new Date(slice.time), 'yyyy-MM-dd'));
      setSelectedTime(format(new Date(slice.time), 'HH:mm'));
    }
  }, [slice, setValue]);

  // Auto-focus content textarea when form loads
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.focus();
    }
  }, []);

  const handleFormSubmit = async (data: SliceFormData) => {
    // Prevent rapid successive submissions (debounce)
    const now = Date.now();
    if (now - lastSubmissionRef.current < 1000) {
      return;
    }
    lastSubmissionRef.current = now;

    // Set validating state
    setIsValidating(true);

    try {
      // Always validate encryption key state before submitting
      const validation = await encryptionService.validateLocalKey();
      if (!validation.isValid) {
        toast.error(`Cannot save slice: ${validation.error}\n\nPlease check your encryption password in Settings.`);
        return;
      }

      // Combine date and time
      const combinedDateTime = new Date(`${selectedDate}T${selectedTime}`);

      // Clear draft before submitting (will be cleared from storage on success)
      clearDraft();

      // Await the submission to complete before finishing
      await onSubmit({
        ...data,
        type: selectedType,
        time: combinedDateTime
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Handle cancel with draft cleanup
  const handleCancel = () => {
    clearDraft();
    onCancel();
  };


  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Type className="inline w-4 h-4 mr-1" />
          What did you do?
        </label>
        <textarea
          {...register('content', { required: 'Content is required' })}
          ref={(e) => {
            register('content').ref(e);
            if (e && contentRef.current !== e) {
              (contentRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
            }
          }}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          placeholder="Describe your activity..."
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.content.message}
          </p>
        )}
      </div>


      {/* Date and Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Calendar className="inline w-3 h-3 mr-1" />
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Clock className="inline w-3 h-3 mr-1" />
            Time
          </label>
          <input
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading || isValidating}
          disabled={isLoading || isValidating}
        >
          {slice ? 'Update' : 'Create'} Slice
        </Button>
      </div>
    </form>
  );
};

export default SliceForm;