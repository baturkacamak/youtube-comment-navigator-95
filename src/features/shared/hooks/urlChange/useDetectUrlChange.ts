import { useEffect } from 'react';
import { extractYouTubeVideoIdFromUrl } from '../../utils/extractYouTubeVideoIdFromUrl';
import {resetState, setIsLoading} from "../../../../store/store";
import { useDispatch } from "react-redux";

const useDetectUrlChange = (callback: () => Promise<void>) => {
    const dispatch = useDispatch();

    useEffect(() => {
        const abortController = new AbortController();
        let previousVideoId: string | null = null;

        const handleUrlChangeMessage = (event: MessageEvent) => {
            if (event.data.type === 'URL_CHANGE_TO_VIDEO') {
                handleUrlChange();
            }
        };

        const handleUrlChange = async () => {
            try {
                const currentVideoId = extractYouTubeVideoIdFromUrl();
                if (hasVideoIdChanged(currentVideoId)) {
                    previousVideoId = currentVideoId;
                    await waitForVideoElement(currentVideoId);
                    console.log('URL changed, executing callback...');
                    dispatch(setIsLoading(true));
                    await callback();
                }
            } catch (error) {
                console.error('Error handling URL change:', error);
            }
        };

        const hasVideoIdChanged = (currentVideoId: string | null): boolean => {
            return currentVideoId !== previousVideoId;
        };

        const waitForVideoElement = (videoId: string | null): Promise<void> => {
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

        window.addEventListener('message', handleUrlChangeMessage);

        return () => {
            window.removeEventListener('message', handleUrlChangeMessage);
            abortController.abort();
        };
    }, [callback]);
};

export default useDetectUrlChange;
