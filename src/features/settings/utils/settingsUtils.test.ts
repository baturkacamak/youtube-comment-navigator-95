import { getSettings, saveSettings } from './settingsUtils';

describe('Settings Utilities', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('getSettings should return empty object if no settings are saved', () => {
        const settings = getSettings();
        expect(settings).toEqual({});
    });

    test('getSettings should return saved settings object', () => {
        const mockSettings = { theme: 'dark', language: 'en' };
        localStorage.setItem('settings', JSON.stringify(mockSettings));

        const settings = getSettings();
        expect(settings).toEqual(mockSettings);
    });

    test('saveSettings should save the settings object in localStorage', () => {
        const mockSettings = { theme: 'light', language: 'fr' };
        saveSettings(mockSettings);

        const savedSettings = localStorage.getItem('settings');
        expect(savedSettings).toEqual(JSON.stringify(mockSettings));
    });

    test('saveSettings should overwrite existing settings in localStorage', () => {
        const initialSettings = { theme: 'dark' };
        localStorage.setItem('settings', JSON.stringify(initialSettings));

        const newSettings = { theme: 'light', language: 'es' };
        saveSettings(newSettings);

        const savedSettings = localStorage.getItem('settings');
        expect(savedSettings).toEqual(JSON.stringify(newSettings));
    });
});
