// src/utils/debounce.ts
export const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
    let timeout: ReturnType<typeof setTimeout>;

    return (...args: Parameters<T>): void => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 * Unlike debounce, throttle guarantees execution at regular intervals during continuous calls.
 *
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to throttle invocations to
 * @param options - Options object
 * @param options.leading - Invoke on the leading edge (default: true)
 * @param options.trailing - Invoke on the trailing edge (default: true)
 * @returns A throttled function with a cancel method
 */
export const throttle = <T extends (...args: any[]) => void>(
    func: T,
    wait: number,
    options: { leading?: boolean; trailing?: boolean } = {}
): ((...args: Parameters<T>) => void) & { cancel: () => void } => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let lastArgs: Parameters<T> | null = null;
    let lastCallTime: number | null = null;
    const { leading = true, trailing = true } = options;

    const invokeFunc = (args: Parameters<T>) => {
        lastCallTime = Date.now();
        func(...args);
    };

    const throttled = (...args: Parameters<T>): void => {
        const now = Date.now();
        const timeSinceLastCall = lastCallTime ? now - lastCallTime : wait;

        // Leading edge
        if (timeSinceLastCall >= wait && leading) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            invokeFunc(args);
            return;
        }

        // Store args for trailing edge
        lastArgs = args;

        // Set up trailing edge call
        if (!timeout && trailing) {
            const remaining = wait - timeSinceLastCall;
            timeout = setTimeout(() => {
                timeout = null;
                if (lastArgs && trailing) {
                    invokeFunc(lastArgs);
                    lastArgs = null;
                }
            }, remaining > 0 ? remaining : 0);
        }
    };

    throttled.cancel = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        lastArgs = null;
        lastCallTime = null;
    };

    return throttled;
};