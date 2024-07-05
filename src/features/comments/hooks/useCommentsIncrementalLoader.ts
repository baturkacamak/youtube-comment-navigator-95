import {useEffect, useRef} from 'react';
import {useDispatch} from 'react-redux';
import {Comment} from '../../../types/commentTypes'; // Import the Comment type
import {getCachedDataIfValid} from "../../shared/utils/cacheUtils";
import {extractYouTubeVideoIdFromUrl} from "../../shared/utils/extractYouTubeVideoIdFromUrl";
import {CACHE_KEYS, isLocalEnvironment} from "../../shared/utils/environmentVariables";
import {setComments, setOriginalComments} from "../../../store/store";
import {fetchCommentsFromRemote} from "../services/remoteFetch"; // Import fetchCommentsFromRemote
import {fetchContinuationTokenFromRemote} from "../services/fetchContinuationTokenFromRemote";
import {fetchCommentsFromLocalIncrementally} from "../services/localFetch";

const useCommentsIncrementalLoader = () => {
    const dispatch = useDispatch();
    const initialLoadCompleted = useRef(false);
    const abortController = useRef(new AbortController());
    const byPassCache = false;

    useEffect(() => {
        const loadComments = async () => {
            try {
                dispatch(setComments([]));

                // Check for final cache
                const videoId = extractYouTubeVideoIdFromUrl();
                const FINAL_CACHE_KEY = CACHE_KEYS.FINAL(videoId);
                const finalCachedData = await getCachedDataIfValid(FINAL_CACHE_KEY);

                if (finalCachedData) {
                    dispatch(setOriginalComments(finalCachedData));
                    dispatch(setComments(finalCachedData));
                    initialLoadCompleted.current = true;
                    return;
                }

                // Check for temporary cache and continuation token
                const TEMP_CACHE_KEY = CACHE_KEYS.TEMP(videoId);
                const CONTINUATION_TOKEN_KEY = CACHE_KEYS.CONTINUATION_TOKEN(videoId);
                const tempCachedData = await getCachedDataIfValid(TEMP_CACHE_KEY);
                const continuationToken = localStorage.getItem(CONTINUATION_TOKEN_KEY) || await fetchContinuationTokenFromRemote();

                if (tempCachedData && continuationToken) {
                    dispatch(setOriginalComments(tempCachedData.items));
                }

                let initialComments: Comment[] = tempCachedData?.items ? [...tempCachedData.items] : [];

                const fetchCommentsIncrementally = async (
                    onCommentFetched: (comment: any[]) => void,
                    byPassCache: boolean = false,
                    continuationToken?: string
                ) => {
                    if (isLocalEnvironment()) {
                        await fetchCommentsFromLocalIncrementally(onCommentFetched);
                    } else {
                        await fetchCommentsFromRemote(onCommentFetched, byPassCache, continuationToken);
                    }
                };

                await fetchCommentsIncrementally((comments) => {
                    dispatch(setComments(comments));
                    initialComments = comments;
                }, byPassCache, continuationToken);

                dispatch(setOriginalComments(initialComments)); // Pass the array directly
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

export default useCommentsIncrementalLoader;
