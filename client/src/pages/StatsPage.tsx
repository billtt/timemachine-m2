import React from 'react';
import { BarChart3, TrendingUp, Clock, Target } from 'lucide-react';

const StatsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <BarChart3 className="w-8 h-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Statistics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Insights into your activity patterns
          </p>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Statistics Coming Soon
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We're working on detailed analytics and insights about your activity patterns.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Clock className="w-8 h-8 text-blue-600 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white">Time Tracking</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                See how you spend your time across different activities
              </p>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white">Trends</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Identify patterns and trends in your daily activities
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Target className="w-8 h-8 text-purple-600 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white">Goals</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set and track goals for different activity types
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;