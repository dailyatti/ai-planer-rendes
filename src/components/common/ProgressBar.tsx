import React from 'react';

interface ProgressBarProps {
  progress: number;
  className?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal';
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  className = '', 
  color = 'blue',
  size = 'md',
  showPercentage = true
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    teal: 'from-teal-500 to-teal-600',
  };

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className={className}>
      {showPercentage && (
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-600 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`bg-gradient-to-r ${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;