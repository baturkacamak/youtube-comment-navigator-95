import React from 'react';
import CopyButton from './buttons/CopyButton';
import PrintButton from './buttons/PrintButton';
import ShareButton from '../../shared/components/ShareButton';
import TimestampToggle from './toggles/TimestampToggle';
import TranslateSelectBox from './toggles/TranslateSelectBox';
import { DownloadAccordion } from '../../shared/components/DownloadAccordion';
import { formatTime } from '../utils/formatTime';

interface ActionButtonsProps {
  transcripts: any[];
  includeTimestamps: boolean;
  setIncludeTimestamps: (value: boolean) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  transcripts,
  includeTimestamps,
  setIncludeTimestamps,
}) => {
  const transcriptTextWithTimestamps = transcripts
    .map((entry) => `${formatTime(entry.start)} ${entry.text}`)
    .join('\n');
  const transcriptTextWithoutTimestamps = transcripts.map((entry) => entry.text).join('\n');

  return (
    <div className="flex items-center gap-4">
      <TimestampToggle
        includeTimestamps={includeTimestamps}
        setIncludeTimestamps={setIncludeTimestamps}
      />
      <CopyButton
        textToCopy={
          includeTimestamps ? transcriptTextWithTimestamps : transcriptTextWithoutTimestamps
        }
      />
      <DownloadAccordion
        contentType="transcript"
        visibleData={transcripts}
        formatTextContent={() =>
          includeTimestamps ? transcriptTextWithTimestamps : transcriptTextWithoutTimestamps
        }
      />
      <PrintButton
        transcriptText={
          includeTimestamps ? transcriptTextWithTimestamps : transcriptTextWithoutTimestamps
        }
      />
      <ShareButton
        textToShare={
          includeTimestamps ? transcriptTextWithTimestamps : transcriptTextWithoutTimestamps
        }
      />
      <div className="ml-auto">
        <TranslateSelectBox />
      </div>
    </div>
  );
};

export default ActionButtons;
