#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Find the root directory where package.json is located
ROOT_DIR="$(dirname "$(dirname "$(realpath "$0")")")"

# Navigate to the root directory
cd "$ROOT_DIR" || { echo -e "${RED}❌ Failed to navigate to the root directory.${NC}"; exit 1; }

# Source directories (templates)
LOCALES_DIR="public/locales"
_LOCALES_DIR="public/_locales"
DESCRIPTIONS_DIR="store-assets/descriptions"

# Base language (English)
BASE_LANG="en"

echo -e "${CYAN}🌍 Creating language files for new languages...${NC}\n"

# Array of new languages with format: "code|nativeName|englishName"
# Format: languageCode|Native Name|English Name
declare -a NEW_LANGUAGES=(
    "af|Afrikaans|Afrikaans"
    "am|አማርኛ|Amharic"
    "az|Azərbaycan dili|Azerbaijani"
    "eu|Euskara|Basque"
    "bg|Български|Bulgarian"
    "ca|Català|Catalan"
    "yue|粵語|Cantonese"
    "prs|دری|Dari"
    "et|Eesti|Estonian"
    "gl|Galego|Galician"
    "gu|ગુજરાતી|Gujarati"
    "ka|ქართული|Georgian"
    "gn|Guaraní|Guarani"
    "ha|Hausa|Hausa"
    "ht|Kreyòl ayisyen|Haitian Creole"
    "hr|Hrvatski|Croatian"
    "ig|Igbo|Igbo"
    "is|Íslenska|Icelandic"
    "kn|ಕನ್ನಡ|Kannada"
    "kk|Қазақша|Kazakh"
    "km|ភាសាខ្មែរ|Khmer"
    "ku|Kurdî|Kurdish"
    "lo|ລາວ|Lao"
    "lv|Latviešu|Latvian"
    "lt|Lietuvių|Lithuanian"
    "ml|മലയാളം|Malayalam"
    "mt|Malti|Maltese"
    "mi|Te Reo Māori|Maori"
    "mn|Монгол|Mongolian"
    "my|မြန်မာ|Myanmar"
    "ne|नेपाली|Nepali"
    "ps|پښتو|Pashto"
    "qu|Runa Simi|Quechua"
    "sm|Gagana Samoa|Samoan"
    "si|සිංහල|Sinhala"
    "sl|Slovenščina|Slovenian"
    "sw|Kiswahili|Swahili"
    "bo|བོད་སྐད་|Tibetan"
    "yo|Yorùbá|Yoruba"
    "zu|isiZulu|Zulu"
    "uz|O'zbek|Uzbek"
)

# Counter for created files
CREATED_COUNT=0
FAILED_COUNT=0

# Create language files for each new language
for lang_entry in "${NEW_LANGUAGES[@]}"; do
    IFS='|' read -r LANG_CODE NATIVE_NAME ENGLISH_NAME <<< "$lang_entry"

    echo -e "${BLUE}📝 Processing: ${LANG_CODE} (${NATIVE_NAME})${NC}"

    # 1. Create public/locales/{lang}/translation.json
    LOCALE_DIR="${LOCALES_DIR}/${LANG_CODE}"
    if [ ! -d "$LOCALE_DIR" ]; then
        mkdir -p "$LOCALE_DIR"
        cp "${LOCALES_DIR}/${BASE_LANG}/translation.json" "${LOCALE_DIR}/translation.json"
        echo -e "   ${GREEN}✓${NC} Created ${LOCALE_DIR}/translation.json"
        ((CREATED_COUNT++))
    else
        echo -e "   ${YELLOW}⚠${NC} ${LOCALE_DIR} already exists, skipping..."
    fi

    # 2. Create public/_locales/{lang}/messages.json
    _LOCALE_DIR="${_LOCALES_DIR}/${LANG_CODE}"
    if [ ! -d "$_LOCALE_DIR" ]; then
        mkdir -p "$_LOCALE_DIR"
        cp "${_LOCALES_DIR}/${BASE_LANG}/messages.json" "${_LOCALE_DIR}/messages.json"
        echo -e "   ${GREEN}✓${NC} Created ${_LOCALE_DIR}/messages.json"
        ((CREATED_COUNT++))
    else
        echo -e "   ${YELLOW}⚠${NC} ${_LOCALE_DIR} already exists, skipping..."
    fi

    # 3. Create store-assets/descriptions/{lang}.txt
    DESCRIPTION_FILE="${DESCRIPTIONS_DIR}/${LANG_CODE}.txt"
    if [ ! -f "$DESCRIPTION_FILE" ]; then
        mkdir -p "$DESCRIPTIONS_DIR"
        cp "${DESCRIPTIONS_DIR}/${BASE_LANG}.txt" "${DESCRIPTION_FILE}"
        echo -e "   ${GREEN}✓${NC} Created ${DESCRIPTION_FILE}"
        ((CREATED_COUNT++))
    else
        echo -e "   ${YELLOW}⚠${NC} ${DESCRIPTION_FILE} already exists, skipping..."
    fi

    echo ""
done

echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ File creation complete!${NC}"
echo -e "${GREEN}   Created ${CREATED_COUNT} new files${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${YELLOW}   Skipped ${FAILED_COUNT} existing files${NC}"
fi
echo -e "${CYAN}═══════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}⚠️  NEXT STEPS:${NC}"
echo -e "   1. Update ${BLUE}src/features/shared/utils/appConstants.ts${NC} with new languages"
echo -e "   2. Run translations for all new language files"
echo -e "   3. Test the application with new languages\n"
