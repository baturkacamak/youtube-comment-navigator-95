import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTranscript } from '../services/fetchTranscript';
import { RootState } from '../../../types/rootState';
import { setFilteredTranscripts, setLoading, setTranscripts, setTranscriptsCount } from '../../../store/store';

const useTranscript = () => {
    const dispatch = useDispatch();
    const isLoading = useSelector((state: RootState) => state.isLoading);
    const transcripts = useSelector((state: RootState) => state.transcripts);
    const selectedLanguage = useSelector((state: RootState) => state.transcriptSelectedLanguage.value);

    const loadTranscript = useCallback(async () => {
        dispatch(setLoading(true));
        const transcriptData = await fetchTranscript(selectedLanguage);
        if (transcriptData) {
            dispatch(setTranscripts(transcriptData.items));
            dispatch(setFilteredTranscripts(transcriptData.items));
            dispatch(setTranscriptsCount(transcriptData.totalDuration));
        }
        dispatch(setLoading(false));
    }, [dispatch, selectedLanguage]);

    useEffect(() => {
        loadTranscript();
    }, [loadTranscript, selectedLanguage]);

    return { isLoading, transcripts, loadTranscript };
};

export default useTranscript;
