export const getVideoTitle = (): string => {
    const titleElement = document.querySelector('yt-formatted-string.ytd-watch-metadata');
    return titleElement?.textContent || document.title.replace(' - YouTube', '');
};
