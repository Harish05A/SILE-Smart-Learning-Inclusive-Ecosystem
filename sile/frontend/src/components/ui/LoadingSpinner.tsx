import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  label = 'Loading...',
}) => {
  const sizeMap = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`} role="status">
      <div
        className={`animate-spin rounded-full border-indigo-200 border-t-indigo-600 ${sizeMap[size]}`}
      />
      {label && <span className="mt-2 text-xs font-medium text-slate-500">{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  );
};
