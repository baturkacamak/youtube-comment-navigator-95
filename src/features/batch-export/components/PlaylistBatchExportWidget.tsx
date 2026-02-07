import React from 'react';
import { useTranslation } from 'react-i18next';
import BatchExportAccordion from './BatchExportAccordion';

const PlaylistBatchExportWidget: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
          {t('Batch Export')}
        </p>
        <BatchExportAccordion />
      </div>
    </div>
  );
};

export default PlaylistBatchExportWidget;
