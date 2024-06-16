export const getSettings = (): any => {
    const savedSettings = localStorage.getItem('settings');
    return savedSettings ? JSON.parse(savedSettings) : {};
};

export const saveSettings = (settings: any): void => {
    localStorage.setItem('settings', JSON.stringify(settings));
};
