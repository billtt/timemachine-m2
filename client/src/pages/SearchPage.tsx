import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useUIStore } from '../store/uiStore';
import { SearchFormData } from '../types';
import apiService from '../services/api';
import offlineStorage from '../services/offline';
import SliceItem from '../components/SliceItem';
import Button from '../components/Button';
import Input from '../components/Input';
import Loading from '../components/Loading';

const SearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const { privacyMode, isOnline } = useUIStore();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SearchFormData>();

  // Auto-focus search input when page loads
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Search query
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['search', searchQuery, useRegex],
    queryFn: async () => {
      if (!searchQuery.trim()) return { slices: [], total: 0 };
      
      if (isOnline) {
        return apiService.searchSlices({
          q: searchQuery,
          useRegex
        });
      } else {
        // Search in offline cache
        const results = await offlineStorage.searchCachedSlices(searchQuery);
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
    setUseRegex(data.useRegex || false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
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
            placeholder="Search for activities..."
            {...register('query', { 
              required: 'Search query is required',
              maxLength: {
                value: 200,
                message: 'Search query must be less than 200 characters'
              }
            })}
            ref={(e) => {
              register('query').ref(e);
              if (e && searchInputRef.current !== e) {
                (searchInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
              }
            }}
            error={errors.query?.message}
          />

          {/* Filters */}
          <div className="space-y-2">
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
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Regex patterns are limited to 100 characters and certain complex patterns are blocked for security.
            </p>
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