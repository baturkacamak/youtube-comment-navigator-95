import React, { useState, useEffect } from 'react';
import { XMarkIcon, SunIcon, MoonIcon, CodeBracketIcon, EnvelopeIcon, UserCircleIcon, InformationCircleIcon, AdjustmentsHorizontalIcon, ArrowsPointingInIcon, ArrowsUpDownIcon, ArrowsPointingOutIcon, LanguageIcon } from '@heroicons/react/24/outline';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { SettingsDrawerProps } from "../../types/layoutTypes";
import SelectBox from './SelectBox/SelectBox';
import NotificationBubble from './NotificationBubble';
import { Option } from "../../types/utilityTypes";
import { RootState } from "../../types/rootState";
import packageJson from '../../../package.json';
import { setTextSize } from "../../store/store";

const themeOptions = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon }
];

const textSizeOptions: Option[] = [
    { value: 'text-sm', label: 'Small', icon: AdjustmentsHorizontalIcon },
    { value: 'text-base', label: 'Medium', icon: ArrowsPointingInIcon },
    { value: 'text-lg', label: 'Large', icon: ArrowsUpDownIcon },
    { value: 'text-xl', label: 'Extra Large', icon: ArrowsPointingOutIcon },
];

const languageOptions: Option[] = [
    { value: 'ar', label: 'العربية' }, // Arabic
    { value: 'bn', label: 'বাংলা' }, // Bengali
    { value: 'cs', label: 'Čeština' }, // Czech
    { value: 'da', label: 'Dansk' }, // Danish
    { value: 'de', label: 'Deutsch' }, // German
    { value: 'el', label: 'Ελληνικά' }, // Greek
    { value: 'en', label: 'English' }, // English
    { value: 'es', label: 'Español' }, // Spanish
    { value: 'fa', label: 'فارسی' }, // Persian
    { value: 'fi', label: 'Suomi' }, // Finnish
    { value: 'fr', label: 'Français' }, // French
    { value: 'he', label: 'עברית' }, // Hebrew
    { value: 'hi', label: 'हिन्दी' }, // Hindi
    { value: 'hu', label: 'Magyar' }, // Hungarian
    { value: 'id', label: 'Bahasa Indonesia' }, // Indonesian
    { value: 'it', label: 'Italiano' }, // Italian
    { value: 'ja', label: '日本語' }, // Japanese
    { value: 'jv', label: 'ꦧꦱꦗꦮ' }, // Javanese
    { value: 'ko', label: '한국어' }, // Korean
    { value: 'mr', label: 'मराठी' }, // Marathi
    { value: 'ms', label: 'Bahasa Melayu' }, // Malay
    { value: 'nl', label: 'Nederlands' }, // Dutch
    { value: 'no', label: 'Norsk' }, // Norwegian
    { value: 'pa', label: 'ਪੰਜਾਬੀ' }, // Punjabi
    { value: 'pl', label: 'Polski' }, // Polish
    { value: 'pt', label: 'Português' }, // Portuguese
    { value: 'ro', label: 'Română' }, // Romanian
    { value: 'ru', label: 'Русский' }, // Russian
    { value: 'sk', label: 'Slovenčina' }, // Slovak
    { value: 'sr', label: 'Српски' }, // Serbian
    { value: 'sv', label: 'Svenska' }, // Swedish
    { value: 'ta', label: 'தமிழ்' }, // Tamil
    { value: 'te', label: 'తెలుగు' }, // Telugu
    { value: 'th', label: 'ไทย' }, // Thai
    { value: 'tl', label: 'Filipino' }, // Filipino
    { value: 'tr', label: 'Türkçe' }, // Turkish
    { value: 'uk', label: 'Українська' }, // Ukrainian
    { value: 'ur', label: 'اردو' }, // Urdu
    { value: 'vi', label: 'Tiếng Việt' }, // Vietnamese
    { value: 'zh', label: '中文' }, // Mandarin Chinese
];


const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();

    const [selectedTheme, setSelectedTheme] = useState<Option>(() => {
        const savedTheme = localStorage.getItem('theme');
        return themeOptions.find(option => option.value === savedTheme) || themeOptions[0];
    });

    const textSize = useSelector((state: RootState) => state.textSize);
    const dispatch = useDispatch();

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
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.classList.add(savedTheme);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
            setSelectedTheme(themeOptions.find(option => option.value === 'dark')!);
        } else {
            document.documentElement.classList.add('light');
        }
    }, []);

    useEffect(() => {
        if (selectedTheme.value === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        }
    }, [selectedTheme]);

    useEffect(() => {
        if (showNotification) {
            const timer = setTimeout(() => setShowNotification(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [showNotification]);

    const handleTextSizeChange = (option: Option) => {
        dispatch(setTextSize(option.value));
    };

    const [selectedLanguage, setSelectedLanguage] = useState<Option>(() => {
        const savedLanguage = localStorage.getItem('language');
        return languageOptions.find(option => option.value === savedLanguage) || languageOptions[0];
    });

    useEffect(() => {
        const currentLanguage = selectedLanguage.value;
        localStorage.setItem('language', currentLanguage);
        setShowNotification(true);
        // Add logic to change the language of the app
    }, [selectedLanguage]);

    return (
        <>
            <div
                className={`relative inset-y-0 left-0 z-50 flex transition-all h-fit duration-500 ${
                    isOpen ? 'ml-0' : '-ml-80'
                }`}
            >
                <div className="bg-white dark:bg-gray-800 w-80 h-full shadow-lg p-4 flex flex-col justify-between" role="dialog" aria-labelledby="settings-title" aria-describedby="settings-description">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 id="settings-title" className="text-lg font-bold text-gray-800 dark:text-gray-200">{t('Settings')}</h2>
                            <button onClick={onClose} className="text-gray-800 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400" aria-label={t('Close settings')}>
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div id="settings-description" className="space-y-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{t('Theme')}</label>
                                <SelectBox
                                    options={themeOptions}
                                    selectedOption={selectedTheme}
                                    setSelectedOption={setSelectedTheme}
                                    buttonClassName="w-full rounded-lg"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{t('Text Size')}</label>
                                <SelectBox
                                    options={textSizeOptions}
                                    selectedOption={textSizeOptions.find(option => option.value === textSize)!}
                                    setSelectedOption={handleTextSizeChange}
                                    buttonClassName="w-full rounded-lg"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{t('Language')}</label>
                                <SelectBox
                                    options={languageOptions}
                                    selectedOption={selectedLanguage}
                                    setSelectedOption={setSelectedLanguage}
                                    buttonClassName="w-full rounded-lg"
                                    isSearchable={true}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-4 space-y-2">
                        <hr className="mb-4"/>
                        <p className="flex items-center">
                            <InformationCircleIcon className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400"/>
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
