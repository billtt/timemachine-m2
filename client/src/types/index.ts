// Re-export shared types
export * from '../../../shared/types';

// Additional frontend-specific types
export interface AuthState {
  isAuthenticated: boolean;
  user: UserAuth | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface SliceState {
  slices: Slice[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  total: number;
}

export interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  privacyMode: boolean;
  isOnline: boolean;
  installPrompt: any | null;
}

export interface OfflineState {
  isOnline: boolean;
  pendingSlices: OfflineSlice[];
  syncInProgress: boolean;
  lastSyncTime: Date | null;
}

// Form types
export interface SliceFormData {
  content: string;
  type: SliceType;
  time: Date;
}

export interface LoginFormData {
  username: string;
  password: string;
}

export interface RegisterFormData extends LoginFormData {
  email?: string;
}

export interface SearchFormData {
  query: string;
  type?: SliceType;
  startDate?: Date;
  endDate?: Date;
  useRegex?: boolean;
}

// Component prop types
export interface SliceItemProps {
  slice: Slice;
  onEdit: (slice: Slice) => void;
  onDelete: (id: string) => void;
  privacyMode?: boolean;
}

export interface SliceFormProps {
  slice?: Slice;
  onSubmit: (data: SliceFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps {
  label?: string;
  error?: string;
  className?: string;
  [key: string]: any;
}

// Hook types
export interface UseSlicesOptions {
  search?: string;
  type?: SliceType;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}

export interface UseSlicesReturn {
  slices: Slice[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export interface UseOfflineReturn {
  isOnline: boolean;
  pendingSlices: OfflineSlice[];
  addOfflineSlice: (slice: Omit<OfflineSlice, 'id' | 'createdAt' | 'synced'>) => void;
  syncPendingSlices: () => Promise<void>;
  syncInProgress: boolean;
  lastSyncTime: Date | null;
}

// API types
export interface ApiError {
  message: string;
  status: number;
  details?: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SliceFiltersParams extends PaginationParams {
  startDate?: string;
  endDate?: string;
  type?: SliceType;
  search?: string;
}

export interface SearchParams extends PaginationParams {
  q: string;
  type?: SliceType;
  useRegex?: boolean;
}

// PWA types
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface ServiceWorkerUpdateEvent {
  waiting: ServiceWorker;
  skipWaiting: () => void;
}

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'timemachine_auth_token',
  THEME: 'timemachine_theme',
  PRIVACY_MODE: 'timemachine_privacy_mode',
  LAST_SYNC: 'timemachine_last_sync',
  OFFLINE_SLICES: 'timemachine_offline_slices'
} as const;