import React from 'react';
import { Outlet } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Eye, 
  EyeOff, 
  Search, 
  Calendar, 
  Settings,
  LogOut,
  Wifi,
  WifiOff,
  Download
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useOfflineStore } from '../store/offlineStore';
import { clsx } from 'clsx';

const Layout: React.FC = () => {
  const { 
    theme, 
    sidebarOpen, 
    privacyMode, 
    isOnline, 
    installPrompt,
    toggleTheme, 
    toggleSidebar, 
    setSidebarOpen,
    togglePrivacyMode,
    showInstallPrompt
  } = useUIStore();
  
  const { user, logout } = useAuthStore();
  const { pendingSlices, syncInProgress } = useOfflineStore();

  const handleLogout = () => {
    logout();
    setSidebarOpen(false);
  };

  const menuItems = [
    { icon: Calendar, label: 'Timeline', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              TimeMachine
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name}
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  {isOnline ? (
                    <><Wifi className="w-3 h-3" /><span>Online</span></>
                  ) : (
                    <><WifiOff className="w-3 h-3" /><span>Offline</span></>
                  )}
                  {pendingSlices.length > 0 && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                      {pendingSlices.length} pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          {/* Controls */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'light' ? (
                <><Moon className="w-5 h-5" /><span>Dark Mode</span></>
              ) : (
                <><Sun className="w-5 h-5" /><span>Light Mode</span></>
              )}
            </button>

            {/* Privacy mode toggle */}
            <button
              onClick={togglePrivacyMode}
              className="flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {privacyMode ? (
                <><EyeOff className="w-5 h-5" /><span>Privacy Mode (Q)</span></>
              ) : (
                <><Eye className="w-5 h-5" /><span>Privacy Mode (Q)</span></>
              )}
            </button>

            {/* Install PWA */}
            {installPrompt && (
              <button
                onClick={showInstallPrompt}
                className="flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="w-5 h-5" />
                <span>Install App</span>
              </button>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Mobile header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-4">
              {/* Sync indicator */}
              {syncInProgress && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin" />
                  <span>Syncing...</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;