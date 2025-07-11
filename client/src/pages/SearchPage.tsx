import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { useUIStore } from '../store/uiStore';
import { SearchFormData, SliceType, SLICE_TYPES } from '../types';
import apiService from '../services/api';
import offlineStorage from '../services/offline';
import SliceItem from '../components/SliceItem';
import Button from '../components/Button';
import Input from '../components/Input';
import Loading from '../components/Loading';

const SearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<SliceType | undefined>();
  const [useRegex, setUseRegex] = useState(false);
  const { privacyMode, isOnline } = useUIStore();

  const { register, handleSubmit, reset } = useForm<SearchFormData>();

  // Search query
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['search', searchQuery, selectedType, useRegex],
    queryFn: async () => {
      if (!searchQuery.trim()) return { slices: [], total: 0 };
      
      if (isOnline) {
        return apiService.searchSlices({
          q: searchQuery,
          type: selectedType,
          useRegex
        });
      } else {
        // Search in offline cache
        const results = await offlineStorage.searchCachedSlices(searchQuery, selectedType);
        return {
          slices: results,
          total: results.length,
          pagination: { page: 1, limit: 50, total: results.length, pages: 1 }
        };
      }
    },
    enabled: searchQuery.trim().length > 0,
    refetchOnWindowFocus: false,
  });

  const handleSearch = (data: SearchFormData) => {
    setSearchQuery(data.query);
    setSelectedType(data.type);
    setUseRegex(data.useRegex || false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedType(undefined);
    setUseRegex(false);
    reset();
  };

  const slices = searchResults?.slices || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Search className="w-8 h-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Search Slices
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Find your past activities
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <form onSubmit={handleSubmit(handleSearch)} className="space-y-4">
          {/* Search input */}
          <Input
            label="Search query"
            placeholder="Search for activities..."
            {...register('query', { required: true })}
          />

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="">All categories</option>
                {SLICE_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Regex toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="regex"
                {...register('useRegex')}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="regex" className="text-sm text-gray-700 dark:text-gray-300">
                Use regex
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClearSearch}
            >
              Clear
            </Button>
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {isLoading ? (
          <Loading text="Searching..." />
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400">
              Search failed. Please try again.
            </p>
          </div>
        ) : searchQuery && slices.length === 0 ? (
          <div className="text-center py-8">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No results found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try different keywords or adjust your filters
            </p>
          </div>
        ) : searchQuery && slices.length > 0 ? (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Found {searchResults?.total || 0} results for "{searchQuery}"
              </p>
            </div>
            <div className="space-y-4">
              {slices.map((slice) => (
                <SliceItem
                  key={slice.id}
                  slice={slice}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  privacyMode={privacyMode}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Search your slices
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Enter a search query to find your past activities
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;