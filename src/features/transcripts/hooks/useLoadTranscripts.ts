import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {setFilteredTranscripts, setLoading, setTranscripts, setTranscriptsCount} from '../../../store/store';
import { fetchTranscript } from '../services/fetchTranscript';

const useLoadTranscripts = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const loadTranscripts = async () => {
            dispatch(setLoading(true));
            const transcriptData = await fetchTranscript();
            if (transcriptData) {
                dispatch(setTranscripts(transcriptData.items));
                dispatch(setFilteredTranscripts(transcriptData.items));
                dispatch(setTranscriptsCount(transcriptData.totalDuration));
            }
            dispatch(setLoading(false));
        };

            loadTranscripts();
    }, [dispatch]);
};

export default useLoadTranscripts;
