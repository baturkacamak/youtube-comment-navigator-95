import React, { useEffect, useState } from 'react';
import SelectBox from '../../shared/components/SelectBox/SelectBox';
import { Option } from '../../../types/utilityTypes';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import { LanguageIcon } from '@heroicons/react/24/outline';
import {isLocalEnvironment, languageOptions} from '../../shared/utils/environmentVariables';

const LanguageSetting: React.FC = () => {
    const { t } = useTranslation();

    const [selectedLanguage, setSelectedLanguage] = useState<Option>(() => {
        const savedLanguage = localStorage.getItem('language');
        return languageOptions.find(option => option.value === savedLanguage) || languageOptions[0];
    });

    useEffect(() => {
        const currentLanguage = selectedLanguage.value;
        localStorage.setItem('language', currentLanguage);

        if (isLocalEnvironment()) {
            i18n.changeLanguage(currentLanguage);
        } else {
            window.postMessage({ type: 'CHANGE_LANGUAGE', payload: { language: currentLanguage } }, '*');
        }
    }, [selectedLanguage]);

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{t('Language')}</label>
            <SelectBox
                options={languageOptions}
                selectedOption={selectedLanguage}
                setSelectedOption={setSelectedLanguage}
                buttonClassName="w-full rounded-lg"
                isSearchable={true}
                DefaultIcon={LanguageIcon}
            />
        </div>
    );
};

export default LanguageSetting;
