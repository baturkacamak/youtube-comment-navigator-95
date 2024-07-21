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

interface ShareOption {
    name: string;
    icon: React.ReactNode;
    handler: () => void;
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

    const shareHandler = (shareType: 'email' | 'whatsapp' | 'twitter' | 'facebook' | 'linkedin' | 'reddit' | 'telegram') => {
        const text = getSelectedText();
        const encodedText = encodeURIComponent(text + (url ? `\n\n${url}` : ''));
        const encodedUrl = encodeURIComponent(url || text);
        const encodedSubject = encodeURIComponent(subject);

        const shareUrls = {
            email: `mailto:?subject=${encodedSubject}&body=${encodedText}`,
            whatsapp: `https://wa.me/?text=${encodedText}`,
            twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedSubject}`,
            telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        };

        if (shareType in shareUrls) {
            window.open(shareUrls[shareType], '_blank');
        } else if (navigator.share) {
            navigator.share({ title: subject, text, url }).catch(error => console.error('Error sharing', error));
        } else {
            navigator.clipboard.writeText(url ? `${text} ${url}` : text).then(() => {
                alert('Text copied to clipboard. You can share it manually.');
            }).catch(error => console.error('Could not copy text', error));
        }
    };

    const shareOptions: ShareOption[] = [
        { name: t('E-mail'), icon: <EnvelopeIcon className="w-5 h-5 mr-2" aria-hidden="true" />, handler: () => shareHandler('email') },
        { name: 'Whatsapp', icon: <AiOutlineWhatsApp className="w-5 h-5 mr-2" aria-hidden="true" />, handler: () => shareHandler('whatsapp') },
        { name: 'X', icon: <AiOutlineX className="w-5 h-5 mr-2" aria-hidden="true" />, handler: () => shareHandler('twitter') },
        { name: 'Facebook', icon: <AiOutlineFacebook className="w-5 h-5 mr-2" aria-hidden="true" />, handler: () => shareHandler('facebook') },
        { name: 'LinkedIn', icon: <AiOutlineLinkedin className="w-5 h-5 mr-2" aria-hidden="true" />, handler: () => shareHandler('linkedin') },
        { name: 'Reddit', icon: <AiOutlineReddit className="w-5 h-5 mr-2" aria-hidden="true" />, handler: () => shareHandler('reddit') },
        { name: 'Telegram', icon: <FaTelegramPlane className="w-5 h-5 mr-2" aria-hidden="true" />, handler: () => shareHandler('telegram') },
    ];

    return (
        <DropdownMenu buttonContent={<><ShareIcon className="w-5 h-5 mr-1" aria-hidden="true" /><span className="text-sm">{t('Share')}</span></>}>
            {shareOptions.map(option => (
                <button key={option.name} onClick={option.handler} className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300">
                    {option.icon}
                    <span className="text-sm">{option.name}</span>
                </button>
            ))}
        </DropdownMenu>
    );
};

export default ShareButton;
