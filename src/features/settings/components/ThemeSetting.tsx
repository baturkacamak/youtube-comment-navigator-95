import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import SelectBox from '../../shared/components/SelectBox/SelectBox';
import { Option } from '../../../types/utilityTypes';
import { useTranslation } from 'react-i18next';
import { getSettings, saveSettings } from '../utils/settingsUtils';

const ThemeSetting: React.FC = () => {
  const { t } = useTranslation();

  const themeOptions: Option[] = [
    { value: 'light', label: t('Light'), icon: SunIcon },
    { value: 'dark', label: t('Dark'), icon: MoonIcon },
  ];

  const [selectedTheme, setSelectedTheme] = useState<Option>(() => {
    try {
      const settings = getSettings();
      const themeValue = (settings.theme as string) || 'light';
      return themeOptions.find((option) => option.value === themeValue) || themeOptions[0];
    } catch (error) {
      console.error('Error initializing theme setting:', error);
      return themeOptions[0]; // Default to light theme
    }
  });

  const applyTheme = (theme: string) => {
    try {
      if (!theme || typeof theme !== 'string') {
        console.warn('Invalid theme value provided to applyTheme');
        return;
      }

      const settings = getSettings();
      settings.theme = theme;
      saveSettings(settings);

      // Safely toggle dark class
      try {
        document.documentElement.classList.toggle('dark', theme === 'dark');
      } catch (domError) {
        console.error('Error toggling dark class on document element:', domError);
      }
    } catch (error) {
      console.error('Error applying theme:', error);
    }
  };

  useEffect(() => {
    applyTheme(selectedTheme.value);
  }, [selectedTheme]);

  useEffect(() => {
    const settings = getSettings();
    applyTheme((settings.theme as string) || 'light');
  }, []);

  return (
    <>
      <label className="text-sm font-medium text-gray-800 dark:text-gray-200 mr-2">
        {t('Theme')}
      </label>
      <SelectBox
        options={themeOptions}
        selectedOption={themeOptions.find((option) => option.value === selectedTheme.value)!}
        setSelectedOption={setSelectedTheme}
        buttonClassName="w-full rounded-lg"
        testId="theme-select"
      />
    </>
  );
};

export default ThemeSetting;
