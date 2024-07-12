import {useDispatch, useSelector} from "react-redux";
import {RootState} from "../../../types/rootState";
import {setBookmarkedComments, setComments, setFilteredTranscripts, setFilters,} from "../../../store/store";
import {calculateFilteredWordCount} from "../utils/calculateWordCount";
import {Comment} from "../../../types/commentTypes";
import {normalizeString} from "../utils/normalizeString";
import useSortedComments from "../../comments/hooks/sorting/useSortedComments";

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

    const normalizedKeyword = normalizeString(keyword);

    const commentsToSearch = originalComments;
    const bookmarksToSearch = bookmarkedComments;
    const transcriptsToSearch = originalTranscripts;

    const filterAndSortComments = (comments: Comment[]) => {
      const filteredCommentsMap = new Map<string, Comment>();

      comments.forEach(comment => {
        if (normalizeString(comment.content).includes(normalizedKeyword)) {
          filteredCommentsMap.set(comment.commentId, comment);
          if (comment.commentParentId) {
            const parentComment = comments.find(c => c.commentId === comment.commentParentId);
            if (parentComment) {
              filteredCommentsMap.set(parentComment.commentId, {
                ...parentComment,
                showRepliesDefault: true
              });
            }
          }
        }
      });

      const filteredComments = Array.from(filteredCommentsMap.values());
      // Reorder the comments to ensure parents come before their replies
      return filteredComments.sort((a, b) => {
        if (a.commentParentId === b.commentId) {
          return 1; // 'a' is a reply to 'b', so 'a' should come after 'b'
        } else if (b.commentParentId === a.commentId) {
          return -1; // 'b' is a reply to 'a', so 'b' should come after 'a'
        } else {
          return 0; // No direct parent-child relationship, keep the existing order
        }
      });
    };

    const filterTranscripts = (transcripts: any[]) => {
      return transcripts.filter((entry: any) =>
          normalizeString(entry.text).includes(normalizedKeyword)
      );
    };

    if (keyword.trim() !== '') {
      const sortedAndFilteredComments = filterAndSortComments(commentsToSearch);
      const sortedAndFilteredBookmarks = filterAndSortComments(bookmarksToSearch);
      const filteredTranscripts = filterTranscripts(transcriptsToSearch);
      const filteredWordCount = calculateFilteredWordCount(filteredTranscripts, keyword);
    }
  };

  return { handleSearch };
};

export default useSearchContent;
