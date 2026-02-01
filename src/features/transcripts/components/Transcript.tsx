import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../types/rootState';
import ActionButtons from './ActionButtons';
import TranscriptEntry from './TranscriptEntry';
import { setTranscripts } from '../../../store/store';
import { fetchTranscript } from '../services/fetchTranscript';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface TranscriptProps {
  transcripts: any[];
}

const Transcript: React.FC<TranscriptProps> = ({ transcripts }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [includeTimestamps, setIncludeTimestamps] = useState(() => {
    return localStorage.getItem('transcript_timestamps_preference') === 'true';
  });
  const selectedLanguage = useSelector((state: RootState) => state.transcriptSelectedLanguage);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const isLoading = useSelector((state: RootState) => state.isLoading);

  useEffect(() => {
    localStorage.setItem('transcript_timestamps_preference', String(includeTimestamps));
  }, [includeTimestamps]);

  useEffect(() => {
    const fetchAndSetTranscript = async () => {
      const newTranscript = await fetchTranscript(selectedLanguage.value);
      if (newTranscript) {
        dispatch(setTranscripts(newTranscript.items));
      }
    };

    if (selectedLanguage.value) {
      fetchAndSetTranscript();
    }
  }, [selectedLanguage, dispatch]);

  return (
    <div className="rounded" aria-live="polite" aria-label="Transcript">
      <div className="sticky top-0 bg-gray-100 rounded-lg py-3 px-2 dark:bg-gray-900 dark:border-gray-600 dark:border-solid dark:border mb-4 z-10">
        <ActionButtons
          transcripts={transcripts}
          includeTimestamps={includeTimestamps}
          setIncludeTimestamps={setIncludeTimestamps}
        />
      </div>
      {transcripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 mt-4" aria-live="polite">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
          <p className="text-lg text-gray-700 dark:text-gray-300 font-medium mb-2">
            {isLoading ? t('Loading transcript...') : t('Transcript not available')}
          </p>
          {!isLoading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {t('This video does not have a transcript, or it could not be loaded.')}
            </p>
          )}
        </div>
      ) : (
        <ul aria-live="polite">
          {transcripts.map((entry, index) => (
            <TranscriptEntry
              key={index}
              entry={entry}
              index={index}
              includeTimestamps={includeTimestamps}
              hoveredLineIndex={hoveredLineIndex}
              setHoveredLineIndex={setHoveredLineIndex}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default Transcript;
