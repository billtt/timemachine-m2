import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <TopBar />

      {/* Page content: bottom padding clears the mobile bottom nav */}
      <main className="pt-4 pb-20 md:pb-0">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Layout;
