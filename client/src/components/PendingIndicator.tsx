import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface PendingIndicatorProps {
  pending?: boolean;
  error?: string;
  className?: string;
}

const PendingIndicator: React.FC<PendingIndicatorProps> = ({ 
  pending, 
  error, 
  className = '' 
}) => {
  if (error) {
    return (
      <div className={`flex items-center text-red-500 ${className}`}>
        <AlertCircle className="w-4 h-4" />
      </div>
    );
  }

  if (pending) {
    return (
      <div className={`flex items-center text-blue-500 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  return null;
};

export default PendingIndicator;