import {useEffect, useRef} from 'react';
import {useDispatch} from 'react-redux';
import {setComments, setInitialComments, updateCommentsData} from '../store/store';
import {fetchCommentsIncrementally} from "../services/comments/localFetch";
import {Comment} from '../types/commentTypes'; // Import the Comment type
import {getValidCachedData} from "../utils/cacheUtils";
import {extractYouTubeVideoIdFromUrl} from "../utils/extractYouTubeVideoIdFromUrl";
import {CACHE_KEYS} from "../utils/environmentVariables";


const useComments = () => {
    const dispatch = useDispatch();
    const initialLoadCompleted = useRef(false);
    const abortController = useRef(new AbortController());
    const byPassCache = false;

    useEffect(() => {
        const loadComments = async () => {
            try {
                dispatch(setComments([]));
                const signal = abortController.current.signal;

                // Check for final cache
                const videoId = extractYouTubeVideoIdFromUrl();
                const FINAL_CACHE_KEY = CACHE_KEYS.FINAL(videoId);
                const finalCachedData = await getValidCachedData(FINAL_CACHE_KEY);

                if (finalCachedData) {
                    dispatch(setInitialComments(finalCachedData));
                    dispatch(updateCommentsData({comments: finalCachedData, isLoading: false}));
                    initialLoadCompleted.current = true;
                    return;
                }

                // Check for temporary cache and continuation token
                const TEMP_CACHE_KEY = CACHE_KEYS.TEMP(videoId);
                const CONTINUATION_TOKEN_KEY = CACHE_KEYS.CONTINUATION_TOKEN(videoId);
                const tempCachedData = await getValidCachedData(TEMP_CACHE_KEY);
                const continuationToken = localStorage.getItem(CONTINUATION_TOKEN_KEY) || undefined;

                if (tempCachedData && continuationToken) {
                    dispatch(setInitialComments(tempCachedData.items));
                }

                let initialComments: Comment[] = tempCachedData?.items || [];
                await fetchCommentsIncrementally((comments) => {
                    if (signal.aborted) return;
                    dispatch(updateCommentsData({comments: comments, isLoading: false}));
                    initialComments.push(...comments);
                }, signal, byPassCache, continuationToken); // Pass the signal and continuation token to the fetch function

                dispatch(setInitialComments(initialComments)); // Pass the array directly
                initialLoadCompleted.current = true;
            } catch (error) {
                if (error instanceof Error) {
                    if (error.name !== 'AbortError') {
                        console.error('Error fetching comments:', error);
                    }
                } else {
                    console.error('Unknown error fetching comments:', error);
                }
            }
        };

        loadComments();

        // Cleanup function to handle component unmount and cancel ongoing requests
        return () => {
            abortController.current.abort();
            // Reset abort controller for future requests
            abortController.current = new AbortController();
        };
    }, [dispatch]);

    return {initialLoadCompleted: initialLoadCompleted.current};
};

export default useComments;
