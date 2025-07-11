import React from 'react';
import { Settings, User, Shield, Database, Info } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { useOfflineStore } from '../store/offlineStore';
import Button from '../components/Button';

const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { theme, privacyMode, toggleTheme, togglePrivacyMode } = useUIStore();
  const { pendingSlices, syncPendingSlices } = useOfflineStore();

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
            TimeMachine v2.0.0
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