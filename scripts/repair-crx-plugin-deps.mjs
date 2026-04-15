import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const crxNodeModules = path.join(root, 'node_modules', '@crxjs', 'vite-plugin', 'node_modules');
const packageNames = ['convert-source-map', 'fs-extra'];

const isEmptyDir = (dirPath) => {
  try {
    return fs.statSync(dirPath).isDirectory() && fs.readdirSync(dirPath).length === 0;
  } catch {
    return false;
  }
};

if (fs.existsSync(crxNodeModules)) {
  for (const packageName of packageNames) {
    const nestedPath = path.join(crxNodeModules, packageName);
    if (isEmptyDir(nestedPath)) {
      fs.rmSync(nestedPath, { recursive: true, force: true });
    }
  }
}
