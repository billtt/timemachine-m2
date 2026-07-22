import React from 'react';
import { useLocation } from 'react-router-dom';
import { Home, Search, BarChart3, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import TransitionLink from './TransitionLink';
import { useSearchStore } from '../store/searchStore';

const TABS = [
  { to: '/', icon: Home, label: 'Timeline' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
  { to: '/settings', icon: Settings, label: 'Settings' }
] as const;

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { clearSearch, setIsFromSearch } = useSearchStore();

  const handleTabClick = (to: string) => {
    // Mirror TopBar behavior: reset search state when leaving via nav
    if (to === '/search') {
      clearSearch();
    }
    setIsFromSearch(false);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {TABS.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <TransitionLink
              key={to}
              to={to}
              onClick={() => handleTabClick(to)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </TransitionLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
