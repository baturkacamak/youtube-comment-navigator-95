import React from 'react';
import {formatTime} from '../utils/formatTime';
import handleClickTimestamp from "../../comments/utils/comments/handleClickTimestamp";
import {highlightText} from '../../shared/utils/highlightText';
import {parseTimestamps} from "../../shared/utils/parseTimestamps";
import {RootState} from '../../../types/rootState';
import {useSelector} from 'react-redux';

interface TranscriptEntryProps {
    entry: any;
    index: number;
    includeTimestamps: boolean;
    hoveredLineIndex: number | null;
    setHoveredLineIndex: (index: number | null) => void;
}

const TranscriptEntry: React.FC<TranscriptEntryProps> = ({
                                                             entry,
                                                             index,
                                                             includeTimestamps,
                                                             hoveredLineIndex,
                                                             setHoveredLineIndex
                                                         }) => {
    const textSize = useSelector((state: RootState) => state.settings.textSize);
    const keyword = useSelector((state: RootState) => state.searchKeyword);
    const fontFamily = useSelector((state: RootState) => state.settings.fontFamily); // Get the selected font

    return (
        <li
            key={index}
            className={`mb-2 flex items-center rounded-lg ${textSize} ${index % 2 === 0 ? 'bg-gray-100 dark:bg-gray-700' : 'bg-slate-50 dark:bg-gray-800'}`}
            aria-label={`Transcript entry at ${formatTime(entry.start)}`}
            onMouseEnter={() => setHoveredLineIndex(index)}
            onMouseLeave={() => setHoveredLineIndex(null)}
            role="listitem"
        >
            <div className="flex items-center w-full">
                <span
                    className={`bg-stone-200 text-sm font-medium rounded text-gray-800 dark:bg-gray-500 dark:text-gray-900 px-2 py-1 ${includeTimestamps ? '' : 'select-none'} mr-2`}
                    aria-hidden="true"
                >
                    {parseTimestamps({
                        content: [formatTime(entry.start)],
                        handleTimestampClick: handleClickTimestamp,
                        timestampColor: "dark:text-gray-900"
                    })}
                </span>
                <div
                    className="flex-1 pb-2 -mb-2 inline-flex items-center"
                    role="button"
                    tabIndex={0}
                    aria-label={`Transcript text: ${entry.text}`}
                >
                    <span
                        className={`text-gray-800 dark:text-gray-300 min-w-96 cursor-text ${index % 2 === 0 ? 'text-black' : 'pl-2 text-gray-700'}`}
                        style={{fontFamily}}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {highlightText(entry.text, keyword)}
                    </span>
                </div>
            </div>
        </li>
    );
};

export default TranscriptEntry;
