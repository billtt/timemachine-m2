import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <TopBar />
      
      {/* Page content */}
      <main className="pt-4">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;