import React, { useState } from 'react';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { getVideoTitle } from '../../../shared/utils/getVideoTitle';
import { extractYouTubeVideoIdFromUrl } from '../../../shared/utils/extractYouTubeVideoIdFromUrl';
import { useTranslation } from 'react-i18next';
import DropdownMenu from '../../../shared/components/DropdownMenu';
import logger from '../../../shared/utils/logger';

interface DownloadButtonProps {
  transcriptText: string;
  fileNamePrefix?: string;
  allContent?: string | (() => Promise<string>);
}

const DownloadButton: React.FC<DownloadButtonProps> = ({
  transcriptText,
  fileNamePrefix = 'transcript',
  allContent,
}) => {
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);

  const getFormattedFileName = (suffix: string = '') => {
    const baseName = fileNamePrefix;
    const videoTitle = getVideoTitle();
    const videoId = extractYouTubeVideoIdFromUrl();
    const date = new Date().toISOString().split('T')[0];
    const name = videoTitle || videoId || date;
    return `${baseName}-${name}${suffix}.txt`;
  };

  const downloadText = (text: string, suffix: string = '') => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFormattedFileName(suffix);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadVisible = () => {
    downloadText(transcriptText);
  };

  const handleDownloadAll = async () => {
    if (!allContent) return;

    try {
      setIsDownloading(true);
      let content = '';
      if (typeof allContent === 'function') {
        content = await allContent();
      } else {
        content = allContent;
      }
      downloadText(content, '-all');
    } catch (error) {
      logger.error('Failed to download all content:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const buttonContent = (
    <>
      <DocumentArrowDownIcon className="w-4 h-4 mr-1" aria-hidden="true" />
      <span className="text-sm">{t('Download')}</span>
    </>
  );

  if (allContent) {
    return (
      <DropdownMenu buttonContent={buttonContent}>
        <button
          onClick={handleDownloadVisible}
          className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
        >
          <span className="text-sm">{t('Download Visible')}</span>
        </button>
        <button
          onClick={handleDownloadAll}
          disabled={isDownloading}
          className={`flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300 ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="text-sm">{isDownloading ? t('Downloading...') : t('Download All')}</span>
        </button>
      </DropdownMenu>
    );
  }

  return (
    <button
      onClick={handleDownloadVisible}
      className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300"
    >
      {buttonContent}
    </button>
  );
};

export default DownloadButton;
