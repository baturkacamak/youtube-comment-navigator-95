// src/components/common/SettingsDrawer.tsx
import React, { useState, useEffect } from 'react';
import { XMarkIcon, SunIcon, MoonIcon, SwatchIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { SettingsDrawerProps } from "../../types/layoutTypes";
import SelectBox from './SelectBox';
import NotificationBubble from './NotificationBubble';
import { Option } from "../../types/utilityTypes";
import packageJson from '../../../package.json';

const themeOptions = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon }
];

const colorSchemeOptions = [
    { value: 'default', label: 'Default', icon: SwatchIcon },
    { value: 'blue', label: 'Blue', icon: SwatchIcon },
    { value: 'green', label: 'Green', icon: SwatchIcon },
    // Add more color schemes as needed
];

const languageOptions = [
    { value: 'en', label: 'English', icon: PaperAirplaneIcon },
    { value: 'es', label: 'Spanish', icon: PaperAirplaneIcon },
    { value: 'tr', label: 'Turkish', icon: PaperAirplaneIcon },
    // Add more languages as needed
];

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose }) => {
    const [selectedTheme, setSelectedTheme] = useState<Option>(() => {
        const savedTheme = localStorage.getItem('theme');
        return themeOptions.find(option => option.value === savedTheme) || themeOptions[0];
    });

    const [selectedColorScheme, setSelectedColorScheme] = useState<Option>(() => {
        const savedColorScheme = localStorage.getItem('colorScheme');
        return colorSchemeOptions.find(option => option.value === savedColorScheme) || colorSchemeOptions[0];
    });

    const [selectedLanguage, setSelectedLanguage] = useState<Option>(() => {
        const savedLanguage = localStorage.getItem('language');
        return languageOptions.find(option => option.value === savedLanguage) || languageOptions[0];
    });

    const [showNotification, setShowNotification] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const currentTheme = selectedTheme.value;

        if (savedTheme !== currentTheme) {
            localStorage.setItem('theme', selectedTheme.value);
            document.documentElement.setAttribute('data-theme', selectedTheme.value);
            setShowNotification(true);
        }
    }, [selectedTheme]);

    useEffect(() => {
        const savedColorScheme = localStorage.getItem('colorScheme');
        const currentColorScheme = selectedColorScheme.value;

        if (savedColorScheme !== currentColorScheme) {
            localStorage.setItem('colorScheme', selectedColorScheme.value);
            document.documentElement.setAttribute('data-color-scheme', selectedColorScheme.value);
            setShowNotification(true);
        }
    }, [selectedColorScheme]);

    useEffect(() => {
        const savedLanguage = localStorage.getItem('language');
        const currentLanguage = selectedLanguage.value;

        if (savedLanguage !== currentLanguage) {
            localStorage.setItem('language', selectedLanguage.value);
            // i18n.changeLanguage(selectedLanguage.value);
            setShowNotification(true);
        }
    }, [selectedLanguage]);

    useEffect(() => {
        if (showNotification) {
            const timer = setTimeout(() => setShowNotification(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [showNotification]);

    return (
        <>
            <div
                className={`inset-y-0 left-0 z-50 flex transition-all h-fit duration-500 ${
                    isOpen ? 'ml-0' : '-ml-80'
                }`}
            >
                <div className="bg-white dark:bg-gray-800 w-80 h-full shadow-lg p-4 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Settings</h2>
                            <button onClick={onClose} className="text-gray-800 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div>
                            <div className="mb-4">
                                <label className="text-gray-800 dark:text-gray-200 mb-1">Theme</label>
                                <SelectBox
                                    options={themeOptions}
                                    selectedOption={selectedTheme}
                                    setSelectedOption={setSelectedTheme}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="text-gray-800 dark:text-gray-200 mb-1">Color Scheme</label>
                                <SelectBox
                                    options={colorSchemeOptions}
                                    selectedOption={selectedColorScheme}
                                    setSelectedOption={setSelectedColorScheme}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="text-gray-800 dark:text-gray-200 mb-1">Language</label>
                                <SelectBox
                                    options={languageOptions}
                                    selectedOption={selectedLanguage}
                                    setSelectedOption={setSelectedLanguage}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                        <hr className="mb-4"/>
                        <p>App Version: <strong>{packageJson.version}</strong></p>
                        <p>Developed by <strong>Batur Kacamak</strong></p>
                        <p>Contact: <a href="mailto:hello@batur.info" className="text-teal-600 dark:text-teal-400">hello@batur.info</a></p>
                    </div>
                </div>
                <div className="flex-1" onClick={onClose}></div>
            </div>
            {showNotification && <NotificationBubble message="Settings saved!" position="bottom-left" />}
        </>
    );
};

export default SettingsDrawer;
