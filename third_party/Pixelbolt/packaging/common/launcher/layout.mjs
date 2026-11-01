// Where things are. In the portable build this folder sits beside app/ and runtime/; in a checkout it is
// packaging/common/launcher and the package is the repository root, run by whichever Node started the script.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const portable = existsSync(path.join(here, '..', 'app', 'package.json'));
export const folder = path.resolve(here, portable ? '..' : '../../..');
export const app = portable ? path.join(folder, 'app') : folder;
export const node = portable ? path.join(folder, 'runtime', process.platform === 'win32' ? 'node.exe' : 'node') : process.execPath;
export const version = JSON.parse(readFileSync(path.join(app, 'package.json'), 'utf8')).version;
