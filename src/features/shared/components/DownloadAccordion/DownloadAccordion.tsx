import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentArrowDownIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { DownloadAccordionProps, DownloadFormat, DownloadScope, FORMAT_CONFIG } from './types';
import { generateFileName, executeDownload } from './downloadUtils';
import logger from '../../utils/logger';
import Collapsible from '../Collapsible';
import { useToast } from '../../contexts/ToastContext';

const DownloadAccordion: React.FC<DownloadAccordionProps> = ({
  contentType,
  visibleData,
  allData,
  fileNamePrefix,
  formatTextContent,
}) => {
  const { t } = useTranslation() as { t: (key: string) => string };
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const formatConfig = FORMAT_CONFIG[contentType];
  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat>(() => {
    const saved = localStorage.getItem('download_format_preference');
    return (saved as DownloadFormat) && formatConfig.available.includes(saved as DownloadFormat)
      ? (saved as DownloadFormat)
      : formatConfig.default;
  });
  const [selectedScope, setSelectedScope] = useState<DownloadScope>(() => {
    return (localStorage.getItem('download_scope_preference') as DownloadScope) || 'visible';
  });

  // Save preferences when they change
  useEffect(() => {
    localStorage.setItem('download_format_preference', selectedFormat);
  }, [selectedFormat]);

  useEffect(() => {
    localStorage.setItem('download_scope_preference', selectedScope);
  }, [selectedScope]);

  // Reset format when content type changes if current format is not available
  useEffect(() => {
    if (!formatConfig.available.includes(selectedFormat)) {
      setSelectedFormat(formatConfig.default);
    }
  }, [contentType, formatConfig, selectedFormat]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      let dataToDownload: unknown;

      if (selectedScope === 'all' && allData) {
        if (typeof allData === 'function') {
          dataToDownload = await allData();
        } else {
          dataToDownload = allData;
        }
      } else {
        dataToDownload = visibleData;
      }

      // Check if data is empty
      if (!dataToDownload) {
        showToast({
          type: 'error',
          message: 'No data to export',
          duration: 4000,
        });
        return;
      }

      if (Array.isArray(dataToDownload) && dataToDownload.length === 0) {
        showToast({
          type: 'error',
          message: 'No data to export',
          duration: 4000,
        });
        return;
      }

      const fileName = generateFileName(contentType, selectedFormat, selectedScope, fileNamePrefix);
      executeDownload(dataToDownload, selectedFormat, fileName, formatTextContent);

      // Show success message
      const itemCount = Array.isArray(dataToDownload) ? dataToDownload.length : 0;
      const formatLabel = selectedFormat.toUpperCase();

      let successMessage = '';
      if (contentType === 'transcript') {
        successMessage = 'Transcript downloaded';
      } else if (itemCount > 0) {
        successMessage = `Exported ${itemCount} ${contentType} to ${formatLabel}`;
      } else {
        successMessage = `Exported to ${formatLabel}`;
      }

      showToast({
        type: 'success',
        message: successMessage,
        duration: 3000,
      });

      // Auto-close panel after download
      setIsExpanded(false);
    } catch (error) {
      logger.error('Download failed:', error);

      const errorMessage =
        error instanceof Error && error.message ? error.message : 'Export failed. Try again.';

      showToast({
        type: 'error',
        message: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const formatLabels: Record<DownloadFormat, string> = {
    txt: 'TXT',
    json: 'JSON',
    csv: 'CSV',
    srt: 'SRT',
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Accordion Header Button */}
      <button
        onClick={handleToggle}
        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300"
        aria-expanded={isExpanded}
        aria-controls="download-panel"
      >
        <DocumentArrowDownIcon className="w-4 h-4 mr-1" aria-hidden="true" />
        <span className="text-sm">{t('Download')}</span>
        <ChevronDownIcon
          className={`w-4 h-4 ml-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Accordion Panel */}
      <Collapsible
        id="download-panel"
        isOpen={isExpanded}
        className="absolute left-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        style={{
          visibility: isExpanded ? 'visible' : 'hidden',
          minWidth: '220px',
        }}
      >
        <div className="p-4">
          {/* Format Section */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('Format')}
            </label>
            <div className="flex flex-wrap gap-3">
              {formatConfig.available.map((format: DownloadFormat) => (
                <label key={format} className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="download-format"
                    value={format}
                    checked={selectedFormat === format}
                    onChange={() => setSelectedFormat(format)}
                    className="form-radio h-4 w-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {formatLabels[format]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Scope Section - only show if allData is available */}
          {allData !== undefined && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('Content')}
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="download-scope"
                    value="visible"
                    checked={selectedScope === 'visible'}
                    onChange={() => setSelectedScope('visible')}
                    className="form-radio h-4 w-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {t('Visible Only')}
                  </span>
                </label>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="download-scope"
                    value="all"
                    checked={selectedScope === 'all'}
                    onChange={() => setSelectedScope('all')}
                    className="form-radio h-4 w-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t('All')}</span>
                </label>
              </div>
            </div>
          )}

          {/* Divider */}
          <hr className="my-3 border-gray-200 dark:border-gray-600" />

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 ${
              isDownloading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <DocumentArrowDownIcon className="w-4 h-4 mr-2" aria-hidden="true" />
            <span className="text-sm font-medium">
              {isDownloading ? t('Downloading...') : t('Download Now')}
            </span>
          </button>
        </div>
      </Collapsible>
    </div>
  );
};

export default DownloadAccordion;
