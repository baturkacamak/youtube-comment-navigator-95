import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../types/rootState';
import { formatTime } from '../utils/formatTime';
import handleTimestampClick from "../../comments/utils/handleTimestampClick";
import ActionButtons from './ActionButtons';
import BookmarkButton from './buttons/BookmarkButton';
import { highlightText } from '../../shared/utils/highlightText';
import { parseTimestamps } from "../../shared/utils/parseTimestamps";

interface TranscriptProps {
    transcripts: any[];
}

const Transcript: React.FC<TranscriptProps> = ({ transcripts }) => {
    const textSize = useSelector((state: RootState) => state.settings.textSize);
    const keyword = useSelector((state: RootState) => state.filters.keyword);
    const [includeTimestamps, setIncludeTtimestamps] = useState(true);
    const [selectedLanguage, setSelectedLanguage] = useState({ value: 'en', label: 'English' });
    const [bookmarkedLines, setBookmarkedLines] = useState<number[]>([]);
    const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);

    const toggleBookmark = (index: number) => {
        setBookmarkedLines((prev) => {
            if (prev.includes(index)) {
                return prev.filter((i) => i !== index);
            } else {
                return [...prev, index];
            }
        });
    };

    const handleLineClick = (index: number) => {
        toggleBookmark(index);
    };

    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow" aria-live="polite" aria-label="Transcript">
            <div className="sticky top-0 bg-white dark:bg-gray-800 z-10">
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
                        <li
                            key={index}
                            className={`mb-2 flex items-center rounded-lg ${textSize} ${bookmarkedLines.includes(index) ? 'bg-teal-200 dark:bg-gray-600' : index % 2 === 0 ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}`}
                            aria-label={`Transcript entry at ${formatTime(entry.start)}`}
                            onMouseEnter={() => setHoveredLineIndex(index)}
                            onMouseLeave={() => setHoveredLineIndex(null)}
                            role="listitem"
                        >
                            <div className="flex items-center w-full">
                                <span
                                    className={`bg-red-100 text-sm font-medium rounded text-red-600 dark:bg-gray-500 dark:text-gray-900 px-2 py-1 ${includeTimestamps ? '' : 'select-none'} mr-2`}
                                    aria-hidden="true"
                                >
                                    {parseTimestamps({ content: [formatTime(entry.start)], handleTimestampClick, timestampColor: "dark:text-gray-900" })}
                                </span>
                                <div
                                    className="flex-1 pb-2 -mb-2 inline-flex items-center"
                                    onClick={() => handleLineClick(index)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            handleLineClick(index);
                                        }
                                    }}
                                    aria-pressed={bookmarkedLines.includes(index)}
                                    aria-label={`Transcript text: ${entry.text}`}
                                >
                                    <span
                                        className={`text-gray-800 dark:text-gray-300 min-w-96 cursor-text ${index % 2 === 0 ? 'text-black' : 'pl-2 text-gray-700'}`}
                                        onClick={(e) => e.stopPropagation()}>
                                        {highlightText(entry.text, keyword)}
                                    </span>
                                    <BookmarkButton
                                        isBookmarked={bookmarkedLines.includes(index)}
                                        onToggleBookmark={() => toggleBookmark(index)}
                                        isVisible={hoveredLineIndex === index || bookmarkedLines.includes(index)}
                                    />
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Transcript;
