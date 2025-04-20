import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Comment } from "../../../types/commentTypes";
import { setDisplayedComments } from "../../../store/store";

const useFilteredComments = (initialLoadCompleted: boolean) => {
    const dispatch = useDispatch();
    const displayedComments = useSelector((state: any) => state.displayedComments);
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
            let filteredComments = displayedComments;
            if (filters.timestamps || filters.heart || filters.links || filters.members || filters.donated) {
                filteredComments = filterComments(displayedComments, filters);
                dispatch(setDisplayedComments(filteredComments));
            } else {
                dispatch(setDisplayedComments(displayedComments));
            }
            previousFiltersRef.current = { ...filters };
        }
    }, [filters, initialLoadCompleted, displayedComments, dispatch]);

    return { filterComments };
};

export default useFilteredComments;