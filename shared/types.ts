// Shared types between server and client

export interface User {
  id: string;
  name: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAuth {
  id: string;
  name: string;
  token: string;
}

export interface Slice {
  id: string;
  content: string;
  type: SliceType;
  user: string;
  time: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SliceType = 'work' | 'fun' | 'gym' | 'reading' | 'other';

export const SLICE_TYPES: SliceType[] = ['work', 'fun', 'gym', 'reading', 'other'];

export interface CreateSliceRequest {
  content: string;
  type: SliceType;
  time?: Date;
}

export interface UpdateSliceRequest {
  content?: string;
  type?: SliceType;
  time?: Date;
}

export interface SliceFilters {
  startDate?: Date;
  endDate?: Date;
  type?: SliceType;
  search?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  user: UserAuth;
  token: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Offline sync types
export interface OfflineSlice {
  id: string;
  content: string;
  type: SliceType;
  time: Date;
  createdAt: Date;
  synced: boolean;
  tempId?: string;
}

export interface SyncRequest {
  slices: OfflineSlice[];
}

export interface SyncResponse {
  synced: string[];
  failed: Array<{ id: string; error: string }>;
}

// PWA types
export interface InstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Statistics types
export interface SliceStats {
  totalSlices: number;
  slicesByType: Record<SliceType, number>;
  slicesByDay: Record<string, number>;
  avgSlicesPerDay: number;
  mostActiveDay: string;
  mostActiveType: SliceType;
}

// Search types
export interface SearchFilters extends SliceFilters {
  query?: string;
  useRegex?: boolean;
}

export interface SearchResult {
  slices: Slice[];
  total: number;
  query: string;
  filters: SearchFilters;
}