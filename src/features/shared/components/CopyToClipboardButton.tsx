// src/features/shared/components/CopyToClipboardButton.tsx
import React, { useState } from 'react';
import { ClipboardIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface CopyToClipboardButtonProps {
    textToCopy: string;
    title?: string; // Add title prop
}

const CopyToClipboardButton: React.FC<CopyToClipboardButtonProps> = ({ textToCopy, title = 'Copy' }) => {
    const { t } = useTranslation();
    const [copySuccess, setCopySuccess] = useState(false);

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
            })
            .catch(err => console.error('Could not copy text: ', err));
    };

    return (
        <button
            onClick={handleCopyToClipboard}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300"
            title={t(title)}
            aria-label={t(title)}
        >
            {copySuccess ? (
                <>
                    <CheckCircleIcon className="w-4 h-4 mr-1 text-green-500 animate-pulse" aria-hidden="true" />
                    <span className="text-sm">{t('Copied')}</span>
                </>
            ) : (
                <>
                    <ClipboardIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                    <span className="text-sm">{t(title)}</span>
                </>
            )}
        </button>
    );
};

export default CopyToClipboardButton;
