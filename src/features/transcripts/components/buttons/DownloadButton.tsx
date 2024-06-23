import React from 'react';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { getVideoTitle } from "../../../shared/utils/getVideoTitle";
import { extractYouTubeVideoIdFromUrl } from '../../../shared/utils/extractYouTubeVideoIdFromUrl';

interface DownloadButtonProps {
    transcriptText: string;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ transcriptText }) => {
    const getFormattedFileName = () => {
        const baseName = 'transcript';
        const videoTitle = getVideoTitle();
        const videoId = extractYouTubeVideoIdFromUrl();
        if (videoTitle) return `${baseName}-${videoTitle}.txt`;
        if (videoId) return `${baseName}-${videoId}.txt`;
        return `${baseName}-${new Date().toISOString()}.txt`;
    };

    const handleDownloadTranscript = () => {
        const blob = new Blob([transcriptText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getFormattedFileName();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <button onClick={handleDownloadTranscript}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300">
            <DocumentArrowDownIcon className="w-4 h-4 mr-1" aria-hidden="true"/>
            <span className="text-sm">Download</span>
        </button>
    );
};

export default DownloadButton;
