import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../types/rootState';
import ActionButtons from './ActionButtons';
import TranscriptEntry from './TranscriptEntry';
import { useTranslation } from "react-i18next";
import { setTranscripts } from "../../../store/store";
import { fetchTranscript } from "../services/fetchTranscript";

interface TranscriptProps {
    transcripts: any[];
    allTranscripts?: any[];
}

const Transcript: React.FC<TranscriptProps> = ({ transcripts, allTranscripts }) => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const textSize = useSelector((state: RootState) => state.settings.textSize);
    const [includeTimestamps, setIncludeTimestamps] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState({ value: '', label: t('Select Language') });
    const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);

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
                    allTranscripts={allTranscripts}
                    includeTimestamps={includeTimestamps}
                    setIncludeTimestamps={setIncludeTimestamps}
                    selectedLanguage={selectedLanguage}
                    setSelectedLanguage={setSelectedLanguage}
                />
            </div>
            {transcripts.length === 0 ? (
                <p className={`text-gray-600 dark:text-gray-400 ${textSize}`} aria-live="assertive" aria-label="No transcript available">
                    No transcript available.
                </p>
            ) : (
                <ul aria-live="polite" role="list">
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
