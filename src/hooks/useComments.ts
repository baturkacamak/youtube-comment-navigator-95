import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {setInitialComments, setLoading, setCommentsCount, setComments} from '../store/store';
import { fetchComments } from '../services/comments/fetchComments';

const useComments = () => {
    const dispatch = useDispatch();
    const [initialLoadCompleted, setInitialLoadCompleted] = useState(false);

    useEffect(() => {
        const loadComments = async () => {
            dispatch(setLoading(true));
            const data = await fetchComments();
            dispatch(setInitialComments(data.items));
            dispatch(setComments(data.items));
            dispatch(setCommentsCount(data.items.length));
            dispatch(setLoading(false));
            setInitialLoadCompleted(true);
        };

        loadComments();
    }, [dispatch]);

    return { initialLoadCompleted };
};

export default useComments;
