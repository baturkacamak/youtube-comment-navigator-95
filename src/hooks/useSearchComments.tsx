import { useDispatch, useSelector } from 'react-redux';
import {RootState, setComments, setCommentsCount, setFilters} from '../store/store';
import useSortedComments from "./useSortedComments";
import { Comment } from "../types/commentTypes";

const useSearchComments = () => {
  const dispatch = useDispatch();
  const originalComments = useSelector((state: any) => state.originalComments);
  const filters = useSelector((state: RootState) => state.filters);
  const { sortComments } = useSortedComments(true);

  const handleSearch = (keyword: string) => {
    dispatch(setFilters({ ...filters, keyword }));

    if (keyword.trim() === '') {
      dispatch(setComments(originalComments));
      dispatch(setCommentsCount(originalComments.length));
    } else {
      const filteredComments = originalComments.filter((comment: Comment) =>
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
