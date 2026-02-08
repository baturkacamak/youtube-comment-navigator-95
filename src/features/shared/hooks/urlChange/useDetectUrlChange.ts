import { useEffect } from 'react';
import { extractYouTubeVideoIdFromUrl } from '../../utils/extractYouTubeVideoIdFromUrl';
import { setIsLoading } from '../../../../store/store';
import { useDispatch } from 'react-redux';
import useGlobalEventListener from '../useGlobalEventListener';
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
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        resolve();
        return;
      }

      const checkVideoElement = () => {
        const isShortsPage = window.location.pathname.startsWith('/shorts');
        const videoElement = isShortsPage
          ? document.querySelector(
              'ytd-reel-video-renderer[is-active] video, ytd-reel-video-renderer video, video.html5-main-video'
            )
          : document.querySelector(
              `[video-id="${videoId}"], ytd-watch-flexy video, video.html5-main-video`
            );

        if (videoElement) {
          resolve();
        } else {
          setTimeout(checkVideoElement, 500); // Retry after 500ms
        }
      };
      checkVideoElement();
    });
  };

  useGlobalEventListener('message', handleUrlChangeMessage);

  useEffect(() => {
    handleUrlChange();
  }, []);

  return null;
};

export default useDetectUrlChange;
