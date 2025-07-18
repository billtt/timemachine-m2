import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search, Loader2 } from 'lucide-react';
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

  // Infinite search query
  const {
    data: searchResults,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['search', searchQuery, useRegex],
    queryFn: async ({ pageParam = 1 }) => {
      if (!searchQuery.trim()) return { slices: [], total: 0, pagination: { page: 1, limit: 50, total: 0, pages: 1 } };
      
      if (isOnline) {
        return apiService.searchSlices({
          q: searchQuery,
          useRegex,
          page: pageParam as number,
          limit: 50
        });
      } else {
        // Search in offline cache (no pagination for offline)
        const results = await offlineStorage.searchCachedSlices(searchQuery);
        return {
          slices: results,
          total: results.length,
          pagination: { page: 1, limit: 50, total: results.length, pages: 1 }
        };
      }
    },
    getNextPageParam: (lastPage: any) => {
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: searchQuery.trim().length > 0,
    refetchOnWindowFocus: false,
  });

  const handleSearch = (data: SearchFormData) => {
    setSearchQuery(data.query || '');
    setUseRegex(data.useRegex || false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setUseRegex(false);
    reset();
  };

  // Flatten all pages into a single array of slices
  const allSlices = searchResults?.pages.flatMap((page: any) => page.slices) || [];
  const totalResults = searchResults?.pages[0]?.total || 0;

  // Infinite scroll detection
  const observer = useRef<IntersectionObserver>();
  const lastSliceElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasNextPage, isFetchingNextPage, fetchNextPage]);

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
        ) : searchQuery && allSlices.length === 0 ? (
          <div className="text-center py-8">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No results found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try different keywords or adjust your filters
            </p>
          </div>
        ) : searchQuery && allSlices.length > 0 ? (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Found {totalResults} results for "{searchQuery}"
              </p>
            </div>
            <div className="space-y-4">
              {allSlices.map((slice, index) => (
                <div 
                  key={slice.id}
                  ref={index === allSlices.length - 1 ? lastSliceElementRef : undefined}
                >
                  <SliceItem
                    slice={slice}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    privacyMode={privacyMode}
                  />
                </div>
              ))}
            </div>
            
            {/* Loading indicator for infinite scroll */}
            {isFetchingNextPage && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Loading more results...
                </span>
              </div>
            )}
            
            {/* Manual load more button (fallback) */}
            {hasNextPage && !isFetchingNextPage && allSlices.length >= 50 && (
              <div className="flex justify-center py-8">
                <Button
                  onClick={() => fetchNextPage()}
                  variant="secondary"
                  className="text-sm"
                >
                  Load More Results
                </Button>
              </div>
            )}
            
            {/* End of results indicator */}
            {!hasNextPage && allSlices.length >= 50 && (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="w-8 h-px bg-gray-300 dark:bg-gray-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You've reached the end of the results
                  </p>
                </div>
              </div>
            )}
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