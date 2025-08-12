import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Settings, 
  Sun, 
  Moon, 
  Eye, 
  EyeOff,
  ArrowLeft
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useSearchStore } from '../store/searchStore';

const TopBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, privacyMode, toggleTheme, togglePrivacyMode } = useUIStore();
  const { clearSearch, setIsFromSearch, isFromSearch } = useSearchStore();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSearchClick = () => {
    // Clear search state when clicking the search icon from top bar
    clearSearch();
    setIsFromSearch(false);
  };

  const handleBackToSearch = () => {
    navigate('/search');
  };

  const handleHomeClick = () => {
    // Clear search state when clicking home button
    setIsFromSearch(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      <div className="px-4 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between h-12">
          {/* Left: App Title */}
          <div className="flex-shrink-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              TimeMachine
            </h1>
          </div>

          {/* Center: Navigation */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {isFromSearch && location.pathname === '/' && (
              <button
                onClick={handleBackToSearch}
                className="p-2 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 transition-colors animate-pulse-slow"
                title="Back to Search Results"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Link
              to="/"
              onClick={handleHomeClick}
              className={`p-2 rounded-lg transition-colors ${
                isActive('/') 
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Timeline"
            >
              <Home className="w-4 h-4" />
            </Link>

            <Link
              to="/search"
              onClick={handleSearchClick}
              className={`p-2 rounded-lg transition-colors ${
                isActive('/search') 
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Search"
            >
              <Search className="w-4 h-4" />
            </Link>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              onClick={togglePrivacyMode}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={privacyMode ? 'Disable Privacy Mode' : 'Enable Privacy Mode'}
            >
              {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <Link
              to="/settings"
              className={`p-2 rounded-lg transition-colors ${
                isActive('/settings') 
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;