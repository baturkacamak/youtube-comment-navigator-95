type AnyObject = { [key: string]: any };
type WildCardSearchPath = string;

/**
 * Recursively searches an object or array based on a wildcard path to find specific values.
 *
 * @param path - A string representing the path to search for. '**' acts as a wildcard.
 * @param obj - The object or array to search within.
 * @param cachedPath - Optional cached path to use instead of performing a wildcard search.
 * @returns An array of values found at the specified path.
 */
export const wildCardSearch = (path: WildCardSearchPath, obj: AnyObject | any[], cachedPath?: string): any[] => {
    const pathArray = cachedPath ? cachedPath.split('.') : path.split('.');

    const search = (parsedPath: string[], obj: AnyObject | any[], results: any[]): void => {
        const [first, ...rest] = parsedPath;

        if (!first) {
            results.push(obj);
            return;
        }

        if (first === '**') {
            if (Array.isArray(obj)) {
                for (const item of obj) {
                    search(parsedPath, item, results);
                    search(rest, item, results);
                }
            } else if (typeof obj === 'object' && obj !== null) {
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        search(parsedPath, (obj as AnyObject)[key], results);
                        search(rest, (obj as AnyObject)[key], results);
                    }
                }
            }
            return;
        }

        if (Array.isArray(obj)) {
            for (const item of obj) {
                search(rest, item, results);
            }
            return;
        }

        if (typeof obj === 'object' && obj !== null) {
            if (first in obj) {
                search(rest, (obj as AnyObject)[first], results);
            }
        }
    }

    const results: any[] = [];
    search(pathArray, obj, results);
    return results;
}
