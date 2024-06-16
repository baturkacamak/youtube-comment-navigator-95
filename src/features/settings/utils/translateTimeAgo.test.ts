import translateTimeAgo from './translateTimeAgo';
import i18n from 'i18next';

const translations = {
    en: {
        timeUnits: {
            second: "second",
            seconds: "seconds",
            minute: "minute",
            minutes: "minutes",
            hour: "hour",
            hours: "hours",
            day: "day",
            days: "days",
            week: "week",
            weeks: "weeks",
            month: "month",
            months: "months",
            year: "year",
            years: "years",
            ago: "ago",
            format: "{{value}} {{unit}} {{ago}}"
        }
    },
    tr: {
        timeUnits: {
            second: "saniye",
            seconds: "saniye",
            minute: "dakika",
            minutes: "dakika",
            hour: "saat",
            hours: "saat",
            day: "gün",
            days: "gün",
            week: "hafta",
            weeks: "hafta",
            month: "ay",
            months: "ay",
            year: "yıl",
            years: "yıl",
            ago: "önce",
            format: "{{value}} {{unit}} {{ago}}"
        }
    }
};

beforeAll(() => {
    i18n.init({
        lng: 'en',
        resources: {
            en: { translation: translations.en },
            tr: { translation: translations.tr }
        }
    });
});

describe('translateTimeAgo', () => {
    test('translates time ago in English', () => {
        i18n.changeLanguage('en');
        expect(translateTimeAgo('1 second ago')).toBe('1 second ago');
        expect(translateTimeAgo('2 seconds ago')).toBe('2 seconds ago');
        expect(translateTimeAgo('1 minute ago')).toBe('1 minute ago');
        expect(translateTimeAgo('2 minutes ago')).toBe('2 minutes ago');
        expect(translateTimeAgo('1 hour ago')).toBe('1 hour ago');
        expect(translateTimeAgo('2 hours ago')).toBe('2 hours ago');
        expect(translateTimeAgo('1 day ago')).toBe('1 day ago');
        expect(translateTimeAgo('2 days ago')).toBe('2 days ago');
        expect(translateTimeAgo('1 week ago')).toBe('1 week ago');
        expect(translateTimeAgo('2 weeks ago')).toBe('2 weeks ago');
        expect(translateTimeAgo('1 month ago')).toBe('1 month ago');
        expect(translateTimeAgo('2 months ago')).toBe('2 months ago');
        expect(translateTimeAgo('1 year ago')).toBe('1 year ago');
        expect(translateTimeAgo('2 years ago')).toBe('2 years ago');
    });

    test('translates time ago in Turkish', () => {
        i18n.changeLanguage('tr');
        expect(translateTimeAgo('1 second ago')).toBe('1 saniye önce');
        expect(translateTimeAgo('2 seconds ago')).toBe('2 saniye önce');
        expect(translateTimeAgo('1 minute ago')).toBe('1 dakika önce');
        expect(translateTimeAgo('2 minutes ago')).toBe('2 dakika önce');
        expect(translateTimeAgo('1 hour ago')).toBe('1 saat önce');
        expect(translateTimeAgo('2 hours ago')).toBe('2 saat önce');
        expect(translateTimeAgo('1 day ago')).toBe('1 gün önce');
        expect(translateTimeAgo('2 days ago')).toBe('2 gün önce');
        expect(translateTimeAgo('1 week ago')).toBe('1 hafta önce');
        expect(translateTimeAgo('2 weeks ago')).toBe('2 hafta önce');
        expect(translateTimeAgo('1 month ago')).toBe('1 ay önce');
        expect(translateTimeAgo('2 months ago')).toBe('2 ay önce');
        expect(translateTimeAgo('1 year ago')).toBe('1 yıl önce');
        expect(translateTimeAgo('2 years ago')).toBe('2 yıl önce');
    });

    test('ignores "(edited)" text', () => {
        i18n.changeLanguage('en');
        expect(translateTimeAgo('1 day ago (edited)')).toBe('1 day ago');
        i18n.changeLanguage('tr');
        expect(translateTimeAgo('1 day ago (edited)')).toBe('1 gün önce');
    });
});
