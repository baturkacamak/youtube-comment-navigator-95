import React from 'react';

interface ToggleButtonProps {
    isChecked: boolean;
    onToggle: () => void;
    onIcon?: React.ElementType;
    offIcon?: React.ElementType;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ isChecked, onToggle, onIcon: OnIcon, offIcon: OffIcon }) => {
    return (
        <button
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${
                isChecked ? 'bg-teal-600' : 'bg-gray-300 dark:bg-gray-700'
            }`}
            onClick={onToggle}
            style={{ transition: 'background-color 0.3s ease, transform 0.3s ease' }}
        >
            <span
                className={`inline-block w-4 h-4 transform bg-white dark:bg-gray-200 rounded-full transition-transform ${
                    isChecked ? 'translate-x-6 scale-110' : 'translate-x-1 scale-90'
                }`}
                style={{ transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
                {isChecked && OnIcon && <OnIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                {!isChecked && OffIcon && <OffIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
            </span>
        </button>
    );
};

export default ToggleButton;
