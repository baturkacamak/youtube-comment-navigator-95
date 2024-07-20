import React from 'react';
import CopyButton from './buttons/CopyButton';
import DownloadButton from './buttons/DownloadButton';
import PrintButton from './buttons/PrintButton';
import ShareButton from '../../shared/components/ShareButton';  // Import the ShareButton component
import TimestampToggle from './toggles/TimestampToggle';
import TranslateSelectBox from './toggles/TranslateSelectBox';  // Import the TranslateSelectBox component
import { formatTime } from '../utils/formatTime';

interface ActionButtonsProps {
    transcripts: any[];
    includeTimestamps: boolean;
    setIncludeTimestamps: (value: boolean) => void;
    selectedLanguage: { value: string, label: string };
    setSelectedLanguage: (option: { value: string, label: string }) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
                                                         transcripts,
                                                         includeTimestamps,
                                                         setIncludeTimestamps,
                                                         selectedLanguage,
                                                         setSelectedLanguage,
                                                     }) => {
    const transcriptTextWithTimestamps = transcripts.map(entry => `${formatTime(entry.start)} ${entry.text}`).join('\n');
    const transcriptTextWithoutTimestamps = transcripts.map(entry => entry.text).join('\n');

    return (
        <div className="flex items-center gap-4">
            <TimestampToggle
                includeTimestamps={includeTimestamps}
                setIncludeTimestamps={setIncludeTimestamps}
            />
            <CopyButton
                textToCopy={includeTimestamps ? transcriptTextWithTimestamps : transcriptTextWithoutTimestamps}
            />
            <DownloadButton
                transcriptText={includeTimestamps ? transcriptTextWithTimestamps : transcriptTextWithoutTimestamps}
            />
            <PrintButton
                transcriptText={includeTimestamps ? transcriptTextWithTimestamps : transcriptTextWithoutTimestamps}
            />
            <ShareButton
                textToShare={includeTimestamps ? transcriptTextWithTimestamps : transcriptTextWithoutTimestamps}
            />
            <div className="ml-auto">
                <TranslateSelectBox/>
            </div>
        </div>
    );
};

export default ActionButtons;
