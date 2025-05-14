import {useEffect, useRef} from 'react';
import {useDispatch} from 'react-redux';
import {setComments} from "../../../store/store";
import {fetchCommentsFromRemote} from "../services/remote/remoteFetch";

const useCommentsIncrementalLoader = () => {
    const dispatch = useDispatch();
    const initialLoadCompleted = useRef(false);
    const byPassCache = false;

    useEffect(() => {
        const loadComments = async () => {
            try {
                dispatch(setComments([]));
                await fetchCommentsFromRemote(dispatch, byPassCache);

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
    }, [dispatch]);

    return {initialLoadCompleted: initialLoadCompleted.current};
};

export default useCommentsIncrementalLoader;
