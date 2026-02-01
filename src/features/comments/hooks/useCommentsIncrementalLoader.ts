import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setComments } from '../../../store/store';
import { fetchCommentsFromRemote } from '../services/remote/remoteFetch';
import {
  getCommentFetchErrorMessage,
  shouldShowErrorToast,
} from '../services/remote/commentErrorHandler';
import { useToast } from '../../shared/contexts/ToastContext';

const BY_PASS_CACHE = false;

const useCommentsIncrementalLoader = () => {
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const initialLoadCompleted = useRef(false);

  useEffect(() => {
    const loadComments = async () => {
      try {
        dispatch(setComments([]));
        await fetchCommentsFromRemote(dispatch, BY_PASS_CACHE);

        initialLoadCompleted.current = true;
      } catch (error: any) {
        if (shouldShowErrorToast(error)) {
          const message = getCommentFetchErrorMessage(error);
          if (message) {
            showToast({
              type: 'error',
              message,
              duration: 5000,
            });
          }
        }
      }
    };

    loadComments();

    // Cleanup function to handle component unmount and cancel ongoing requests
  }, [dispatch, showToast]);

  return { initialLoadCompleted: initialLoadCompleted.current };
};

export default useCommentsIncrementalLoader;
