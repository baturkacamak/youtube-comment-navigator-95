import React from 'react';
import { CogIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { SettingsButtonProps } from '../../../types/layoutTypes';

const SettingsButton: React.FC<SettingsButtonProps> = ({ onClick }) => {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="p-2 text-gray-800 dark:text-gray-200 transition-transform duration-300 ease-in-out transform hover:rotate-45 hover:text-teal-600 dark:hover:text-teal-400 active:scale-90"
      aria-label={t('Settings')}
    >
      <CogIcon className="w-6 h-6" />
    </button>
  );
};

export default SettingsButton;
