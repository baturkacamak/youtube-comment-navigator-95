import React from 'react';
import { ShareIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { AiOutlineWhatsApp, AiOutlineX, AiOutlineFacebook, AiOutlineLinkedin, AiOutlineReddit } from 'react-icons/ai';
import { FaTelegramPlane } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import DropdownMenu from './DropdownMenu'; // Adjust the import path as necessary

interface ShareButtonProps {
    textToShare: string;
    subject?: string;
    url?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ textToShare, subject = 'Check this out', url }) => {
    const { t } = useTranslation();

    const getSelectedText = () => {
        if (window.getSelection) {
            const selectedText = window.getSelection()?.toString();
            return selectedText ? selectedText : textToShare;
        }
        return textToShare;
    };

    const handleShare = async () => {
        const text = getSelectedText();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: subject,
                    text,
                    url,
                });
            } catch (error) {
                console.error('Error sharing', error);
            }
        } else {
            try {
                await navigator.clipboard.writeText(url ? `${text} ${url}` : text);
                alert('Text copied to clipboard. You can share it manually.');
            } catch (error) {
                console.error('Could not copy text', error);
            }
        }
    };

    const handleEmailShare = () => {
        const text = getSelectedText();
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text + (url ? `\n\n${url}` : ''))}`;
    };

    const handleWhatsAppShare = () => {
        const text = getSelectedText();
        window.open(`https://wa.me/?text=${encodeURIComponent(text + (url ? `\n\n${url}` : ''))}`, '_blank');
    };

    const handleTwitterShare = () => {
        const text = getSelectedText();
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text + (url ? `\n\n${url}` : ''))}`, '_blank');
    };

    const handleFacebookShare = () => {
        const text = getSelectedText();
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url || text)}`, '_blank');
    };

    const handleLinkedInShare = () => {
        const text = getSelectedText();
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url || text)}`, '_blank');
    };

    const handleRedditShare = () => {
        const text = getSelectedText();
        window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(url || text)}&title=${encodeURIComponent(subject)}`, '_blank');
    };

    const handlePinterestShare = () => {
        const text = getSelectedText();
        window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url || text)}&description=${encodeURIComponent(text)}`, '_blank');
    };

    const handleTelegramShare = () => {
        const text = getSelectedText();
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url || text)}&text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <DropdownMenu buttonContent={<><ShareIcon className="w-5 h-5 mr-1" aria-hidden="true" /><span className="text-sm">{t('Share')}</span></>}>
            <button
                onClick={handleEmailShare}
                className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
            >
                <EnvelopeIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                <span className="text-sm">{t('E-mail')}</span>
            </button>
            <button
                onClick={handleWhatsAppShare}
                className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
            >
                <AiOutlineWhatsApp className="w-5 h-5 mr-2" aria-hidden="true" />
                <span className="text-sm">Whatsapp</span>
            </button>
            <button
                onClick={handleTwitterShare}
                className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
            >
                <AiOutlineX className="w-5 h-5 mr-2" aria-hidden="true" />
                <span className="text-sm">X</span>
            </button>
            <button
                onClick={handleFacebookShare}
                className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
            >
                <AiOutlineFacebook className="w-5 h-5 mr-2" aria-hidden="true" />
                <span className="text-sm">Facebook</span>
            </button>
            <button
                onClick={handleLinkedInShare}
                className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
            >
                <AiOutlineLinkedin className="w-5 h-5 mr-2" aria-hidden="true" />
                <span className="text-sm">LinkedIn</span>
            </button>
            <button
                onClick={handleRedditShare}
                className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
            >
                <AiOutlineReddit className="w-5 h-5 mr-2" aria-hidden="true" />
                <span className="text-sm">Reddit</span>
            </button>
            <button
                onClick={handleTelegramShare}
                className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
            >
                <FaTelegramPlane className="w-5 h-5 mr-2" aria-hidden="true" />
                <span className="text-sm">Telegram</span>
            </button>
        </DropdownMenu>
    );
};

export default ShareButton;
