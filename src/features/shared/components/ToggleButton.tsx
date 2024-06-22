import React from 'react';

interface ToggleButtonProps {
    isChecked: boolean;
    onToggle: () => void;
    label: string;
    onIcon?: React.ElementType;   // Use React.ElementType for the icon type
    offIcon?: React.ElementType;  // Use React.ElementType for the icon type
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ isChecked, onToggle, label, onIcon: OnIcon, offIcon: OffIcon }) => {
    return (
        <div className="flex items-center mb-4" onClick={onToggle}>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mr-2 cursor-pointer select-none">{label}</label>
            <button
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${
                    isChecked ? 'bg-teal-600' : 'bg-gray-300 dark:bg-gray-700'
                }`}
                onClick={(e) => {
                    e.stopPropagation(); // Prevent the event from bubbling up to the parent div
                    onToggle();
                }}
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
        </div>
    );
};

export default ToggleButton;
