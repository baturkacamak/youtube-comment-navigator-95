import React from 'react';
import SelectBox from "../../../shared/components/SelectBox/SelectBox";
import { LanguageIcon } from '@heroicons/react/24/outline';
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from 'react-redux';
import {RootState} from "../../../../types/rootState";
import {setTranscriptSelectedLanguage} from "../../../../store/store";

const TranslateSelectBox: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const selectedLanguage = useSelector((state: RootState) => state.transcriptSelectedLanguage);

    const languages = [
        {value: '', label: t('Select Language')},
        {value: 'af', label: 'Afrikaans'},
        {value: 'ak', label: 'Akan'},
        {value: 'sq', label: 'Shqip'},
        {value: 'am', label: 'አማርኛ'},
        {value: 'ar', label: 'العربية'},
        {value: 'hy', label: 'Հայերեն'},
        {value: 'as', label: 'অসমীয়া'},
        {value: 'ay', label: 'Aymara'},
        {value: 'az', label: 'Azərbaycan dili'},
        {value: 'bn', label: 'বাংলা'},
        {value: 'eu', label: 'Euskara'},
        {value: 'be', label: 'Беларуская'},
        {value: 'bh', label: 'भोजपुरी'},
        {value: 'bs', label: 'Bosanski'},
        {value: 'bg', label: 'Български'},
        {value: 'my', label: 'ဗမာစာ'},
        {value: 'ca', label: 'Català'},
        {value: 'ceb', label: 'Cebuano'},
        {value: 'zh', label: '中文'},
        {value: 'co', label: 'Corsu'},
        {value: 'hr', label: 'Hrvatski'},
        {value: 'cs', label: 'Čeština'},
        {value: 'da', label: 'Dansk'},
        {value: 'dv', label: 'ދިވެހި'},
        {value: 'nl', label: 'Nederlands'},
        {value: 'en', label: 'English'},
        {value: 'eo', label: 'Esperanto'},
        {value: 'et', label: 'Eesti'},
        {value: 'ee', label: 'Eʋegbe'},
        {value: 'fil', label: 'Filipino'},
        {value: 'fi', label: 'Suomi'},
        {value: 'fr', label: 'Français'},
        {value: 'gl', label: 'Galego'},
        {value: 'lg', label: 'Luganda'},
        {value: 'ka', label: 'ქართული'},
        {value: 'de', label: 'Deutsch'},
        {value: 'el', label: 'Ελληνικά'},
        {value: 'gn', label: 'Avañe\'ẽ'},
        {value: 'gu', label: 'ગુજરાતી'},
        {value: 'ht', label: 'Kreyòl ayisyen'},
        {value: 'ha', label: 'Hausa'},
        {value: 'haw', label: 'ʻŌlelo Hawaiʻi'},
        {value: 'he', label: 'עברית'},
        {value: 'hi', label: 'हिन्दी'},
        {value: 'hmn', label: 'Hmoob'},
        {value: 'hu', label: 'Magyar'},
        {value: 'is', label: 'Íslenska'},
        {value: 'ig', label: 'Igbo'},
        {value: 'id', label: 'Bahasa Indonesia'},
        {value: 'ga', label: 'Gaeilge'},
        {value: 'it', label: 'Italiano'},
        {value: 'ja', label: '日本語'},
        {value: 'jv', label: 'Basa Jawa'},
        {value: 'kn', label: 'ಕನ್ನಡ'},
        {value: 'kk', label: 'Қазақ тілі'},
        {value: 'km', label: 'ខ្មែរ'},
        {value: 'rw', label: 'Ikinyarwanda'},
        {value: 'ko', label: '한국어'},
        {value: 'krio', label: 'Krio'},
        {value: 'ku', label: 'Kurdî'},
        {value: 'ky', label: 'Кыргызча'},
        {value: 'lo', label: 'ລາວ'},
        {value: 'la', label: 'Latina'},
        {value: 'lv', label: 'Latviešu'},
        {value: 'ln', label: 'Lingála'},
        {value: 'lt', label: 'Lietuvių'},
        {value: 'lb', label: 'Lëtzebuergesch'},
        {value: 'mk', label: 'Македонски'},
        {value: 'mg', label: 'Malagasy'},
        {value: 'ms', label: 'Bahasa Melayu'},
        {value: 'ml', label: 'മലയാളം'},
        {value: 'mt', label: 'Malti'},
        {value: 'mi', label: 'Māori'},
        {value: 'mr', label: 'मराठी'},
        {value: 'mn', label: 'Монгол'},
        {value: 'ne', label: 'नेपाली'},
        {value: 'nso', label: 'Sesotho sa Leboa'},
        {value: 'no', label: 'Norsk'},
        {value: 'ny', label: 'Chichewa'},
        {value: 'or', label: 'ଓଡ଼ିଆ'},
        {value: 'om', label: 'Afaan Oromoo'},
        {value: 'ps', label: 'پښتو'},
        {value: 'fa', label: 'فارسی'},
        {value: 'pl', label: 'Polski'},
        {value: 'pt', label: 'Português'},
        {value: 'pa', label: 'ਪੰਜਾਬੀ'},
        {value: 'qu', label: 'Runa Simi'},
        {value: 'ro', label: 'Română'},
        {value: 'ru', label: 'Русский'},
        {value: 'sm', label: 'Gagana Samoa'},
        {value: 'sa', label: 'संस्कृतम्'},
        {value: 'gd', label: 'Gàidhlig'},
        {value: 'sr', label: 'Српски'},
        {value: 'sn', label: 'ChiShona'},
        {value: 'sd', label: 'سنڌي'},
        {value: 'si', label: 'සිංහල'},
        {value: 'sk', label: 'Slovenčina'},
        {value: 'sl', label: 'Slovenščina'},
        {value: 'so', label: 'Soomaali'},
        {value: 'st', label: 'Sesotho'},
        {value: 'es', label: 'Español'},
        {value: 'sv', label: 'Svenska'},
        {value: 'su', label: 'Basa Sunda'},
        {value: 'sw', label: 'Kiswahili'},
        {value: 'tg', label: 'Тоҷикӣ'},
        {value: 'ta', label: 'தமிழ்'},
        {value: 'tt', label: 'Татар'},
        {value: 'te', label: 'తెలుగు'},
        {value: 'th', label: 'ไทย'},
        {value: 'ti', label: 'ትግርኛ'},
        {value: 'ts', label: 'Xitsonga'},
        {value: 'tr', label: 'Türkçe'},
        {value: 'tk', label: 'Türkmen'},
        {value: 'uk', label: 'Українська'},
        {value: 'ur', label: 'اردو'},
        {value: 'ug', label: 'ئۇيغۇرچە'},
        {value: 'uz', label: 'Oʻzbekcha'},
        {value: 'vi', label: 'Tiếng Việt'},
        {value: 'cy', label: 'Cymraeg'},
        {value: 'fy', label: 'Frysk'},
        {value: 'xh', label: 'isiXhosa'},
        {value: 'yi', label: 'ייִדיש'},
        {value: 'yo', label: 'Yorùbá'},
        {value: 'zu', label: 'isiZulu'},
    ];

    const handleLanguageChange = (option: { value: string, label: string }) => {
        dispatch(setTranscriptSelectedLanguage(option));
    };

    return (
        <div className="inline-flex items-center gap-2">
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200 select-none">
                {t('Translate to:')}
            </label>
            <SelectBox
                options={languages}
                selectedOption={selectedLanguage}
                setSelectedOption={handleLanguageChange}
                buttonClassName="w-full rounded-lg"
                isSearchable={true}
                DefaultIcon={LanguageIcon}
            />
        </div>
    );
};

export default TranslateSelectBox;