import React from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { Comment } from '../../../types/commentTypes';
import DropdownMenu from './DropdownMenu';
import { formatFileName, exportJSON, exportCSV } from '../utils/exportUtils';
import {getVideoTitle} from "../utils/getVideoTitle";

interface ExportButtonProps {
    comments: Comment[] | undefined;
}

const ExportButton: React.FC<ExportButtonProps> = ({ comments }) => {
    const { t } = useTranslation();

    const handleExportJSON = async () => {
        if (!comments || comments.length === 0) {
            console.error('No comments to export');
            return;
        }
        const fileName = formatFileName('json', getVideoTitle());
        exportJSON(comments, fileName);
    };

    const handleExportCSV = async () => {
        if (!comments || comments.length === 0) {
            console.error('No comments to export');
            return;
        }
        const fileName = formatFileName('csv', getVideoTitle());
        exportCSV(comments, fileName);
    };

    return (
        <DropdownMenu buttonContent={<><DocumentTextIcon className="w-5 h-5 mr-1" aria-hidden="true" /><span className="text-sm">{t('Export Comments')}</span></>}>
            <button
                onClick={handleExportJSON}
                className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
            >
                <span className="text-sm">{t('Export as JSON')}</span>
            </button>
            <button
                onClick={handleExportCSV}
                className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
            >
                <span className="text-sm">{t('Export as CSV')}</span>
            </button>
        </DropdownMenu>
    );
};

export default ExportButton;
