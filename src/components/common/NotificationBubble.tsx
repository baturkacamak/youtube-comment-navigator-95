// src/components/common/NotificationBubble.tsx
import React, { useEffect, useState } from 'react';

interface NotificationBubbleProps {
    message: string;
    duration?: number;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const NotificationBubble: React.FC<NotificationBubbleProps> = ({ message, duration = 2000, position = 'bottom-right' }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const showTimer = setTimeout(() => {
            setIsVisible(true);
        }, 100); // Initial delay for the show transition

        const hideTimer = setTimeout(() => {
            setIsVisible(false);
        }, duration);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(hideTimer);
        };
    }, [duration]);

    const positionClasses = {
        'top-left': 'top-4 left-4',
        'top-right': 'top-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-right': 'bottom-4 right-4',
    };

    const initialTranslateClasses = {
        'top-left': '-translate-x-full -translate-y-full',
        'top-right': 'translate-x-full -translate-y-full',
        'bottom-left': '-translate-x-full translate-y-full',
        'bottom-right': 'translate-x-full translate-y-full',
    };

    const visibleClasses = 'translate-x-0 translate-y-0 opacity-100';
    const hiddenClasses = 'opacity-0';

    return (
        <div
            className={`fixed ${positionClasses[position]} z-50 bg-green-500 text-white p-2 rounded-lg shadow-md transition duration-500 transform ${
                isVisible ? visibleClasses : `${initialTranslateClasses[position]} ${hiddenClasses}`
            }`}
        >
            {message}
        </div>
    );
};

export default NotificationBubble;
