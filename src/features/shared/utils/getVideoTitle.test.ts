import { getVideoTitle } from './getVideoTitle';

describe('getVideoTitle', () => {
    beforeEach(() => {
        // Clear any existing DOM elements before each test
        document.body.innerHTML = '';
        // Reset the document title
        document.title = '';
    });

    it('should return the title from the yt-formatted-string element', () => {
        // Set up the DOM
        const titleText = 'Mock Video Title';
        document.body.innerHTML = `<yt-formatted-string class="ytd-watch-metadata">${titleText}</yt-formatted-string>`;

        const result = getVideoTitle();
        expect(result).toBe(titleText);
    });

    it('should return the document title if yt-formatted-string element is not present', () => {
        // Set the document title
        document.title = 'Mock Document Title - YouTube';

        const result = getVideoTitle();
        expect(result).toBe('Mock Document Title');
    });

    it('should return the document title if yt-formatted-string element is empty', () => {
        // Set up the DOM with an empty yt-formatted-string element
        document.body.innerHTML = `<yt-formatted-string class="ytd-watch-metadata"></yt-formatted-string>`;
        // Set the document title
        document.title = 'Another Mock Document Title - YouTube';

        const result = getVideoTitle();
        expect(result).toBe('Another Mock Document Title');
    });

    it('should return an empty string if neither the yt-formatted-string element nor the document title is present', () => {
        // Ensure the document title is empty
        document.title = '';

        const result = getVideoTitle();
        expect(result).toBe('');
    });
});
