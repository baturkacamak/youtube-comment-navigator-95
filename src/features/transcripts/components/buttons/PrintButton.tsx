import React from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import logger from '../../../shared/utils/logger';

interface PrintButtonProps {
  transcriptText: string;
}

const PrintButton: React.FC<PrintButtonProps> = ({ transcriptText }) => {
  const { t } = useTranslation();

  const handlePrintTranscript = () => {
    const printWindow = window.open('', '', 'height=400,width=600');
    if (printWindow) {
      printWindow.document.write('<pre>' + transcriptText + '</pre>');
      printWindow.document.close();
      printWindow.print();
    } else {
      logger.error('Failed to open print window');
    }
  };

  return (
    <button
      onClick={handlePrintTranscript}
      className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300"
    >
      <PrinterIcon className="w-4 h-4 mr-1" aria-hidden="true" />
      <span className="text-sm">{t('Print')}</span>
    </button>
  );
};

export default PrintButton;
