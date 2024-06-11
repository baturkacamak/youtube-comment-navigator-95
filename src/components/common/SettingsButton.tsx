// src/components/common/SettingsButton.tsx
import React from 'react';
import { CogIcon } from '@heroicons/react/24/outline';
import {SettingsButtonProps} from "../../types/layoutTypes";

const SettingsButton: React.FC<SettingsButtonProps> = ({ onClick }) => (
    <button onClick={onClick} className="p-2 text-gray-800 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400 transition-colors duration-300">
        <CogIcon className="w-6 h-6" />
    </button>
);
export default SettingsButton;
