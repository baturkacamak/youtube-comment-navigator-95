import React from 'react';
import SettingsButton from '../../shared/components/SettingsButton';
import { useTranslation } from 'react-i18next';

interface NavigationHeaderProps {
  openSettings: () => void;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({ openSettings }) => {
  const { t } = useTranslation();

  return (
    <div className="navigation-header flex items-center justify-between gap-2">
      <SettingsButton onClick={openSettings} aria-label={t('Open settings')} />
      <h3
        className="navigation-header__title text-sm cq-[40rem]:text-base cq-[56rem]:text-lg font-semibold cq-[56rem]:font-bold text-teal-800 dark:text-teal-200 truncate"
        aria-label={t('YouTube Comment Navigator 95')}
      >
        {t('YouTube Comment Navigator 95')}
      </h3>
    </div>
  );
};

export default NavigationHeader;
