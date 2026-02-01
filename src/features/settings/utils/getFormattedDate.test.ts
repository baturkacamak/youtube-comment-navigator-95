import i18n from 'i18next';
import getFormattedDate from './getFormattedDate';
import timezoneMock from 'timezone-mock';

beforeAll(() => {
  i18n.init({
    lng: 'en',
    resources: {
      en: { translation: { /* no-op */ } },
      tr: { translation: { /* no-op */ } },
    },
  });

  // Mock timezone to UTC
  timezoneMock.register('UTC');
});

afterAll(() => {
  timezoneMock.unregister();
});

describe('getFormattedDate', () => {
  test('formats timestamp to date string in English', () => {
    i18n.changeLanguage('en');
    const timestamp = Date.UTC(2024, 5, 16, 14, 30); // June 16, 2024, 14:30 UTC
    expect(getFormattedDate(timestamp)).toBe('June 16, 2024 at 2:30 PM');
  });

  test('formats timestamp to date string in Turkish', () => {
    i18n.changeLanguage('tr');
    const timestamp = Date.UTC(2024, 5, 16, 14, 30); // June 16, 2024, 14:30 UTC
    expect(getFormattedDate(timestamp)).toBe('16 Haziran 2024 14:30');
  });

  test('handles invalid timestamp', () => {
    i18n.changeLanguage('en');
    const timestamp = NaN;
    expect(getFormattedDate(timestamp)).toBe('Invalid Date');
  });

  test('formats current timestamp correctly', () => {
    i18n.changeLanguage('en');
    const timestamp = Date.now();
    const formattedDate = getFormattedDate(timestamp);
    const expectedDate = new Date(timestamp).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
    expect(formattedDate).toBe(expectedDate);
  });

  test('formats date correctly after language change', () => {
    const timestamp = Date.UTC(2024, 5, 16, 14, 30); // June 16, 2024, 14:30 UTC

    i18n.changeLanguage('en');
    expect(getFormattedDate(timestamp)).toBe('June 16, 2024 at 2:30 PM');

    i18n.changeLanguage('tr');
    expect(getFormattedDate(timestamp)).toBe('16 Haziran 2024 14:30');
  });

  test('formats edge case timestamps correctly', () => {
    i18n.changeLanguage('en');

    // Unix epoch time
    const epochTime = 0;
    expect(getFormattedDate(epochTime)).toBe('January 1, 1970 at 12:00 AM');

    // Far future date
    const futureTime = Date.UTC(3000, 0, 1, 0, 0);
    expect(getFormattedDate(futureTime)).toBe('January 1, 3000 at 12:00 AM');
  });
});
