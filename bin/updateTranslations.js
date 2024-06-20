const fs = require('fs');
const path = require('path');

const translations = {
};

const localesDir = path.join(__dirname, '../public/locales');

if (!fs.existsSync(localesDir)) {
    fs.mkdirSync(localesDir);
}

Object.keys(translations).forEach(lang => {
    const langDir = path.join(localesDir, lang);
    if (!fs.existsSync(langDir)) {
        fs.mkdirSync(langDir);
    }

    const messagesFilePath = path.join(langDir, 'translation.json');
    let existingTranslations = {};

    if (fs.existsSync(messagesFilePath)) {
        existingTranslations = JSON.parse(fs.readFileSync(messagesFilePath, 'utf8'));
    }

    const updatedTranslations = {
        ...existingTranslations,
        ...translations[lang]
    };

    fs.writeFileSync(messagesFilePath, JSON.stringify(updatedTranslations, null, 2), 'utf8');
});

console.log('Translations created successfully.');
