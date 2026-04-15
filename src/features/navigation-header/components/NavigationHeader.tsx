import React from 'react';
import SettingsButton from '../../shared/components/SettingsButton';
import { useTranslation } from 'react-i18next';
import { CommandLineIcon } from '@heroicons/react/24/outline';

interface NavigationHeaderProps {
  openSettings: () => void;
  openDevPanel: () => void;
  showDevPanelButton: boolean;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  openSettings,
  openDevPanel,
  showDevPanelButton,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <SettingsButton onClick={openSettings} aria-label={t('Open settings')} />
        {showDevPanelButton && (
          <button
            type="button"
            onClick={openDevPanel}
            aria-label="Open dev panel"
            className="inline-flex items-center justify-center p-2 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
          >
            <CommandLineIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      <h3
        className="text-lg font-bold text-teal-800 dark:text-teal-200"
        aria-label={t('YouTube Comment Navigator 95')}
      >
        {t('YouTube Comment Navigator 95')}
      </h3>
    </div>
  );
};

export default NavigationHeader;
