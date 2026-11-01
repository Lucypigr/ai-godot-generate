// Shared helpers for the Tidewatch showcase. Recipes written by these helpers are ordinary
// Pixelbolt version-1 JSON and remain the authoritative, hand-editable source.
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('..', import.meta.url));

// Colour recipes and pose/autotile sources link art/palette.json instead of copying it; `extra` adds local
// entries. The Pixelbolt CLI, MCP server and these tools resolve the link (resolveReferences).
export const linkedPalette = (extra = {}) => ({ $ref: '../palette.json', ...extra });
export function writeJSON(file, value, { force = false } = {}) {
  const target = path.resolve(root, file);
  if (existsSync(target) && !force) throw new Error(`Refusing to overwrite ${target}; pass force`);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(value, null, 2) + '\n');
  return target;
}
