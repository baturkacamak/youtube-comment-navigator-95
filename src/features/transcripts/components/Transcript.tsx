import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../types/rootState';
import { formatTime } from '../utils/formatTime';
import { parseTimestamps } from '../../shared/utils/parseTimestamps';
import handleTimestampClick from "../../comments/utils/handleTimestampClick";
import CopyToClipboardButton from "../../shared/components/CopyToClipboardButton";
import ToggleButton from "../../shared/components/ToggleButton";
import { DocumentArrowDownIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { extractYouTubeVideoIdFromUrl } from '../../shared/utils/extractYouTubeVideoIdFromUrl';
import { getVideoTitle } from "../../shared/utils/getVideoTitle";

const Transcript: React.FC = () => {
    const transcripts = useSelector((state: RootState) => state.transcripts);
    const textSize = useSelector((state: RootState) => state.settings.textSize);
    const [includeTimestamps, setIncludeTimestamps] = useState(true);

    const getFormattedFileName = () => {
        const baseName = 'transcript';
        const videoTitle = getVideoTitle();
        const videoId = extractYouTubeVideoIdFromUrl();
        if (videoTitle) return `${baseName}-${videoTitle}.txt`;
        if (videoId) return `${baseName}-${videoId}.txt`;
        return `${baseName}-${new Date().toISOString()}.txt`;
    };

    const handleDownloadTranscript = () => {
        const transcriptText = includeTimestamps
            ? transcripts.map(entry => `${formatTime(entry.start)} ${entry.text}`).join('\n')
            : transcripts.map(entry => entry.text).join('\n');
        const blob = new Blob([transcriptText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getFormattedFileName();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handlePrintTranscript = () => {
        const transcriptText = includeTimestamps
            ? transcripts.map(entry => `${formatTime(entry.start)} ${entry.text}`).join('\n')
            : transcripts.map(entry => entry.text).join('\n');
        const printWindow = window.open('', '', 'height=400,width=600');
        if (printWindow) {
            printWindow.document.write('<pre>' + transcriptText + '</pre>');
            printWindow.document.close();
            printWindow.print();
        } else {
            console.error("Failed to open print window");
        }
    };

    const transcriptTextWithTimestamps = transcripts.map(entry => `${formatTime(entry.start)} ${entry.text}`).join('\n');
    const transcriptTextWithoutTimestamps = transcripts.map(entry => entry.text).join('\n');

    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow" aria-live="polite" aria-label="Transcript">
            <div className="flex justify-between mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-800 dark:text-gray-200 mr-2 select-none">
                        {includeTimestamps ? 'Include timestamps' : 'Exclude timestamps'}
                    </label>
                    <ToggleButton
                        isChecked={includeTimestamps}
                        onToggle={() => setIncludeTimestamps(!includeTimestamps)}
                    />
                    <CopyToClipboardButton
                        textToCopy={includeTimestamps ? transcriptTextWithTimestamps : transcriptTextWithoutTimestamps}
                    />
                    <button onClick={handleDownloadTranscript} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300">
                        <DocumentArrowDownIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                        <span className="text-sm">Download</span>
                    </button>
                    <button onClick={handlePrintTranscript} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300">
                        <PrinterIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                        <span className="text-sm">Print</span>
                    </button>
                </div>
            </div>
            {transcripts.length === 0 ? (
                <p className={`text-gray-600 dark:text-gray-400 ${textSize}`} aria-live="assertive" aria-label="No transcript available">
                    No transcript available.
                </p>
            ) : (
                <ul aria-live="polite">
                    {transcripts.map((entry, index) => (
                        <li key={index} className={`mb-2 flex items-center transition-all duration-300 ease-in-out ${textSize}`} aria-label={`Transcript entry at ${formatTime(entry.start)}`}>
                            <span
                                className={`bg-red-100 text-sm font-medium text-red-600 dark:bg-red-800 dark:text-red-200 px-2 py-1 rounded ${includeTimestamps ? '' :'select-none'} ${index % 2 === 0 ? 'mr-4' : 'mr-2'}`}
                                aria-hidden="true">
                                {parseTimestamps([formatTime(entry.start)], handleTimestampClick)}
                            </span>{' '}
                            <span
                                className={`text-gray-800 dark:text-gray-200 ${index % 2 === 0 ? 'text-black' : 'text-gray-700'}`}>{entry.text}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Transcript;
