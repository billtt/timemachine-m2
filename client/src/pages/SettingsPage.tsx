import React, { useState, useEffect } from 'react';
import { Settings, User, Shield, Database, Info, RefreshCw, Smartphone, LogOut, Key } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { useOfflineStore } from '../store/offlineStore';
import Button from '../components/Button';
import Input from '../components/Input';
import { EncryptionSettings } from '../components/EncryptionSettings';
import ErrorBoundary from '../components/ErrorBoundary';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { getVersionInfo } from '../utils/version';
import { useQueryClient } from '@tanstack/react-query';

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { theme, privacyMode, toggleTheme, togglePrivacyMode } = useUIStore();
  const { pendingSlices, syncPendingSlices } = useOfflineStore();
  const queryClient = useQueryClient();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Check for PWA updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateAvailable(true);
      });

      // Check for updates periodically
      const checkForUpdates = () => {
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration) {
            registration.update();
          }
        });
      };

      // Check for updates every 30 seconds
      const updateInterval = setInterval(checkForUpdates, 30000);
      
      return () => clearInterval(updateInterval);
    }
  }, []);

  const handleAppReload = async () => {
    setIsRefreshing(true);
    
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Unregister and re-register service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.unregister();
        }
        
        // Wait a bit then reload
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        window.location.reload();
      }

      toast.success('App will reload with latest version...');
    } catch (error) {
      console.error('Failed to reload app:', error);
      toast.error('Failed to reload app');
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      // Clear React Query cache before logout
      queryClient.clear();
      await logout();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      await apiService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowChangePassword(false);
    } catch (error) {
      console.error('Change password error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePasswordInputChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isPWA = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone ||
           document.referrer.includes('android-app://');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Settings className="w-8 h-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account and preferences
          </p>
        </div>
      </div>

      {/* Account Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Account Information
          </h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <p className="text-gray-900 dark:text-white">{user?.name}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Member since
            </label>
            <p className="text-gray-900 dark:text-white">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Change Password
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Update your account password
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowChangePassword(!showChangePassword)}
              >
                <Key className="w-4 h-4 mr-1" />
                {showChangePassword ? 'Cancel' : 'Change Password'}
              </Button>
            </div>

            {showChangePassword && (
              <form onSubmit={handleChangePassword} className="space-y-4 mb-4">
                <Input
                  label="Current Password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePasswordInputChange('currentPassword', e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <Input
                  label="New Password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePasswordInputChange('newPassword', e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePasswordInputChange('confirmPassword', e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isChangingPassword}
                    disabled={isChangingPassword}
                  >
                    Update Password
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowChangePassword(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Account Actions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Logout from your account
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Preferences
          </h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Theme
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose your preferred color scheme
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleTheme}
            >
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Privacy Mode
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Hide slice content (press Q to toggle)
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={togglePrivacyMode}
            >
              {privacyMode ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </div>
      </div>

      {/* Encryption Section */}
      <ErrorBoundary fallback={<div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Encryption settings failed to load. Try refreshing the page.</p>
      </div>}>
        <EncryptionSettings />
      </ErrorBoundary>

      {/* PWA Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Smartphone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            App Management
          </h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                App Mode
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isPWA() ? 'Running as installed PWA' : 'Running in browser'}
              </p>
            </div>
            {isPWA() && (
              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs">
                PWA
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Reload App
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {updateAvailable ? 'Update available! Reload to get the latest version.' : 'Force reload app and clear cache'}
              </p>
            </div>
            <Button
              variant={updateAvailable ? "primary" : "secondary"}
              size="sm"
              onClick={handleAppReload}
              disabled={isRefreshing}
              className={updateAvailable ? "animate-pulse" : ""}
            >
              {isRefreshing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                'Reload App'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Offline Data Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Offline Data
          </h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Pending Sync
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {pendingSlices.length} slices waiting to sync
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={syncPendingSlices}
              disabled={pendingSlices.length === 0}
            >
              Sync Now
            </Button>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            About
          </h2>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            TimeMachine v{getVersionInfo().version}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Built: {getVersionInfo().buildDate}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Git SHA: {getVersionInfo().gitSha}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            A modern personal life tracking application
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Built with React, TypeScript, and modern web technologies
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;