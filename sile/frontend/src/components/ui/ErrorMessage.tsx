import React from 'react';

interface ErrorMessageProps {
  message?: string | null;
  className?: string;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  className = '',
  onDismiss,
}) => {
  if (!message) return null;

  return (
    <div
      className={`rounded-lg bg-red-50 border border-red-200 p-3.5 flex items-start justify-between text-sm text-red-700 ${className}`}
      role="alert"
    >
      <div className="flex items-center space-x-2">
        <svg
          className="h-4 w-4 text-red-500 flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium">{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 focus:outline-none ml-2"
          aria-label="Dismiss error"
        >
          <span className="text-base font-bold">&times;</span>
        </button>
      )}
    </div>
  );
};
