export const getSettings = (): any => {
  const savedSettings = localStorage.getItem('settings');
  return savedSettings ? JSON.parse(savedSettings) : {};
};

export const saveSettings = (newSettings: any): void => {
  const currentSettings = getSettings();
  const updatedSettings = { ...currentSettings, ...newSettings };
  localStorage.setItem('settings', JSON.stringify(updatedSettings));
};
