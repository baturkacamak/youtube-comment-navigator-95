module.exports = {
    input: [
        'src/**/*.{js,jsx,ts,tsx}', // Adjust the glob pattern to match your project structure
    ],
    output: './locales',
    options: {
        debug: false,
        removeUnusedKeys: true,
        sort: true,
        func: {
            list: ['i18next.t', 'i18n.t', 't'],
            extensions: ['.js', '.jsx', '.ts', '.tsx']
        },
        trans: {
            component: 'Trans',
            i18nKey: 'i18nKey',
            extensions: ['.js', '.jsx', '.ts', '.tsx']
        },
        lngs: ['en', 'es'], // Add other languages as needed
        defaultLng: 'en',
        defaultNs: 'translation',
        resource: {
            loadPath: 'locales/{{lng}}/{{ns}}.json',
            savePath: 'locales/{{lng}}/{{ns}}.json',
            jsonIndent: 2,
            lineEnding: '\n'
        },
        ns: [
            'translation'
        ],
    },
};
