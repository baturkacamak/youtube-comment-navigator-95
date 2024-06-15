import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import SelectBox from '../../shared/components/SelectBox/SelectBox';
import { Option } from '../../../types/utilityTypes';
import { useTranslation } from 'react-i18next';

const ThemeSetting: React.FC = () => {
    const { t } = useTranslation();

    const themeOptions: Option[] = [
        { value: 'light', label: t('Light'), icon: SunIcon },
        { value: 'dark', label: t('Dark'), icon: MoonIcon }
    ];

    const [selectedTheme, setSelectedTheme] = useState<Option>(() => {
        const savedTheme = localStorage.getItem('theme');
        return themeOptions.find(option => option.value === savedTheme) || themeOptions[0];
    });

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const currentTheme = selectedTheme.value;

        if (savedTheme !== currentTheme) {
            localStorage.setItem('theme', selectedTheme.value);
            document.documentElement.setAttribute('data-theme', selectedTheme.value);
        }
    }, [selectedTheme]);

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{t('Theme')}</label>
            <SelectBox
                options={themeOptions}
                selectedOption={selectedTheme}
                setSelectedOption={setSelectedTheme}
                buttonClassName="w-full rounded-lg"
            />
        </div>
    );
};

export default ThemeSetting;
