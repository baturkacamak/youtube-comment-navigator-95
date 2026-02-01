import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTranscript } from '../services/fetchTranscript';
import { RootState } from '../../../types/rootState';
import { setFilteredTranscripts, setIsLoading, setTranscripts } from '../../../store/store';
import {
  getTranscriptFetchErrorMessage,
  shouldShowTranscriptErrorToast,
} from '../services/transcriptErrorHandler';
import { useToast } from '../../shared/contexts/ToastContext';

const useTranscript = () => {
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const isLoading = useSelector((state: RootState) => state.isLoading);
  const transcripts = useSelector((state: RootState) => state.transcripts);
  const selectedLanguage = useSelector(
    (state: RootState) => state.transcriptSelectedLanguage.value
  );

  const loadTranscript = useCallback(async () => {
    dispatch(setIsLoading(true));
    try {
      const transcriptData = await fetchTranscript(selectedLanguage);
      if (transcriptData) {
        dispatch(setTranscripts(transcriptData.items));
        dispatch(setFilteredTranscripts(transcriptData.items));
      }
    } catch (error: any) {
      if (shouldShowTranscriptErrorToast(error)) {
        const message = getTranscriptFetchErrorMessage(error);
        if (message) {
          showToast({
            type: 'error',
            message,
            duration: 5000,
          });
        }
      }
    } finally {
      dispatch(setIsLoading(false));
    }
  }, [dispatch, selectedLanguage, showToast]);

  useEffect(() => {
    loadTranscript();
  }, [loadTranscript, selectedLanguage]);

  return { isLoading, transcripts, loadTranscript };
};

export default useTranscript;
