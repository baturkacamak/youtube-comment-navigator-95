import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import SelectBox from '../../shared/components/SelectBox/SelectBox';
import { Option } from '../../../types/utilityTypes';
import { useTranslation } from 'react-i18next';
import { getSettings, saveSettings } from "../utils/settingsUtils";

const ThemeSetting: React.FC = () => {
    const { t } = useTranslation();

    const themeOptions: Option[] = [
        { value: 'light', label: t('Light'), icon: SunIcon },
        { value: 'dark', label: t('Dark'), icon: MoonIcon }
    ];

    const [selectedTheme, setSelectedTheme] = useState<Option>(() => {
        const settings = getSettings();
        return themeOptions.find(option => option.value === (settings.theme || 'light')) || themeOptions[0];
    });

    const applyTheme = (theme: string) => {
        const settings = getSettings();
        settings.theme = theme;
        saveSettings(settings);
        document.documentElement.classList.toggle('dark', theme === 'dark');
    };

    useEffect(() => {
        applyTheme(selectedTheme.value);
    }, [selectedTheme]);

    useEffect(() => {
        const settings = getSettings();
        applyTheme(settings.theme || 'light');
    }, []);

    return (
        <>
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200 mr-2">{t('Theme')}</label>
            <SelectBox
                options={themeOptions}
                selectedOption={themeOptions.find(option => option.value === selectedTheme.value)!}
                setSelectedOption={setSelectedTheme}
                buttonClassName="w-full rounded-lg"
            />
        </>
    );
};

export default ThemeSetting;
