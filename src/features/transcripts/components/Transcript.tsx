import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../types/rootState';
import ActionButtons from './ActionButtons';
import TranscriptEntry from './TranscriptEntry';

interface TranscriptProps {
    transcripts: any[];
}

const Transcript: React.FC<TranscriptProps> = ({ transcripts }) => {
    const textSize = useSelector((state: RootState) => state.settings.textSize);
    const [includeTimestamps, setIncludeTtimestamps] = useState(true);
    const [selectedLanguage, setSelectedLanguage] = useState({ value: '', label: 'Select Language' });
    const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);

    return (
        <div className="dark:bg-gray-800" aria-live="polite" aria-label="Transcript">
            <div className="sticky top-0 bg-gray-100 rounded-lg py-3 px-2 dark:bg-gray-800 mb-4 z-10">
                <ActionButtons
                    transcripts={transcripts}
                    includeTimestamps={includeTimestamps}
                    setIncludeTimestamps={setIncludeTtimestamps}
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
