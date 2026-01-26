// src/features/shared/hooks/useGlobalEventListener.ts

import { useEffect, useRef } from 'react';

/**
 * Hook for adding global event listeners with proper cleanup.
 *
 * PERF FIX: Uses a ref to store the handler so that the event listener
 * itself is stable and doesn't need to be re-added when the handler changes.
 * This prevents memory leaks from accumulated listeners.
 */
const useGlobalEventListener = <T extends Event>(eventName: string, handler: (event: T) => void) => {
    // Store handler in ref so we don't re-add listener when handler changes
    const handlerRef = useRef(handler);

    // Update the ref when handler changes
    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        // Use a stable event handler that calls the current handler via ref
        const eventHandler = (event: Event) => {
            handlerRef.current(event as T);
        };

        window.addEventListener(eventName, eventHandler);

        return () => {
            window.removeEventListener(eventName, eventHandler);
        };
    }, [eventName]); // Only re-run when eventName changes, not handler
};

export default useGlobalEventListener;
