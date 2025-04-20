import {useEffect, useRef} from 'react';
import {useDispatch} from 'react-redux';
import {setIsLoading} from "../../../store/store";
import {fetchCommentsFromRemote} from "../services/remote/remoteFetch";

const useCommentsIncrementalLoader = () => {
    const dispatch = useDispatch();
    const initialLoadCompleted = useRef(false);
    const byPassCache = false;

    useEffect(() => {
        const loadComments = async () => {
            try {
                dispatch(setIsLoading(true));
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]); // byPassCache her zaman sabit olduğu için bağımlılık dizisinden çıkarıldı

    return {initialLoadCompleted: initialLoadCompleted.current};
};

export default useCommentsIncrementalLoader;