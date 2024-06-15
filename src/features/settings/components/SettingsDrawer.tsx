import React, { useState, useEffect } from 'react';
import { XMarkIcon, CodeBracketIcon, EnvelopeIcon, UserCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { SettingsDrawerProps } from "../../../types/layoutTypes";
import NotificationBubble from '../../shared/components/NotificationBubble';
import packageJson from '../../../../package.json';
import ThemeSetting from './ThemeSetting';
import TextSizeSetting from './TextSizeSetting';
import LanguageSetting from './LanguageSetting';
import { isLocalEnvironment } from '../../shared/utils/environmentVariables';
import i18n from "../../../i18n";

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [showNotification, setShowNotification] = useState(false);

    useEffect(() => {
        if (showNotification) {
            const timer = setTimeout(() => setShowNotification(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [showNotification]);

    useEffect(() => {
        if (!isLocalEnvironment()) {
            const handleLanguageLoaded = (event: MessageEvent) => {
                if (event.source !== window) return;

                const { type, payload } = event.data;
                if (type === 'LANGUAGE_LOADED') {
                    const { language } = payload;
                    i18n.changeLanguage(language);
                }
            };

            window.addEventListener('message', handleLanguageLoaded);

            return () => {
                window.removeEventListener('message', handleLanguageLoaded);
            };
        }
    }, []);

    return (
        <>
            <div
                className={`relative inset-y-0 left-0 z-50 flex transition-all h-fit duration-500 ${isOpen ? 'ml-0' : '-ml-80'}`}
            >
                <div className="bg-white dark:bg-gray-800 w-80 h-full shadow-lg p-4 flex flex-col justify-between"
                     role="dialog" aria-labelledby="settings-title" aria-describedby="settings-description">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 id="settings-title" className="text-lg font-bold text-gray-800 dark:text-gray-200">{t('Settings')}</h2>
                            <button onClick={onClose} className="text-gray-800 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400" aria-label={t('Close settings')}>
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div id="settings-description" className="space-y-6">
                            <ThemeSetting />
                            <TextSizeSetting />
                            <LanguageSetting />
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-4 space-y-2">
                        <hr className="mb-4" />
                        <p className="flex items-center">
                            <InformationCircleIcon className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" />
                            {t('App Version')}: <strong className="ml-1">{packageJson.version}</strong>
                        </p>
                        <p className="flex items-center">
                            <UserCircleIcon className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" />
                            {t('Developed by')} <strong className="ml-1">Batur Kacamak</strong>
                        </p>
                        <p className="flex items-center">
                            <CodeBracketIcon className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" />
                            <a href="https://github.com/baturkacamak/youtube-comment-navigator-95" className="text-teal-600 dark:text-teal-400">{t('GitHub Repository')}</a>
                        </p>
                        <p className="flex items-center">
                            <EnvelopeIcon className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" />
                            {t('Contact')}: <a href="mailto:hello@batur.info" className="text-teal-600 dark:text-teal-400 ml-1">hello@batur.info</a>
                        </p>
                    </div>
                </div>
                <div className="flex-1" onClick={onClose}></div>
            </div>
            {showNotification && <NotificationBubble message={t("Settings saved!")} position="bottom-left" />}
        </>
    );
};

export default SettingsDrawer;
