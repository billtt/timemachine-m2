import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, UserAuth, LoginRequest, RegisterRequest } from '../types';
import { STORAGE_KEYS } from '../types';
import apiService from '../services/api';
import toast from 'react-hot-toast';

interface AuthStore extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiService.login(credentials);
          const { user, token } = response;
          
          // Store token in localStorage
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          
          set({
            isAuthenticated: true,
            user,
            token,
            isLoading: false,
            error: null
          });
          
          toast.success('Welcome back!');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ isLoading: false, error: message });
          toast.error(message);
          throw error;
        }
      },

      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiService.register(userData);
          const { user, token } = response;
          
          // Store token in localStorage
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          
          set({
            isAuthenticated: true,
            user,
            token,
            isLoading: false,
            error: null
          });
          
          toast.success('Account created successfully!');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Registration failed';
          set({ isLoading: false, error: message });
          toast.error(message);
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
          error: null
        });
        toast.success('Logged out successfully');
      },

      refreshProfile: async () => {
        const { token } = get();
        if (!token) return;
        
        try {
          const response = await apiService.getProfile();
          set({ user: response.user });
        } catch (error) {
          console.error('Failed to refresh profile:', error);
        }
      },

      clearError: () => set({ error: null }),
      
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          // Verify token is still valid on app startup
          const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
          if (token !== state.token) {
            // Token mismatch, clear auth state
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
          }
        }
      }
    }
  )
);