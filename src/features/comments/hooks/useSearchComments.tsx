import { useDispatch, useSelector } from 'react-redux';
import useSortedComments from "./useSortedComments";
import { Comment } from "../../../types/commentTypes";
import { RootState } from "../../../types/rootState";
import { setComments, setCommentsCount, setFilters, setBookmarkedComments } from "../../../store/store";

const useSearchComments = () => {
  const dispatch = useDispatch();
  const originalComments = useSelector((state: RootState) => state.originalComments);
  const filters = useSelector((state: RootState) => state.filters);
  const showBookmarked = useSelector((state: RootState) => state.showBookmarked);
  const bookmarkedComments = useSelector((state: RootState) => state.bookmarkedComments);
  const { sortComments } = useSortedComments(true);

  const handleSearch = (keyword: string) => {
    dispatch(setFilters({ ...filters, keyword }));

    const commentsToSearch = originalComments;
    const bookmarksToSearch = bookmarkedComments;

    const filterAndSort = (comments: Comment[]) => {
      const filteredComments = comments.filter((comment: Comment) =>
          comment.content.toLowerCase().includes(keyword.toLowerCase())
      );
      return sortComments(filteredComments, filters.sortBy, filters.sortOrder);
    };

    if (keyword.trim() === '') {
      dispatch(setComments(commentsToSearch));
      dispatch(setBookmarkedComments(bookmarksToSearch));
      dispatch(setCommentsCount(commentsToSearch.length));
    } else {
      const sortedAndFilteredComments = filterAndSort(commentsToSearch);
      const sortedAndFilteredBookmarks = filterAndSort(bookmarksToSearch);

      dispatch(setComments(sortedAndFilteredComments));
      dispatch(setBookmarkedComments(sortedAndFilteredBookmarks));
      dispatch(setCommentsCount(sortedAndFilteredComments.length));
    }
  };

  return { handleSearch };
};

export default useSearchComments;
