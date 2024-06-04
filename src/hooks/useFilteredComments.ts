import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setComments } from '../store/store';
import { Comment } from "../types/commentTypes";

const useFilteredComments = (initialLoadCompleted: boolean) => {
    const dispatch = useDispatch();
    const originalComments = useSelector((state: any) => state.originalComments);
    const filters = useSelector((state: any) => state.filters);
    const previousFiltersRef = useRef<any>(null);

    const filterComments = (comments: Comment[], filters: any) => {
        return comments.filter(comment => {
            if (filters.timestamps && !comment.hasTimestamp) return false;
            if (filters.heart && !comment.isHearted) return false;
            if (filters.links && !comment.hasLinks) return false;
            if (filters.members && !comment.isMember) return false;
            if (filters.donated && !comment.isDonated) return false;
            return true;
        });
    };

    useEffect(() => {
        if (initialLoadCompleted) {
            let filteredComments = originalComments;

            if (filters.timestamps || filters.heart || filters.links || filters.members || filters.donated) {
                filteredComments = filterComments(originalComments, filters);
                dispatch(setComments(filteredComments));
            }
            previousFiltersRef.current = { ...filters };
        }
    }, [filters, initialLoadCompleted, originalComments, dispatch]);

    return { filterComments };
};

export default useFilteredComments;
