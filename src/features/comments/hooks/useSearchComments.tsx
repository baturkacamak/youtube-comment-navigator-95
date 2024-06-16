import { useDispatch, useSelector } from 'react-redux';
import { RootState, setComments, setCommentsCount, setFilters } from '../../../store/store';
import useSortedComments from "./useSortedComments";
import { Comment } from "../../../types/commentTypes";

const useSearchComments = () => {
  const dispatch = useDispatch();
  const originalComments = useSelector((state: RootState) => state.originalComments);
  const filters = useSelector((state: RootState) => state.filters);
  const showBookmarked = useSelector((state: RootState) => state.showBookmarked);
  const bookmarkedComments = useSelector((state: RootState) => state.bookmarkedComments);
  const { sortComments } = useSortedComments(true);

  const handleSearch = (keyword: string) => {
    dispatch(setFilters({ ...filters, keyword }));

    const commentsToSearch = showBookmarked ? bookmarkedComments : originalComments;

    if (keyword.trim() === '') {
      dispatch(setComments(commentsToSearch));
      dispatch(setCommentsCount(commentsToSearch.length));
    } else {
      const filteredComments = commentsToSearch.filter((comment: Comment) =>
          comment.content.toLowerCase().includes(keyword.toLowerCase())
      );
      const sortedAndFilteredComments = sortComments(filteredComments, filters.sortBy, filters.sortOrder);
      dispatch(setComments(sortedAndFilteredComments));
      dispatch(setCommentsCount(sortedAndFilteredComments.length));
    }
  };

  return { handleSearch };
};

export default useSearchComments;
