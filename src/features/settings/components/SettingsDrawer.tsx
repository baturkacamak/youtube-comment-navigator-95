import React, {useEffect, useState} from 'react';
import {XMarkIcon} from '@heroicons/react/24/outline';
import {useTranslation} from 'react-i18next';
import {SettingsDrawerProps} from "../../../types/layoutTypes";
import NotificationBubble from '../../shared/components/NotificationBubble';
import ThemeSetting from './ThemeSetting';
import TextSizeSetting from './TextSizeSetting';
import LanguageSetting from './LanguageSetting';
import SettingsInfo from './SettingsInfo';
import LoadingSection from "../../loading/components/LoadingSection";

// Dummy implementation for useGoogleDrive
const useGoogleDrive = () => {
    return {
        isSignedIn: false,
        signIn: () => console.log('Sign In'),
        signOut: () => console.log('Sign Out'),
        saveFile: (fileName: string, content: string) => console.log(`Saving ${fileName}: ${content}`),
        loadFile: (fileName: string) => console.log(`Loading ${fileName}`),
    };
};

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({isOpen, onClose}) => {
    const {t} = useTranslation();
    const {isSignedIn, signIn, signOut, saveFile, loadFile} = useGoogleDrive();
    const [showNotification, setShowNotification] = useState(false);

    useEffect(() => {
        if (showNotification) {
            const timer = setTimeout(() => setShowNotification(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [showNotification]);

    const handleSaveSettings = () => {
        const settings = {
            theme: localStorage.getItem('theme'),
            textSize: localStorage.getItem('textSize'),
            language: localStorage.getItem('language'),
        };
        saveFile('settings.json', JSON.stringify(settings));
        setShowNotification(true);
    };

    const handleLoadSettings = () => {
        loadFile('settings.json');
        setShowNotification(true);
    };

    return (
        <>
            <div
                className={`relative inset-y-0 left-0 z-50 flex transition-all h-fit duration-500 ${isOpen ? 'ml-0' : '-ml-80'}`}>
                <div className="bg-white dark:bg-gray-800 w-80 h-full shadow-lg p-4 flex flex-col justify-between"
                     role="dialog" aria-labelledby="settings-title" aria-describedby="settings-description">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 id="settings-title"
                                className="text-lg font-bold text-gray-800 dark:text-gray-200">{t('Settings')}</h2>
                            <button onClick={onClose}
                                    className="text-gray-800 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400"
                                    aria-label={t('Close settings')}>
                                <XMarkIcon className="w-6 h-6"/>
                            </button>
                        </div>
                        <div id="settings-description" className="space-y-6">
                            <ThemeSetting/>
                            <TextSizeSetting/>
                            <LanguageSetting/>
                            <LoadingSection />
                        </div>
                    </div>
                    <SettingsInfo/>
                </div>
                <div className="flex-1" onClick={onClose}></div>
            </div>
            {showNotification && <NotificationBubble message={t("Settings saved!")} position="bottom-left"/>}
        </>
    );
};

export default SettingsDrawer;
