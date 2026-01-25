import { useEffect } from 'react';
import { extractYouTubeVideoIdFromUrl } from '../../utils/extractYouTubeVideoIdFromUrl';
import { setIsLoading } from "../../../../store/store";
import { useDispatch } from "react-redux";
import useGlobalEventListener from "../useGlobalEventListener";
import logger from '../../utils/logger';

let previousVideoId: string | null = null;

const useDetectUrlChange = (callback: () => Promise<void>) => {
    const dispatch = useDispatch();

    const handleUrlChangeMessage = async (event: MessageEvent) => {
        if (event?.data?.type === 'URL_CHANGE_TO_VIDEO') {
            await handleUrlChange();
        }
    };

    const handleUrlChange = async () => {
        try {
            const currentVideoId = extractYouTubeVideoIdFromUrl();
            if (hasVideoIdChanged(currentVideoId)) {
                previousVideoId = currentVideoId;
                await waitForVideoElement(currentVideoId);
                logger.info('URL changed, executing callback...');
                dispatch(setIsLoading(true));
                await callback();
            }
        } catch (error) {
            logger.error('Error handling URL change:', error);
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
                    logger.info('Video element found.');
                    resolve();
                } else {
                    logger.info('Video element not yet available, retrying...');
                    setTimeout(checkVideoElement, 500); // Retry after 500ms
                }
            };
            checkVideoElement();
        });
    };

    useGlobalEventListener('message', handleUrlChangeMessage);

    useEffect(() => {
        logger.info('useDetectUrlChange mounted, checking URL...');
        handleUrlChange();
    }, []);

    return null;
};

export default useDetectUrlChange;
