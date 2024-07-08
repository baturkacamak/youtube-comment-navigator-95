import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Comment } from '../../../types/commentTypes';
import { extractYouTubeVideoIdFromUrl } from "../../shared/utils/extractYouTubeVideoIdFromUrl";
import { CACHE_KEYS, isLocalEnvironment } from "../../shared/utils/environmentVariables";
import { setComments, setOriginalComments } from "../../../store/store";
import { fetchCommentsFromRemote } from "../services/remote/remoteFetch";
import { fetchContinuationTokenFromRemote } from "../services/remote/fetchContinuationTokenFromRemote";
import { fetchCommentsFromLocalIncrementally } from "../services/local/localFetch";
import { db } from "../../shared/utils/database/database";

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
                const finalCachedData = await db.comments.where('videoId').equals(videoId).toArray();

                if (finalCachedData.length > 0) {
                    dispatch(setOriginalComments(finalCachedData));
                    dispatch(setComments(finalCachedData));
                    initialLoadCompleted.current = true;
                    return;
                }

                // Check for temporary cache and continuation token
                const TEMP_CACHE_KEY = CACHE_KEYS.TEMP(videoId);
                const CONTINUATION_TOKEN_KEY = CACHE_KEYS.CONTINUATION_TOKEN(videoId);
                const tempCachedData = await db.comments.where('videoId').equals(TEMP_CACHE_KEY).toArray();
                let continuationToken = '';
                if (!isLocalEnvironment()) {
                    continuationToken = localStorage.getItem(CONTINUATION_TOKEN_KEY) || await fetchContinuationTokenFromRemote();
                    if (tempCachedData.length > 0 && continuationToken) {
                        dispatch(setOriginalComments(tempCachedData));
                    }
                }

                let initialComments: Comment[] = tempCachedData.length > 0 ? [...tempCachedData] : [];

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

                dispatch(setOriginalComments(initialComments));
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

    return { initialLoadCompleted: initialLoadCompleted.current };
};

export default useCommentsIncrementalLoader;
