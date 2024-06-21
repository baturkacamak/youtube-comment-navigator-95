// src/utils/debounce.ts
export const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
    let timeout: ReturnType<typeof setTimeout>;

    return (...args: Parameters<T>): void => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};