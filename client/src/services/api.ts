import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { 
  ApiResponse, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  Slice, 
  CreateSliceRequest, 
  UpdateSliceRequest, 
  SliceFiltersParams, 
  SearchParams, 
  SliceStats, 
  SyncRequest, 
  SyncResponse 
} from '../types';
import { STORAGE_KEYS } from '../types';
import toast from 'react-hot-toast';
import csrfService from './csrf';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;
  private csrfRefreshPromise: Promise<void> | null = null;
  private retryingRequests = new Set<string>();
  private activeRequests = new Map<string, Promise<any>>();

  constructor() {
    // Always use relative URL - Vite proxy will handle routing to backend
    this.baseURL = '/api';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token and CSRF token
    this.api.interceptors.request.use(
      async (config) => {
        // Add auth token
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add CSRF token for state-changing requests
        if (!['GET', 'HEAD', 'OPTIONS'].includes(config.method?.toUpperCase() || '')) {
          try {
            const csrfToken = await csrfService.getToken();
            config.headers['X-CSRF-Token'] = csrfToken;
          } catch (error) {
            console.error('Failed to get CSRF token:', error);
            // Continue without CSRF token in case of error
          }
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          this.handleAuthError();
        } else if (error.response?.status === 403) {
          // Handle CSRF errors
          const errorCode = error.response?.data?.code;
          if (errorCode === 'CSRF_TOKEN_MISSING' || errorCode === 'CSRF_TOKEN_INVALID') {
            // Create a unique key for this request to prevent duplicate retries
            const requestKey = `${error.config.method}:${error.config.url}:${JSON.stringify(error.config.data)}`;
            
            // If this exact request is already being retried, don't retry again
            if (this.retryingRequests.has(requestKey)) {
              console.log('Request already being retried, skipping duplicate retry');
              return Promise.reject(error);
            }
            
            // Mark this request as being retried
            this.retryingRequests.add(requestKey);
            
            try {
              // Coordinate CSRF token refresh to prevent multiple simultaneous refreshes
              if (!this.csrfRefreshPromise) {
                this.csrfRefreshPromise = csrfService.refreshToken()
                  .then(() => {})
                  .finally(() => {
                    this.csrfRefreshPromise = null;
                  });
              }
              
              // Wait for CSRF token refresh to complete
              await this.csrfRefreshPromise;
              
              // Retry the original request
              const response = await this.api.request(error.config);
              
              // Clean up retry tracking
              this.retryingRequests.delete(requestKey);
              
              return response;
            } catch (csrfError) {
              // Clean up retry tracking
              this.retryingRequests.delete(requestKey);
              toast.error('Security validation failed. Please refresh the page.');
              return Promise.reject(csrfError);
            }
          }
        } else if (error.response?.status >= 500) {
          toast.error('Server error. Please try again later.');
        } else if (error.code === 'ECONNABORTED') {
          toast.error('Request timeout. Please check your connection.');
        } else if (!navigator.onLine) {
          toast.error('No internet connection');
        }
        return Promise.reject(error);
      }
    );
  }

  private handleAuthError() {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    csrfService.clearToken(); // Clear CSRF token on auth error
    window.location.href = '/login';
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    // Create a unique key for request deduplication
    const requestKey = `${config.method}:${config.url}:${JSON.stringify(config.data)}`;
    
    // If this exact request is already in progress, return the existing promise
    if (this.activeRequests.has(requestKey)) {
      console.log('Deduplicating identical request:', requestKey);
      return this.activeRequests.get(requestKey)!;
    }
    
    // Create new request promise
    const requestPromise = this.executeRequest<T>(config);
    
    // Store the promise for deduplication
    this.activeRequests.set(requestKey, requestPromise);
    
    // Clean up after request completes (success or failure)
    requestPromise.finally(() => {
      this.activeRequests.delete(requestKey);
    });
    
    return requestPromise;
  }
  
  private async executeRequest<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.api.request<ApiResponse<T>>(config);
      return response.data.data as T;
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'An error occurred';
      throw new Error(message);
    }
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>({
      method: 'POST',
      url: '/auth/login',
      data: credentials,
    });
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>({
      method: 'POST',
      url: '/auth/register',
      data: userData,
    });
  }

  async getProfile(): Promise<any> {
    return this.request<any>({
      method: 'GET',
      url: '/auth/profile',
    });
  }

  async updateProfile(data: { email?: string }): Promise<any> {
    return this.request<any>({
      method: 'PUT',
      url: '/auth/profile',
      data,
    });
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    return this.request<void>({
      method: 'PUT',
      url: '/auth/password',
      data,
    });
  }

  // Slice endpoints
  async createSlice(data: CreateSliceRequest): Promise<{ slice: Slice }> {
    return this.request<{ slice: Slice }>({
      method: 'POST',
      url: '/slices',
      data,
    });
  }

  async getSlices(params?: SliceFiltersParams): Promise<{ slices: Slice[]; pagination: any }> {
    return this.request<{ slices: Slice[]; pagination: any }>({
      method: 'GET',
      url: '/slices',
      params,
    });
  }

  async getSlice(id: string): Promise<{ slice: Slice }> {
    return this.request<{ slice: Slice }>({
      method: 'GET',
      url: `/slices/${id}`,
    });
  }

  async updateSlice(id: string, data: UpdateSliceRequest): Promise<{ slice: Slice }> {
    return this.request<{ slice: Slice }>({
      method: 'PUT',
      url: `/slices/${id}`,
      data,
    });
  }

  async deleteSlice(id: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      url: `/slices/${id}`,
    });
  }

  async searchSlices(params: SearchParams): Promise<{ slices: Slice[]; total: number; pagination: any }> {
    return this.request<{ slices: Slice[]; total: number; pagination: any }>({
      method: 'GET',
      url: '/slices/search',
      params,
    });
  }

  async getSliceStats(params?: { startDate?: string; endDate?: string }): Promise<SliceStats> {
    return this.request<SliceStats>({
      method: 'GET',
      url: '/slices/stats',
      params,
    });
  }

  // Sync endpoints
  async syncSlices(data: SyncRequest): Promise<SyncResponse> {
    return this.request<SyncResponse>({
      method: 'POST',
      url: '/sync',
      data,
    });
  }

  async getLastSyncTime(): Promise<{ lastSyncTime: Date | null }> {
    return this.request<{ lastSyncTime: Date | null }>({
      method: 'GET',
      url: '/sync/last-sync',
    });
  }

  async getSlicesSince(timestamp: string): Promise<{ slices: Slice[]; count: number }> {
    return this.request<{ slices: Slice[]; count: number }>({
      method: 'GET',
      url: '/sync/since',
      params: { timestamp },
    });
  }

  // Health check
  async healthCheck(): Promise<{ message: string; timestamp: string }> {
    return this.request<{ message: string; timestamp: string }>({
      method: 'GET',
      url: '/health',
    });
  }

  // Utility methods
  isOnline(): boolean {
    return navigator.onLine;
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

export const apiService = new ApiService();
export default apiService;