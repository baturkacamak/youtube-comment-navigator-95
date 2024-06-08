import { useEffect } from 'react';
import { extractYouTubeVideoIdFromUrl } from '../utils/extractYouTubeVideoIdFromUrl';
import {resetState} from "../store/store";
import {useDispatch} from "react-redux";



function isYouTubeLoaded(): boolean {
    return !!document.querySelector('ytd-app');
}

const useUrlChange = (callback: () => Promise<void>) => {
    const dispatch = useDispatch();

    useEffect(() => {
        const eventDetails = new AbortController();
        let previousVideoId: string | null = null;

        const handleUrlChange = async () => {
            try {
                const videoId = extractYouTubeVideoIdFromUrl();
                if (videoId === previousVideoId) {
                    return; // If the video ID hasn't changed, do nothing.
                }
                previousVideoId = videoId;

                const waitForVideoElement = () => {
                    return new Promise<void>((resolve) => {
                        const checkVideoElement = () => {
                            const videoElement = document.querySelector(`[video-id="${videoId}"]`);
                            if (videoElement) {
                                console.log('Video element found.');
                                resolve();
                            } else {
                                console.log('Video element not yet available, retrying...');
                                setTimeout(checkVideoElement, 500); // Retry after 500ms
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

        const onMessage = (event: MessageEvent) => {
            if (event.data.type === 'URL_CHANGE_TO_VIDEO') {
                handleUrlChange();
            }
        };

        window.addEventListener('message', onMessage);

        return () => {
            window.removeEventListener('message', onMessage);
            eventDetails.abort();
        };
    }, [callback]);
};

export default useUrlChange;
