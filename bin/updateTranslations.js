const fs = require('fs');
const path = require('path');

const translations = {
    "ar": {
        "Bookmark added on:": "تمت الإضافة في:",
        "Bookmark": "إشارة مرجعية"
    },
    "bn": {
        "Bookmark added on:": "বুকমার্ক যোগ করা হয়েছে:",
        "Bookmark": "বুকমার্ক"
    },
    "cs": {
        "Bookmark added on:": "Záložka přidána:",
        "Bookmark": "Záložka"
    },
    "da": {
        "Bookmark added on:": "Bogmærke tilføjet den:",
        "Bookmark": "Bogmærke"
    },
    "de": {
        "Bookmark added on:": "Lesezeichen hinzugefügt am:",
        "Bookmark": "Lesezeichen"
    },
    "el": {
        "Bookmark added on:": "Προστέθηκε σελιδοδείκτης στις:",
        "Bookmark": "Σελιδοδείκτης"
    },
    "en": {
        "Bookmark added on:": "Bookmark added on:",
        "Bookmark": "Bookmark"
    },
    "es": {
        "Bookmark added on:": "Marcador añadido el:",
        "Bookmark": "Marcador"
    },
    "fa": {
        "Bookmark added on:": "نشانه‌گذاری شده در:",
        "Bookmark": "نشانه‌گذاری"
    },
    "fi": {
        "Bookmark added on:": "Kirjanmerkki lisätty:",
        "Bookmark": "Kirjanmerkki"
    },
    "fr": {
        "Bookmark added on:": "Signet ajouté le:",
        "Bookmark": "Signet"
    },
    "he": {
        "Bookmark added on:": "סימנייה נוספה בתאריך:",
        "Bookmark": "סימנייה"
    },
    "hi": {
        "Bookmark added on:": "बुकमार्क जोड़ा गया:",
        "Bookmark": "बुकमार्क"
    },
    "hu": {
        "Bookmark added on:": "Könyvjelző hozzáadva:",
        "Bookmark": "Könyvjelző"
    },
    "id": {
        "Bookmark added on:": "Penanda ditambahkan pada:",
        "Bookmark": "Penanda"
    },
    "it": {
        "Bookmark added on:": "Segnalibro aggiunto il:",
        "Bookmark": "Segnalibro"
    },
    "ja": {
        "Bookmark added on:": "ブックマーク追加日:",
        "Bookmark": "ブックマーク"
    },
    "jv": {
        "Bookmark added on:": "Penanda ditambahake ing:",
        "Bookmark": "Penanda"
    },
    "ko": {
        "Bookmark added on:": "북마크 추가 날짜:",
        "Bookmark": "북마크"
    },
    "krt": {
        "Bookmark added on:": "Bukot hiyaara ta:",
        "Bookmark": "Bukot"
    },
    "mr": {
        "Bookmark added on:": "वाचन चिन्ह जोडले:",
        "Bookmark": "वाचन चिन्ह"
    },
    "ms": {
        "Bookmark added on:": "Penanda ditambah pada:",
        "Bookmark": "Penanda"
    },
    "nl": {
        "Bookmark added on:": "Bladwijzer toegevoegd op:",
        "Bookmark": "Bladwijzer"
    },
    "no": {
        "Bookmark added on:": "Bokmerke lagt til:",
        "Bookmark": "Bokmerke"
    },
    "pa": {
        "Bookmark added on:": "ਬੁਕਮਾਰਕ 'ਤੇ ਜੋੜਿਆ ਗਿਆ:",
        "Bookmark": "ਬੁਕਮਾਰਕ"
    },
    "pl": {
        "Bookmark added on:": "Zakładka dodana dnia:",
        "Bookmark": "Zakładka"
    },
    "pt": {
        "Bookmark added on:": "Marcador adicionado em:",
        "Bookmark": "Marcador"
    },
    "ro": {
        "Bookmark added on:": "Marcaj adăugat la:",
        "Bookmark": "Marcaj"
    },
    "ru": {
        "Bookmark added on:": "Закладка добавлена:",
        "Bookmark": "Закладка"
    },
    "sk": {
        "Bookmark added on:": "Záložka pridaná:",
        "Bookmark": "Záložka"
    },
    "sr": {
        "Bookmark added on:": "Obeleživač dodan:",
        "Bookmark": "Obeleživač"
    },
    "sv": {
        "Bookmark added on:": "Bokmärke tillagt den:",
        "Bookmark": "Bokmärke"
    },
    "ta": {
        "Bookmark added on:": "புத்தகம் சேர்க்கப்பட்டது:",
        "Bookmark": "புத்தகம்"
    },
    "te": {
        "Bookmark added on:": "బుక్‌మార్క్ జోడించిన తేదీ:",
        "Bookmark": "బుక్‌మార్క్"
    },
    "th": {
        "Bookmark added on:": "บุ๊กมาร์กที่เพิ่มเมื่อ:",
        "Bookmark": "บุ๊กมาร์ก"
    },
    "tl": {
        "Bookmark added on:": "Idinagdag ang bookmark noong:",
        "Bookmark": "Bookmark"
    },
    "tr": {
        "Bookmark added on:": "Yer imi eklendi:",
        "Bookmark": "Yer imi"
    },
    "uk": {
        "Bookmark added on:": "Додано в закладки:",
        "Bookmark": "Закладка"
    },
    "ur": {
        "Bookmark added on:": "بک مارک شامل کیا گیا:",
        "Bookmark": "بک مارک"
    },
    "vi": {
        "Bookmark added on:": "Đã thêm dấu trang vào:",
        "Bookmark": "Dấu trang"
    },
    "zh": {
        "Bookmark added on:": "添加书签于:",
        "Bookmark": "书签"
    }
};

const localesDir = path.join(__dirname, '../public/locales');

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
                jsonData = {...jsonData, ...translations[file]};

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
