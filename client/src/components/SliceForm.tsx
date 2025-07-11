import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Calendar, Clock, Type } from 'lucide-react';
import { SliceFormProps, SliceFormData, SliceType, SLICE_TYPES } from '../types';
import Button from './Button';
import Input from './Input';

const SliceForm: React.FC<SliceFormProps> = ({
  slice,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<SliceFormData>({
    defaultValues: {
      content: slice?.content || '',
      type: slice?.type || 'other',
      time: slice?.time || new Date()
    }
  });

  const [selectedType, setSelectedType] = useState<SliceType>(slice?.type || 'other');
  const [selectedDate, setSelectedDate] = useState(
    slice?.time ? format(new Date(slice.time), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [selectedTime, setSelectedTime] = useState(
    slice?.time ? format(new Date(slice.time), 'HH:mm') : format(new Date(), 'HH:mm')
  );

  useEffect(() => {
    if (slice) {
      setValue('content', slice.content);
      setValue('type', slice.type);
      setValue('time', new Date(slice.time));
      setSelectedType(slice.type);
      setSelectedDate(format(new Date(slice.time), 'yyyy-MM-dd'));
      setSelectedTime(format(new Date(slice.time), 'HH:mm'));
    }
  }, [slice, setValue]);

  const handleFormSubmit = (data: SliceFormData) => {
    // Combine date and time
    const combinedDateTime = new Date(`${selectedDate}T${selectedTime}`);
    
    onSubmit({
      ...data,
      type: selectedType,
      time: combinedDateTime
    });
  };

  const getTypeIcon = (type: SliceType) => {
    const icons = {
      work: '💼',
      fun: '🎉',
      gym: '💪',
      reading: '📚',
      other: '📝'
    };
    return icons[type];
  };

  const getTypeColor = (type: SliceType) => {
    const colors = {
      work: 'border-blue-500 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30',
      fun: 'border-green-500 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30',
      gym: 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30',
      reading: 'border-purple-500 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30',
      other: 'border-gray-500 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/20 dark:hover:bg-gray-900/30'
    };
    return colors[type];
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

      {/* Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Category
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SLICE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                selectedType === type
                  ? `${getTypeColor(type)} border-current`
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getTypeIcon(type)}</span>
                <span className="text-sm font-medium capitalize">{type}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="inline w-4 h-4 mr-1" />
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Clock className="inline w-4 h-4 mr-1" />
            Time
          </label>
          <input
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {slice ? 'Update' : 'Create'} Slice
        </Button>
      </div>
    </form>
  );
};

export default SliceForm;