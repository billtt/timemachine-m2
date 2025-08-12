import { create } from 'zustand';

interface SearchStore {
  searchQuery: string;
  useRegex: boolean;
  scrollPosition: number;
  isFromSearch: boolean;
  setSearchQuery: (query: string) => void;
  setUseRegex: (useRegex: boolean) => void;
  setScrollPosition: (position: number) => void;
  setIsFromSearch: (fromSearch: boolean) => void;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  searchQuery: '',
  useRegex: false,
  scrollPosition: 0,
  isFromSearch: false,
  
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  
  setUseRegex: (useRegex: boolean) => set({ useRegex }),
  
  setScrollPosition: (position: number) => set({ scrollPosition: position }),
  
  setIsFromSearch: (fromSearch: boolean) => set({ isFromSearch: fromSearch }),
  
  clearSearch: () => set({ searchQuery: '', useRegex: false, scrollPosition: 0, isFromSearch: false })
}));