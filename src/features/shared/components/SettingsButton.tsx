import React from 'react';
import { CogIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { SettingsButtonProps } from '../../../types/layoutTypes';
import Tooltip from './Tooltip';

const SettingsButton: React.FC<SettingsButtonProps> = ({ onClick }) => {
  const { t } = useTranslation();

  return (
    <Tooltip text={t('Settings')} position="bottom">
      <button
        onClick={onClick}
        className="p-2 text-gray-800 dark:text-gray-200 transition-transform duration-300 ease-in-out transform hover:rotate-45 hover:text-teal-600 dark:hover:text-teal-400 active:scale-90"
        aria-label={t('Settings')}
        data-testid="settings-button"
      >
        <CogIcon className="w-6 h-6" />
      </button>
    </Tooltip>
  );
};

export default SettingsButton;
