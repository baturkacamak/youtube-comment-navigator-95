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
        return 'border-emerald-400/80 bg-slate-900/95 text-emerald-100 ring-1 ring-emerald-400/20';
      case 'error':
        return 'border-rose-400/80 bg-slate-900/95 text-rose-100 ring-1 ring-rose-400/20';
      case 'warning':
        return 'border-amber-400/80 bg-slate-900/95 text-amber-100 ring-1 ring-amber-400/20';
      case 'info':
        return 'border-cyan-400/80 bg-slate-900/95 text-cyan-100 ring-1 ring-cyan-400/20';
    }
  };

  return (
    <div
      className={classNames(
        'pointer-events-auto flex items-start gap-3 rounded-xl border-l-4 px-4 py-3 shadow-2xl backdrop-blur-sm',
        'animate-fade-in transition-all duration-300',
        'min-w-[280px] max-w-[360px]',
        getStyles()
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 break-words text-sm leading-5">{message}</div>
      <button
        onClick={() => onDismiss(id)}
        className={classNames(
          'flex-shrink-0 rounded transition-opacity hover:opacity-70',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900',
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
