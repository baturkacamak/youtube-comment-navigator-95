export const getSettings = (): Record<string, unknown> => {
  try {
    const savedSettings = localStorage.getItem('settings');
    if (!savedSettings) {
      return {};
    }

    const parsed = JSON.parse(savedSettings) as unknown;

    // Ensure we return an object, not null or other types
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    console.warn('Invalid settings format in localStorage, returning empty object');
    return {};
  } catch (error) {
    console.error('Error reading settings from localStorage:', error);
    // Clear corrupted settings
    try {
      localStorage.removeItem('settings');
    } catch {
      // Ignore errors when trying to clear corrupted data
    }
    return {};
  }
};

export const saveSettings = (newSettings: Record<string, unknown>): void => {
  try {
    // Validate input
    if (!newSettings || typeof newSettings !== 'object' || Array.isArray(newSettings)) {
      console.warn('Invalid settings object provided to saveSettings');
      return;
    }

    const currentSettings = getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };

    // Validate the merged settings before saving
    const serialized = JSON.stringify(updatedSettings);
    localStorage.setItem('settings', serialized);
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);

    // If merge failed, try saving just the new settings
    try {
      const serialized = JSON.stringify(newSettings);
      localStorage.setItem('settings', serialized);
    } catch (fallbackError) {
      console.error('Failed to save settings even without merge:', fallbackError);
    }
  }
};
