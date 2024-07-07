import { useCallback } from 'react';

const useDefaultFilters = () => {
    return useCallback(() => ({
        keyword: '',
        verified: false,
        hasLinks: false,
        sortBy: '',
        sortOrder: '',
        likesThreshold: {
            min: 0,
            max: Infinity,
        },
        repliesLimit: {
            min: 0,
            max: Infinity,
        },
        wordCount: {
            min: 0,
            max: Infinity,
        },
        dateTimeRange: {
            start: '',
            end: '',
        },
    }), []);
};

export default useDefaultFilters;
