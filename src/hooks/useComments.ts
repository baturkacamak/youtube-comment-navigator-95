import {useEffect, useRef} from 'react';
import {useDispatch} from 'react-redux';
import {setComments, setInitialComments, updateCommentsData} from '../store/store';
import {fetchCommentsIncrementally} from "../services/comments/localFetch";
import {processRawJsonCommentsData} from "../services/utils/utils";
import {Comment} from '../types/commentTypes'; // Import the Comment type

const useComments = () => {
    const dispatch = useDispatch();
    const initialLoadCompleted = useRef(false);
    const abortController = useRef(new AbortController());

    useEffect(() => {
        const loadComments = async () => {
            try {
                dispatch(setComments([]));
                const signal = abortController.current.signal;
                let initialComments: Comment[] = [];
                await fetchCommentsIncrementally((comments) => {
                    if (signal.aborted) return;
                    dispatch(updateCommentsData({comments: comments, isLoading: false}));
                    initialComments.push(...comments);
                }, signal); // Pass the signal to the fetch function
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
