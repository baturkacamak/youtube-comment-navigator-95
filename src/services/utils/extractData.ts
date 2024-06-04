import {ExtractOptions} from "../../types/utilityTypes";

type ExtractPaths = string[][];

export const extractData = (data: any, paths: ExtractPaths, options: ExtractOptions = {}): any[] => {
    const { defaultValue } = options;
    const results: any[] = [];

    paths.forEach((path) => {
        let current = data;
        for (const key of path) {
            if (current && key in current) {
                current = current[key];
            } else {
                current = defaultValue;
                break;
            }
        }
        results.push(current);
    });

    return results;
};

export const deepExtractData = (data: any, path: string, options: ExtractOptions = {}): any => {
    const { defaultValue } = options;

    const traverse = (obj: any, keys: string[]): any => {
        if (keys.length === 0) {
            return obj;
        }

        const key = keys[0];

        if (key === '**') {
            if (typeof obj !== 'object' || obj === null) {
                return defaultValue;
            }
            // Match any level of nesting
            const remainingKeys = keys.slice(1);
            for (const k in obj) {
                const result = traverse(obj[k], remainingKeys);
                if (result !== defaultValue) {
                    return result;
                }
            }
            return defaultValue;
        }

        if (obj && typeof obj === 'object' && key in obj) {
            return traverse(obj[key], keys.slice(1));
        } else {
            return defaultValue;
        }
    };

    const keys = path.split('.');
    return traverse(data, keys);
};