// src/features/shared/hooks/useGlobalEventListener.ts

import { useEffect } from 'react';

const useGlobalEventListener = <T extends Event>(eventName: string, handler: (event: T) => void) => {
    useEffect(() => {
        const eventHandler = (event: Event) => {
            handler(event as T);
        };

        window.addEventListener(eventName, eventHandler);

        return () => {
            window.removeEventListener(eventName, eventHandler);
        };
    }, [eventName, handler]);
};

export default useGlobalEventListener;
