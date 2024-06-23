// src/features/transcripts/components/buttons/ShareButton.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ShareIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { AiOutlineWhatsApp } from 'react-icons/ai';

interface ShareButtonProps {
    textToShare: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ textToShare }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
                    title: 'Transcript',
                    text,
                });
            } catch (error) {
                console.error('Error sharing', error);
            }
        } else {
            // Fallback for browsers that do not support the Web Share API
            try {
                await navigator.clipboard.writeText(text);
                alert('Transcript text copied to clipboard. You can share it manually.');
            } catch (error) {
                console.error('Could not copy text', error);
            }
        }
    };

    const handleEmailShare = () => {
        const text = getSelectedText();
        window.location.href = `mailto:?subject=Transcript&body=${encodeURIComponent(text)}`;
    };

    const handleWhatsAppShare = () => {
        const text = getSelectedText();
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuRef]);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300"
            >
                <ShareIcon className="w-5 h-5 mr-1" aria-hidden="true" />
                <span className="text-sm">Share</span>
            </button>
            {isOpen && (
                <div
                    className={`absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-10 shadow transition-transform duration-300 ease-in-out ${
                        isOpen ? 'transform scale-100 opacity-100' : 'transform scale-95 opacity-0'
                    }`}
                >
                    <button
                        onClick={handleEmailShare}
                        className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
                    >
                        <EnvelopeIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                        <span className="text-sm">Email</span>
                    </button>
                    <button
                        onClick={handleWhatsAppShare}
                        className="flex items-center w-full px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
                    >
                        <AiOutlineWhatsApp className="w-5 h-5 mr-2" aria-hidden="true" />
                        <span className="text-sm">WhatsApp</span>
                    </button>
                    {/* Add more share options here */}
                </div>
            )}
        </div>
    );
};

export default ShareButton;
