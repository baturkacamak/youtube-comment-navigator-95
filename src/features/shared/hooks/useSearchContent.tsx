import {useDispatch, useSelector} from "react-redux";
import {RootState} from "../../../types/rootState";
import useSortedComments from "../../comments/hooks/useSortedComments";
import {
  setBookmarkedComments,
  setComments,
  setCommentsCount,
  setFilteredTranscripts,
  setFilters, setTranscriptsCount
} from "../../../store/store";
import {calculateFilteredWordCount} from "../utils/calculateWordCount";
import {Comment} from "../../../types/commentTypes";


const useSearchContent = () => {
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
    const transcriptsToSearch = originalTranscripts;

    const filterAndSortComments = (comments: Comment[]) => {
      const filteredComments = comments.filter((comment: Comment) =>
          comment?.content.toLowerCase().includes(keyword.toLowerCase())
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
      dispatch(setFilteredTranscripts(transcriptsToSearch));
    } else {
      const sortedAndFilteredComments = filterAndSortComments(commentsToSearch);
      const sortedAndFilteredBookmarks = filterAndSortComments(bookmarksToSearch);
      const filteredTranscripts = filterTranscripts(transcriptsToSearch);

      dispatch(setComments(sortedAndFilteredComments));
      dispatch(setBookmarkedComments(sortedAndFilteredBookmarks));
      dispatch(setCommentsCount(sortedAndFilteredComments.length));
      dispatch(setFilteredTranscripts(filteredTranscripts));

      const filteredWordCount = calculateFilteredWordCount(filteredTranscripts, keyword);
      dispatch(setTranscriptsCount(filteredWordCount));
    }
  };

  return { handleSearch };
};

export default useSearchContent;
