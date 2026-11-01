// Double-click launcher: `pixelbolt preview --open` with a few words for someone who has never seen a console.
// A recipe, scene or source file named after the launcher (on Windows, dropped on "Pixelbolt Studio.cmd") opens
// in the studio.
//   --no-browser   start without opening a browser (used by automated checks)
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, version } from './layout.mjs';

const given = process.argv.slice(2), files = given.filter(argument => argument !== '--no-browser');
console.log(`Pixelbolt Studio ${version}

Close this window or press Ctrl+C to stop it. The studio runs on this computer only. Use "Save JSON" in the
studio to keep a recipe; unsaved edits are kept as a draft in your browser and offered back next time.
`);
// Ctrl+C is an ordinary way to stop, not an error for the window to report.
process.on('SIGINT', () => process.exit(0));
process.argv = [process.argv[0], path.join(app, 'bin', 'pixelbolt.js'), 'preview', ...files, ...(given.includes('--no-browser') ? [] : ['--open'])];
await import(pathToFileURL(process.argv[1]));
