import { useEffect, useState, useRef } from 'react';

const useDebounce = <T>(value: T, delay: number, maxDelay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const lastCallTime = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const now = Date.now();

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for the debounce delay
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
      lastCallTime.current = now;
    }, delay);

    // Clear max timeout if it exists
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
    }

    // Set new timeout for the max delay
    const timeSinceLastCall = now - lastCallTime.current;
    if (timeSinceLastCall >= maxDelay) {
      setDebouncedValue(value);
      lastCallTime.current = now;
    } else {
      maxTimeoutRef.current = setTimeout(() => {
        setDebouncedValue(value);
        lastCallTime.current = Date.now();
      }, maxDelay - timeSinceLastCall);
    }

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, [value, delay, maxDelay]);

  return debouncedValue;
};

export default useDebounce;
