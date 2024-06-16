const fs = require('fs');
const path = require('path');
const translations = require('./timeUnits');

const localesDir = path.join(__dirname, 'public/locales');

fs.readdir(localesDir, (err, files) => {
    if (err) {
        console.error('Error reading locales directory:', err);
        return;
    }

    files.forEach(file => {
        const langDir = path.join(localesDir, file);
        const translationFilePath = path.join(langDir, 'translation.json');

        fs.readFile(translationFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error(`Error reading translation file for ${file}:`, err);
                return;
            }

            let jsonData;
            try {
                jsonData = JSON.parse(data);
            } catch (err) {
                console.error(`Error parsing JSON for ${file}:`, err);
                return;
            }

            if (translations[file]) {
                jsonData.timeUnits = translations[file].timeUnits;

                fs.writeFile(translationFilePath, JSON.stringify(jsonData, null, 2), 'utf8', err => {
                    if (err) {
                        console.error(`Error writing translation file for ${file}:`, err);
                        return;
                    }

                    console.log(`Updated translation file for ${file}`);
                });
            } else {
                console.warn(`No translations found for ${file}`);
            }
        });
    });
});
