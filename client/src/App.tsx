import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useOfflineStore } from './store/offlineStore';
import { useUIStore } from './store/uiStore';
import offlineStorage from './services/offline';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 401 errors
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { isAuthenticated } = useAuthStore();
  const { loadPendingSlices } = useOfflineStore();
  const { setTheme } = useUIStore();

  useEffect(() => {
    // Initialize offline storage
    const initializeOfflineStorage = async () => {
      try {
        await offlineStorage.init();
        await loadPendingSlices();
      } catch (error) {
        console.error('Failed to initialize offline storage:', error);
      }
    };

    initializeOfflineStorage();
  }, [loadPendingSlices]);

  useEffect(() => {
    // Apply theme on app load
    const savedTheme = localStorage.getItem('ui-store');
    if (savedTheme) {
      try {
        const parsedTheme = JSON.parse(savedTheme);
        if (parsedTheme.state?.theme) {
          setTheme(parsedTheme.state.theme);
        }
      } catch (error) {
        console.error('Failed to parse saved theme:', error);
      }
    }
  }, [setTheme]);


  return (
    <QueryClientProvider client={queryClient}>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="App">
          <Routes>
            <Route 
              path="/login" 
              element={
                isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
              } 
            />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#374151', // gray-700
                color: '#f9fafb', // gray-50
                border: '1px solid #4b5563', // gray-600
              },
              success: {
                style: {
                  background: '#059669', // green-600
                  color: '#ffffff',
                },
              },
              error: {
                style: {
                  background: '#dc2626', // red-600
                  color: '#ffffff',
                },
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;