import { useDispatch, useSelector } from 'react-redux';
import useSortedComments from "./useSortedComments";
import { Comment } from "../../../types/commentTypes";
import { RootState } from "../../../types/rootState";
import { setComments, setCommentsCount, setFilters, setBookmarkedComments, setFilteredTranscripts } from "../../../store/store";

const useSearchComments = () => {
  const dispatch = useDispatch();
  const originalComments = useSelector((state: RootState) => state.originalComments);
  const originalTranscripts = useSelector((state: RootState) => state.transcripts);
  const filters = useSelector((state: RootState) => state.filters);
  const showBookmarked = useSelector((state: RootState) => state.showBookmarked);
  const bookmarkedComments = useSelector((state: RootState) => state.bookmarkedComments);
  const { sortComments } = useSortedComments(true);

  const handleSearch = (keyword: string) => {
    dispatch(setFilters({ ...filters, keyword }));

    const commentsToSearch = originalComments;
    const bookmarksToSearch = bookmarkedComments;
    const transcriptsToSearch = originalTranscripts; // Assuming you have this state

    const filterAndSortComments = (comments: Comment[]) => {
      const filteredComments = comments.filter((comment: Comment) =>
          comment.content.toLowerCase().includes(keyword.toLowerCase())
      );
      return sortComments(filteredComments, filters.sortBy, filters.sortOrder);
    };

    const filterTranscripts = (transcripts: any[]) => {
      return transcripts.filter((entry: any) =>
          entry.text.toLowerCase().includes(keyword.toLowerCase())
      );
    };

    if (keyword.trim() === '') {
      dispatch(setComments(commentsToSearch));
      dispatch(setBookmarkedComments(bookmarksToSearch));
      dispatch(setCommentsCount(commentsToSearch.length));
      dispatch(setFilteredTranscripts(transcriptsToSearch)); // Use original transcripts when no search
    } else {
      const sortedAndFilteredComments = filterAndSortComments(commentsToSearch);
      const sortedAndFilteredBookmarks = filterAndSortComments(bookmarksToSearch);
      const filteredTranscripts = filterTranscripts(transcriptsToSearch);

      dispatch(setComments(sortedAndFilteredComments));
      dispatch(setBookmarkedComments(sortedAndFilteredBookmarks));
      dispatch(setCommentsCount(sortedAndFilteredComments.length));
      dispatch(setFilteredTranscripts(filteredTranscripts));
    }
  };

  return { handleSearch };
};

export default useSearchComments;
