type AnyObject = { [key: string]: any };
type WildCardSearchPath = string;

interface WildCardSearchResult {
  values: any[];
  paths: string[];
}

/**
 * Recursively searches an object or array based on a wildcard path to find specific values.
 *
 * @param path - A string representing the path to search for. '**' acts as a wildcard.
 * @param obj - The object or array to search within.
 * @param cachedPath - Optional cached path to use instead of performing a wildcard search.
 * @returns An object containing found values and their corresponding paths.
 */
export const wildCardSearch = (
  path: WildCardSearchPath,
  obj: AnyObject | any[],
  cachedPath?: string
): WildCardSearchResult => {
  const pathArray = cachedPath ? cachedPath.split('.') : path.split('.');

  const search = (
    parsedPath: string[],
    obj: AnyObject | any[],
    results: any[],
    currentPath: string[],
    paths: string[]
  ): void => {
    const [first, ...rest] = parsedPath;

    if (!first) {
      results.push(obj);
      paths.push(currentPath.join('.'));
      return;
    }

    if (first === '**') {
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          const item = obj[i];
          search(parsedPath, item, results, [...currentPath, String(i)], paths);
          search(rest, item, results, [...currentPath, String(i)], paths);
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            search(parsedPath, (obj as AnyObject)[key], results, [...currentPath, key], paths);
            search(rest, (obj as AnyObject)[key], results, [...currentPath, key], paths);
          }
        }
      }
      return;
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];
        search(rest, item, results, [...currentPath, String(i)], paths);
      }
      return;
    }

    if (typeof obj === 'object' && obj !== null) {
      if (first in obj) {
        search(rest, (obj as AnyObject)[first], results, [...currentPath, first], paths);
      }
    }
  };

  const results: any[] = [];
  const paths: string[] = [];
  search(pathArray, obj, results, [], paths);
  return { values: results, paths };
};
