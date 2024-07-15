import React, {useEffect, useState} from 'react';
import {XMarkIcon} from '@heroicons/react/24/outline';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';
import {SettingsDrawerProps} from "../../../types/layoutTypes";
import NotificationBubble from '../../shared/components/NotificationBubble';
import ThemeSetting from './ThemeSetting';
import TextSizeSetting from './TextSizeSetting';
import LanguageSetting from './LanguageSetting';
import SettingsInfo from './SettingsInfo';
import ShowFiltersSortsToggle from './ShowFiltersSortsToggle';
import LoadingSection from "../../loading/components/LoadingSection";
import {RootState} from '../../../types/rootState';
import FontSetting from "../FontSetting";
import i18n from "i18next";
import ShowContentOnSearchToggle from "./ShowContentOnSearchToggle";

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
    const dispatch = useDispatch();
    const showFiltersSorts = useSelector((state: RootState) => state.settings.showFiltersSorts);
    const isRtl = i18n.dir() === 'rtl';

    let drawerClass = '-ml-80';
    if (isOpen) {
        drawerClass = 'ml-0';
    }

    if (isRtl) {
        drawerClass = '-mr-80';
        if (isOpen) {
            drawerClass = 'mr-0';
        }
    }

    useEffect(() => {
        if (showNotification) {
            const timer = setTimeout(() => setShowNotification(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showNotification]);

    return (
        <>
            <div
                className={`relative inset-y-0 left-0 z-50 flex transition-all h-fit duration-500 ${
                    drawerClass
                }`}
            >
                <div
                    className="bg-white dark:bg-gray-800 w-80 h-full shadow-lg p-4 flex flex-col justify-between"
                    role="dialog"
                    aria-labelledby="settings-title"
                    aria-describedby="settings-description"
                >
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 id="settings-title" className="text-lg font-bold text-gray-800 dark:text-gray-200">
                                {t('Settings')}
                            </h2>
                            <button
                                onClick={onClose}
                                className="text-gray-800 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400"
                                aria-label={t('Close settings')}
                            >
                                <XMarkIcon className="w-6 h-6"/>
                            </button>
                        </div>
                        <div id="settings-description" className="space-y-2">
                            <div
                                className="flex items-center justify-between p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                                <ThemeSetting/>
                            </div>
                            <div
                                className="flex items-center justify-between p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                                <TextSizeSetting/>
                            </div>
                            <div
                                className="flex items-center justify-between p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                                <FontSetting/>
                            </div>
                            <div
                                className="flex items-center justify-between p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                                <LanguageSetting/>
                            </div>
                            <div
                                className="flex items-center justify-between mb-4 p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                                <ShowContentOnSearchToggle/>
                            </div>
                        </div>
                    </div>
                    <div className="my-4">
                        <LoadingSection/>
                    </div>
                    <SettingsInfo/>
                </div>
                <div className="flex-1" onClick={onClose}></div>
            </div>
            {showNotification && <NotificationBubble message={t('Settings saved!')} position="bottom-left"/>}
        </>
    );
};

export default SettingsDrawer;
