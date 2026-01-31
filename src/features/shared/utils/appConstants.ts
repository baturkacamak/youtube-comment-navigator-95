// src/utils/appConstants
export const isLocalEnvironment = (): boolean => {
  return (
    process.env.NODE_ENV === 'development' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
};

/**
 * Pagination constants
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  INITIAL_PAGE: 0,
};

/**
 * Time constants (in milliseconds)
 */
export const TIME = {
  DEBOUNCE_DELAY: 300,
  MAX_DEBOUNCE_DELAY: 1000,
  ANIMATION_DURATION: 300,
};

export const CACHE_KEYS = {
  CONTINUATION_TOKEN: (videoId: string) => `continuationToken_${videoId}`,
};

export interface LanguageOption {
  value: string;
  label: string;
}

export const languageOptions: LanguageOption[] = [
  { value: 'af', label: 'Afrikaans' }, // Afrikaans
  { value: 'am', label: 'አማርኛ' }, // Amharic
  { value: 'ar', label: 'العربية' }, // Arabic
  { value: 'az', label: 'Azərbaycan dili' }, // Azerbaijani
  { value: 'bg', label: 'Български' }, // Bulgarian
  { value: 'bn', label: 'বাংলা' }, // Bengali
  { value: 'bo', label: 'བོད་སྐད་' }, // Tibetan
  { value: 'ca', label: 'Català' }, // Catalan
  { value: 'cs', label: 'Čeština' }, // Czech
  { value: 'da', label: 'Dansk' }, // Danish
  { value: 'de', label: 'Deutsch' }, // German
  { value: 'el', label: 'Ελληνικά' }, // Greek
  { value: 'en', label: 'English' }, // English
  { value: 'es', label: 'Español' }, // Spanish
  { value: 'et', label: 'Eesti' }, // Estonian
  { value: 'eu', label: 'Euskara' }, // Basque
  { value: 'fa', label: 'فارسی' }, // Persian
  { value: 'fi', label: 'Suomi' }, // Finnish
  { value: 'fr', label: 'Français' }, // French
  { value: 'gl', label: 'Galego' }, // Galician
  { value: 'gn', label: 'Guaraní' }, // Guarani
  { value: 'gu', label: 'ગુજરાતી' }, // Gujarati
  { value: 'ha', label: 'Hausa' }, // Hausa
  { value: 'he', label: 'עברית' }, // Hebrew
  { value: 'hi', label: 'हिन्दी' }, // Hindi
  { value: 'hr', label: 'Hrvatski' }, // Croatian
  { value: 'ht', label: 'Kreyòl ayisyen' }, // Haitian Creole
  { value: 'hu', label: 'Magyar' }, // Hungarian
  { value: 'id', label: 'Bahasa Indonesia' }, // Indonesian
  { value: 'ig', label: 'Igbo' }, // Igbo
  { value: 'is', label: 'Íslenska' }, // Icelandic
  { value: 'it', label: 'Italiano' }, // Italian
  { value: 'ja', label: '日本語' }, // Japanese
  { value: 'jv', label: 'ꦧꦱꦗꦮ' }, // Javanese
  { value: 'ka', label: 'ქართული' }, // Georgian
  { value: 'kk', label: 'Қазақша' }, // Kazakh
  { value: 'km', label: 'ភាសាខ្មែរ' }, // Khmer
  { value: 'kn', label: 'ಕನ್ನಡ' }, // Kannada
  { value: 'ko', label: '한국어' }, // Korean
  { value: 'krt', label: 'Kırım Tatarca' }, // Crimean Tatar
  { value: 'ku', label: 'Kurdî' }, // Kurdish
  { value: 'lo', label: 'ລາວ' }, // Lao
  { value: 'lt', label: 'Lietuvių' }, // Lithuanian
  { value: 'lv', label: 'Latviešu' }, // Latvian
  { value: 'mi', label: 'Te Reo Māori' }, // Maori
  { value: 'ml', label: 'മലയാളം' }, // Malayalam
  { value: 'mn', label: 'Монгол' }, // Mongolian
  { value: 'mr', label: 'मराठी' }, // Marathi
  { value: 'ms', label: 'Bahasa Melayu' }, // Malay
  { value: 'mt', label: 'Malti' }, // Maltese
  { value: 'my', label: 'မြန်မာ' }, // Myanmar
  { value: 'ne', label: 'नेपाली' }, // Nepali
  { value: 'nl', label: 'Nederlands' }, // Dutch
  { value: 'no', label: 'Norsk' }, // Norwegian
  { value: 'pa', label: 'ਪੰਜਾਬੀ' }, // Punjabi
  { value: 'pl', label: 'Polski' }, // Polish
  { value: 'prs', label: 'دری' }, // Dari
  { value: 'ps', label: 'پښتو' }, // Pashto
  { value: 'pt', label: 'Português' }, // Portuguese
  { value: 'qu', label: 'Runa Simi' }, // Quechua
  { value: 'ro', label: 'Română' }, // Romanian
  { value: 'ru', label: 'Русский' }, // Russian
  { value: 'si', label: 'සිංහල' }, // Sinhala
  { value: 'sk', label: 'Slovenčina' }, // Slovak
  { value: 'sl', label: 'Slovenščina' }, // Slovenian
  { value: 'sm', label: 'Gagana Samoa' }, // Samoan
  { value: 'sr', label: 'Српски' }, // Serbian
  { value: 'sv', label: 'Svenska' }, // Swedish
  { value: 'sw', label: 'Kiswahili' }, // Swahili
  { value: 'ta', label: 'தமிழ்' }, // Tamil
  { value: 'te', label: 'తెలుగు' }, // Telugu
  { value: 'th', label: 'ไทย' }, // Thai
  { value: 'tl', label: 'Filipino' }, // Filipino
  { value: 'tr', label: 'Türkçe' }, // Turkish
  { value: 'uk', label: 'Українська' }, // Ukrainian
  { value: 'ur', label: 'اردو' }, // Urdu
  { value: 'uz', label: 'O\'zbek' }, // Uzbek
  { value: 'vi', label: 'Tiếng Việt' }, // Vietnamese
  { value: 'yo', label: 'Yorùbá' }, // Yoruba
  { value: 'yue', label: '粵語' }, // Cantonese
  { value: 'zh', label: '中文' }, // Mandarin Chinese
  { value: 'zu', label: 'isiZulu' }, // Zulu
];

export const ENABLE_LOGGER = true; // Set to false to disable logger messages

// API Constants
export const YOUTUBE_API_KEY = '';
export const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/videos';
