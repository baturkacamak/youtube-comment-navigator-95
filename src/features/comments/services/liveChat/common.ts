export function getObj(obj: any, path: string | [], def: any): any {
  function stringToPath(p: string | []): [] {
    if (typeof p !== 'string') return p as [];

    const result: any = [];

    p.split('.').forEach(function (v) {
      v.split(/\[([^}]+)\]/g).forEach(function (key) {
        if (key.length > 0) {
          result.push(key);
        }
      });
    });

    return result;
  }

  try {
    const paths = stringToPath(path);

    let resultObj = obj;

    for (let i = 0; i < paths.length; i++) {
      if (!resultObj[paths[i]]) return def;

      resultObj = resultObj[paths[i]];
    }

    return resultObj;
  } catch (err) {
    console.error(err);
    return def;
  }
}

export function wrapTryCatch<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

export function deepFindObjKey(obj: object, key: string): Array<any> {
  const matches: any[] = [];

  try {
    const iterate = function iterate(object: any, path?: unknown): void {
      let match: any, item;

      const newPath = function (add: unknown): string | unknown {
        return path ? (path as string) + '.' + add : add;
      };

      if (Object.prototype.hasOwnProperty.call(object, key)) {
        match = { /* no-op */ };

        match[newPath(key) as string] = object[key];

        matches.push(match);
      }

      for (item in object) {
        if (
          Object.prototype.hasOwnProperty.call(object, item) &&
          typeof (object as any)[item] === 'object'
        ) {
          iterate(object[item], newPath(item));
        }
      }
    };

    iterate(obj);
  } catch (err) {
    console.error(err);
    return [];
  }

  return matches;
}
