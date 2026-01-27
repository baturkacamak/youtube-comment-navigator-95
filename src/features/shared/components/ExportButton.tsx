import React from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { Comment } from '../../../types/commentTypes';
import DropdownMenu from './DropdownMenu';
import { formatFileName, exportJSON, exportCSV } from '../utils/exportUtils';
import { getVideoTitle } from '../utils/getVideoTitle';
import logger from '../utils/logger';

interface ExportButtonProps {
  comments: Comment[] | undefined | any[];
  allComments?: Comment[] | undefined | any[];
}

const ExportButton: React.FC<ExportButtonProps> = ({ comments, allComments }) => {
  const { t } = useTranslation();

  const handleExport = async (format: 'csv' | 'json', useAll: boolean = false) => {
    const targetComments = useAll ? allComments : comments;

    if (!targetComments || targetComments.length === 0) {
      logger.error('No comments to export');
      return;
    }

    const videoTitle = await getVideoTitle();
    let fileName = formatFileName(format, videoTitle);

    // Add suffix to filename
    const suffix = useAll ? '-all' : allComments ? '-visible' : '';
    fileName = fileName.replace(`.${format}`, `${suffix}.${format}`);

    if (format === 'csv') {
      await exportCSV(targetComments, fileName);
    } else {
      await exportJSON(targetComments, fileName);
    }
  };

  return (
    <DropdownMenu
      buttonContent={
        <>
          <DocumentTextIcon className="w-5 h-5 mr-1" aria-hidden="true" />
          <span className="text-sm">{t('Export Comments')}</span>
        </>
      }
    >
      <button
        onClick={() => handleExport('json', false)}
        className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
      >
        <span className="text-sm">
          {allComments ? t('Export Visible (JSON)') : t('Export as JSON')}
        </span>
      </button>
      <button
        onClick={() => handleExport('csv', false)}
        className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
      >
        <span className="text-sm">
          {allComments ? t('Export Visible (CSV)') : t('Export as CSV')}
        </span>
      </button>

      {allComments && (
        <>
          <hr className="my-1 border-gray-200 dark:border-gray-600" />
          <button
            onClick={() => handleExport('json', true)}
            className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
          >
            <span className="text-sm">{t('Export All (JSON)')}</span>
          </button>
          <button
            onClick={() => handleExport('csv', true)}
            className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
          >
            <span className="text-sm">{t('Export All (CSV)')}</span>
          </button>
        </>
      )}
    </DropdownMenu>
  );
};

export default ExportButton;
