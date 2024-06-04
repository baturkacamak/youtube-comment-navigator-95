import {useEffect} from 'react';

function getWatchUrl(url: string): string {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('v') || '';
}

function isYouTubeLoaded(): boolean {
    return !!document.querySelector('ytd-app');
}

const useUrlChange = (callback: () => Promise<void>) => {
    useEffect(() => {
        let currentUrl = getWatchUrl(window.location.href);

        const eventDetails = new AbortController();

        const handleUrlChange = async () => {
            try {
                const videoId = getWatchUrl(window.location.href);

                const waitForVideoElement = () => {
                    return new Promise<void>((resolve) => {
                        const checkVideoElement = () => {
                            const videoElement = document.querySelector(`[video-id="${videoId}"]`);
                            if (videoElement) {
                                resolve();
                            } else {
                                console.log('Video element not yet available, retrying...');
                                setTimeout(checkVideoElement, 500); // Retry after 100ms
                            }
                        };
                        checkVideoElement();
                    });
                };
                if (videoId) {
                    await waitForVideoElement();
                    console.log('URL changed, executing callback...');
                    await callback();
                }
            } catch (error) {
                console.error('Error handling URL change:', error);
            }
        };

        const monitorUrlChange = () => {
            const handler = async () => {
                if (isYouTubeLoaded() && document.querySelector("#meta.style-scope.ytd-watch-flexy")) {
                    const newUrl = getWatchUrl(window.location.href);
                    if (currentUrl !== newUrl) {
                        currentUrl = newUrl;
                        eventDetails.abort();
                        await handleUrlChange();
                    }
                }
            };

            setInterval(handler, 1000);
        };

        monitorUrlChange();

        return () => {
            eventDetails.abort();
        };
    }, [callback]);
};

export default useUrlChange;
