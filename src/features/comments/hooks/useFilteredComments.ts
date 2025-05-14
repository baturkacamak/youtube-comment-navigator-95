import { Comment } from "../../../types/commentTypes";

/**
 * Simple helper hook that only exposes the filtering function so other hooks/components can
 * reuse the same predicate logic. All actual data loading / filtered lists are now handled
 * in loadPagedComments (IndexedDB query) and in memo-ised selectors.
 */
const useFilteredComments = () => {

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

    return { filterComments };
};

export default useFilteredComments;
