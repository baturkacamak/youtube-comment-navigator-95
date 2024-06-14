type AnyObject = { [key: string]: any };
type WildCardSearchPath = string;

/**
 * Recursively searches an object or array based on a wildcard path to find specific values.
 *
 * @param path - A string representing the path to search for. '**' acts as a wildcard.
 * @param obj - The object or array to search within.
 * @returns An array of values found at the specified path.
 */
export const wildCardSearch = (path: WildCardSearchPath, obj: AnyObject | any[]): any[] => {
    // Split the path string into an array of path elements
    const pathArray = path.split('.');

    const search = (parsedPath: string[], obj: AnyObject | any[], results: any[]): void => {
        const [first, ...rest] = parsedPath;

        // Base case: If no path elements are left, add the current object to results
        if (!first) {
            results.push(obj);
            return;
        }

        // If the current path element is '**', perform a deep search
        if (first === '**') {
            // Perform a deep search in both arrays and objects
            if (Array.isArray(obj)) {
                for (const item of obj) {
                    // Search with the same path and the remaining path
                    search(parsedPath, item, results);
                    search(rest, item, results);
                }
            } else if (typeof obj === 'object' && obj !== null) {
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        // Search with the same path and the remaining path
                        search(parsedPath, (obj as AnyObject)[key], results);
                        search(rest, (obj as AnyObject)[key], results);
                    }
                }
            }
            return;
        }

        // If the current object is an array, search each item for the next path element
        if (Array.isArray(obj)) {
            for (const item of obj) {
                search(rest, item, results);
            }
            return;
        }

        // If the current object is an object, continue searching for the next path element
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
