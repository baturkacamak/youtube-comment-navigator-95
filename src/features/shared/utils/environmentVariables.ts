// src/utils/environmentVariables.ts
export const isLocalEnvironment = (): boolean => {
    return process.env.NODE_ENV === 'development';
};

export const CACHE_KEYS = {
    CONTINUATION_TOKEN: (videoId: string) => `continuationToken_${videoId}`
};

export interface LanguageOption {
    value: string;
    label: string;
}

export const languageOptions: LanguageOption[] = [
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
    { value: 'krt', label: 'Kırım Tatarca' }, // Kırım Tatarca
    { value: 'tr', label: 'Türkçe' }, // Turkish
    { value: 'uk', label: 'Українська' }, // Ukrainian
    { value: 'ur', label: 'اردو' }, // Urdu
    { value: 'vi', label: 'Tiếng Việt' }, // Vietnamese
    { value: 'zh', label: '中文' }, // Mandarin Chinese
];

