import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTranscript } from '../services/fetchTranscript';
import { RootState } from '../../../types/rootState';
import { setFilteredTranscripts, setLoading, setTranscripts, setTranscriptsCount } from '../../../store/store';

const useTranscript = (language?: string) => {
    const dispatch = useDispatch();
    const isLoading = useSelector((state: RootState) => state.isLoading);
    const transcripts = useSelector((state: RootState) => state.transcripts);

    const loadTranscript = useCallback(async () => {
        dispatch(setLoading(true));
        const transcriptData = await fetchTranscript(language);
        if (transcriptData) {
            dispatch(setTranscripts(transcriptData.items));
            dispatch(setFilteredTranscripts(transcriptData.items));
            dispatch(setTranscriptsCount(transcriptData.totalDuration));
        }
        dispatch(setLoading(false));
    }, [dispatch, language]);

    useEffect(() => {
        loadTranscript();
    }, [loadTranscript]);

    return { isLoading, transcripts, loadTranscript };
};

export default useTranscript;
