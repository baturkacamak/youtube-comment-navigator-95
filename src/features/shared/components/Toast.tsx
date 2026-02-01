import React from 'react';
import classNames from 'classnames';
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { Toast as ToastType } from '../contexts/ToastContext';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const { id, type, message } = toast;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-200';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-500 text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-200';
    }
  };

  return (
    <div
      className={classNames(
        'flex items-start gap-3 p-4 mb-2 border-l-4 rounded-lg shadow-lg',
        'animate-fade-in transition-all duration-300',
        'min-w-[300px] max-w-[400px]',
        getStyles()
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 break-words">{message}</div>
      <button
        onClick={() => onDismiss(id)}
        className={classNames(
          'flex-shrink-0 hover:opacity-70 transition-opacity',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 rounded',
          type === 'success' && 'focus:ring-green-500',
          type === 'error' && 'focus:ring-red-500',
          type === 'warning' && 'focus:ring-yellow-500',
          type === 'info' && 'focus:ring-blue-500'
        )}
        aria-label="Dismiss notification"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Toast;
