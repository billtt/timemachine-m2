import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, LoginRequest, RegisterRequest } from '../types';
import { STORAGE_KEYS } from '../types';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { clearAllUserData } from '../utils/clearUserData';

interface AuthStore extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
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

          // Only wipe local per-user data (encryption key, caches) when the
          // previous session belonged to a different account. Re-logins after
          // a session timeout should preserve the user's local encryption
          // password so they don't have to re-enter it each time.
          const previousUserId = localStorage.getItem(STORAGE_KEYS.LAST_USER_ID);
          if (previousUserId && previousUserId !== user.id) {
            await clearAllUserData();
          }
          localStorage.setItem(STORAGE_KEYS.LAST_USER_ID, user.id);

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

          // A freshly registered account can never share state with a prior
          // session, so always wipe local per-user data before setting up.
          await clearAllUserData();
          localStorage.setItem(STORAGE_KEYS.LAST_USER_ID, user.id);

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

      logout: async () => {
        // Clear auth token first
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        
        // Clear auth state
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
          error: null
        });
        
        // Clear all user-specific data for security
        await clearAllUserData();
        
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
          // localStorage is the source of truth — it's updated in-place by
          // the sliding-window renewal interceptor. If it's gone, auth was
          // cleared externally (logout, etc.); otherwise adopt its value
          // even if it differs (renewed token).
          const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
          if (!token) {
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
          } else if (token !== state.token) {
            state.token = token;
          }
        }
      }
    }
  )
);