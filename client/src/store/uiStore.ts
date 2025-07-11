import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UIState, BeforeInstallPromptEvent } from '../types';
import { STORAGE_KEYS } from '../types';

interface UIStore extends UIState {
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  togglePrivacyMode: () => void;
  setPrivacyMode: (enabled: boolean) => void;
  setOnlineStatus: (online: boolean) => void;
  setInstallPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  showInstallPrompt: () => Promise<void>;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      sidebarOpen: false,
      privacyMode: false,
      isOnline: navigator.onLine,
      installPrompt: null,

      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: newTheme });
        
        // Apply theme to document
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
        
        // Apply theme to document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

      togglePrivacyMode: () => {
        const newMode = !get().privacyMode;
        set({ privacyMode: newMode });
        
        // Store in localStorage for quick access
        localStorage.setItem(STORAGE_KEYS.PRIVACY_MODE, newMode.toString());
      },

      setPrivacyMode: (enabled: boolean) => {
        set({ privacyMode: enabled });
        localStorage.setItem(STORAGE_KEYS.PRIVACY_MODE, enabled.toString());
      },

      setOnlineStatus: (online: boolean) => set({ isOnline: online }),

      setInstallPrompt: (prompt: BeforeInstallPromptEvent | null) => 
        set({ installPrompt: prompt }),

      showInstallPrompt: async () => {
        const { installPrompt } = get();
        if (installPrompt) {
          try {
            await installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            
            if (outcome === 'accepted') {
              console.log('User accepted PWA install');
            } else {
              console.log('User dismissed PWA install');
            }
            
            // Clear the prompt after use
            set({ installPrompt: null });
          } catch (error) {
            console.error('Error showing install prompt:', error);
          }
        }
      }
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        theme: state.theme,
        privacyMode: state.privacyMode
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply theme on hydration
          if (state.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      }
    }
  )
);

// Set up online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useUIStore.getState().setOnlineStatus(true);
  });
  
  window.addEventListener('offline', () => {
    useUIStore.getState().setOnlineStatus(false);
  });
  
  // Handle PWA install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useUIStore.getState().setInstallPrompt(e as BeforeInstallPromptEvent);
  });
  
  // Handle privacy mode keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if (e.key === 'q' || e.key === 'Q') {
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        // Check if not in an input field
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          useUIStore.getState().togglePrivacyMode();
        }
      }
    }
  });
}