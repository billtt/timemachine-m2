import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search, Loader2, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useUIStore } from '../store/uiStore';
import { SearchFormData, Slice } from '../types';
import apiService from '../services/api';
import offlineStorage from '../services/offline';
import { encryptionService } from '../services/encryption';
import SliceItem from '../components/SliceItem';
import Button from '../components/Button';
import Input from '../components/Input';
import Loading from '../components/Loading';

const SearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [showSingleCharPrompt, setShowSingleCharPrompt] = useState(false);
  const { privacyMode, isOnline } = useUIStore();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SearchFormData>();

  // Auto-focus search input when page loads
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Raw search query (returns encrypted data)
  const {
    data: rawSearchResults,
    fetchNextPage: fetchNextRawPage,
    hasNextPage: hasNextRawPage,
    isFetchingNextPage: isFetchingNextRawPage,
    isLoading: isRawLoading,
    error: rawError,
    refetch: refetchSearch,
  } = useInfiniteQuery({
    queryKey: ['raw-search', searchQuery, useRegex],
    queryFn: async ({ pageParam = 1 }) => {
      if (!searchQuery.trim()) return { slices: [], total: 0, pagination: { page: 1, limit: 50, total: 0, pages: 1 } };
      
      if (isOnline) {
        let searchParams: any = {
          q: searchQuery,
          useRegex,
          page: pageParam as number,
          limit: 50
        };

        // If encryption is enabled, generate search tokens
        if (encryptionService.isEncryptionEnabled()) {
          const tokens = await encryptionService.generateQueryTokens(searchQuery);
          if (tokens.length > 0) {
            searchParams.searchTokens = JSON.stringify(tokens);
          }
        }

        return await apiService.searchSlices(searchParams);
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
      // For encrypted search, we need to keep fetching until server says no more pages
      // because client-side filtering might reduce results significantly
      const { page, pages } = lastPage.pagination;
      const hasMore = page < pages;
      return hasMore ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: searchQuery.trim().length > 0,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 30, // Consider data fresh for 30 seconds
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });

  // Decrypted search results
  const {
    data: searchResults,
    isLoading: isDecryptLoading,
    refetch: refetchDecryptedResults
  } = useQuery({
    queryKey: ['decrypted-search', searchQuery, useRegex, encryptionService.isEncryptionEnabled()],
    queryFn: async () => {
      if (!rawSearchResults?.pages) return null;
      
      // Ensure encryption service is initialized
      await encryptionService.initialize();
      
      // Decrypt all pages
      const decryptedPages = await Promise.all(
        rawSearchResults.pages.map(async (page) => ({
          ...page,
          slices: await Promise.all(
            page.slices.map(async (slice) => ({
              ...slice,
              content: await encryptionService.decrypt(slice.content)
            }))
          )
        }))
      );
      
      // If encryption is enabled, filter out false positives
      if (encryptionService.isEncryptionEnabled()) {
        const filteredPages = decryptedPages.map(page => {
          const filteredSlices = page.slices.filter(slice => 
            slice.content.toLowerCase().includes(searchQuery.toLowerCase())
          );
          
          return {
            ...page,
            slices: filteredSlices,
            pagination: {
              ...page.pagination,
              // Keep original server pagination for fetching more pages
            }
          };
        });
        
        return { pages: filteredPages };
      }
      
      return { pages: decryptedPages };
    },
    enabled: !!rawSearchResults?.pages && rawSearchResults.pages.length > 0,
    staleTime: 0, // Always decrypt fresh
  });

  // Trigger decryption refetch when new pages are added
  React.useEffect(() => {
    if (rawSearchResults?.pages && rawSearchResults.pages.length > 0) {
      refetchDecryptedResults();
    }
  }, [rawSearchResults?.pages?.length, refetchDecryptedResults]);

  // Use decrypted data for display, but raw data for pagination
  const fetchNextPage = fetchNextRawPage;
  const hasNextPage = hasNextRawPage;
  const isFetchingNextPage = isFetchingNextRawPage;
  const isLoading = isRawLoading || isDecryptLoading;
  const error = rawError;

  const handleSearch = async (data: SearchFormData) => {
    const query = data.query?.trim() || '';
    
    // Check for single character queries when encryption is enabled
    await encryptionService.initialize();
    if (encryptionService.isEncryptionEnabled() && query.length === 1) {
      // Show the single character prompt and prevent the request
      setShowSingleCharPrompt(true);
      return;
    }
    
    // Clear the single character prompt if it was showing
    setShowSingleCharPrompt(false);
    setSearchQuery(query);
    setUseRegex(data.useRegex || false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setUseRegex(false);
    setShowSingleCharPrompt(false);
    reset();
  };

  const handleRefreshSearch = () => {
    if (searchQuery.trim()) {
      refetchSearch();
    }
  };

  // Flatten all pages into a single array of slices
  const allSlices = searchResults?.pages.flatMap((page: any) => page.slices) || [];
  
  // Calculate total results properly for encrypted search
  const totalResults = encryptionService.isEncryptionEnabled() 
    ? allSlices.length // For encrypted search, count actual filtered results
    : searchResults?.pages[0]?.total || 0; // For non-encrypted, use server total

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
        {showSingleCharPrompt ? (
          <div className="text-center py-8">
            <Search className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Minimum 2 characters required
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              When encryption is enabled, search queries must be at least 2 characters long.
            </p>
          </div>
        ) : isLoading ? (
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
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Found {totalResults}{hasNextPage ? '+' : ''} results for "{searchQuery}"
              </p>
              <button
                onClick={handleRefreshSearch}
                disabled={isLoading}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors dark:hover:bg-gray-800 dark:hover:text-gray-300"
                title="Refresh search results"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="space-y-4">
              {allSlices.map((slice: Slice, index: number) => (
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