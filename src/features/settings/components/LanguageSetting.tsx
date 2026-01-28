import React, { useEffect, useState } from 'react';
import SelectBox from '../../shared/components/SelectBox/SelectBox';
import { Option } from '../../../types/utilityTypes';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import { LanguageIcon } from '@heroicons/react/24/outline';
import { isLocalEnvironment, languageOptions } from '../../shared/utils/appConstants';
import { getSettings, saveSettings } from '../utils/settingsUtils';

const LanguageSetting: React.FC = () => {
  const { t } = useTranslation();

  const getInitialLanguage = (): Option => {
    try {
      const settings = getSettings();
      let detectedLanguage = settings.language;

      if (!detectedLanguage) {
        // Safely get browser language with fallback
        const browserLanguage = (navigator.language || navigator.languages?.[0] || 'en').split(
          '-'
        )[0];
        detectedLanguage =
          languageOptions.find((option) => option.value === browserLanguage)?.value || 'en';
      }

      return (
        languageOptions.find((option) => option.value === detectedLanguage) || languageOptions[0]
      );
    } catch (error) {
      console.error('Error detecting initial language:', error);
      return languageOptions[0]; // Return default (English)
    }
  };

  const [selectedLanguage, setSelectedLanguage] = useState<Option>(getInitialLanguage);

  const applyLanguage = (language: string) => {
    try {
      if (!language || typeof language !== 'string') {
        console.warn('Invalid language value provided to applyLanguage');
        return;
      }

      const settings = getSettings();
      settings.language = language;
      saveSettings(settings);

      if (isLocalEnvironment()) {
        i18n.changeLanguage(language).catch((error) => {
          console.error('Error changing language in i18n:', error);
        });
      } else {
        window.postMessage({ type: 'CHANGE_LANGUAGE', payload: { language } }, '*');
      }
    } catch (error) {
      console.error('Error applying language:', error);
    }
  };

  useEffect(() => {
    applyLanguage(selectedLanguage.value);
  }, [selectedLanguage]);

  useEffect(() => {
    const settings = getSettings();
    applyLanguage(settings.language || selectedLanguage.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <label className="text-sm font-medium text-gray-800 dark:text-gray-200 mr-2 select-none">
        {t('Language')}
      </label>
      <SelectBox
        options={languageOptions}
        selectedOption={selectedLanguage}
        setSelectedOption={setSelectedLanguage}
        buttonClassName="w-full rounded-lg"
        isSearchable={true}
        DefaultIcon={LanguageIcon}
      />
    </>
  );
};

export default LanguageSetting;
