import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Comment } from "../../../types/commentTypes";
import {setComments} from "../../../store/store";

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
            if (filters.creator && !comment.isAuthorContentCreator) return false;
            return true;
        });
    };

    useEffect(() => {
        if (initialLoadCompleted) {
            let filteredComments = originalComments;
            if (filters.timestamps || filters.heart || filters.links || filters.members || filters.donated) {
                filteredComments = filterComments(originalComments, filters);
                dispatch(setComments(filteredComments));
            } else {
                dispatch(setComments(originalComments));
            }
            previousFiltersRef.current = { ...filters };
        }
    }, [filters, initialLoadCompleted, originalComments, dispatch]);

    return { filterComments };
};

export default useFilteredComments;
