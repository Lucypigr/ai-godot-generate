const path = require('path');
const concatScripts = require('./vite-plugins/concat-scripts');
const htmlInclude = require('./vite-plugins/html-include');
const cssReplace = require('./vite-plugins/css-replace');

const VIRTUAL_ENTRY = 'virtual:piskel-entry';
const RESOLVED_ENTRY = '\0' + VIRTUAL_ENTRY;

/**
 * Minimal entry plugin. Vite/Rollup requires at least one entry point,
 * but all real work is done by our concat/html/css plugins.
 * This just provides a no-op entry so Rollup doesn't error.
 */
function virtualEntry() {
  return {
    name: 'piskel-virtual-entry',
    resolveId(id) {
      if (id === VIRTUAL_ENTRY) return RESOLVED_ENTRY;
      return null;
    },
    load(id) {
      if (id === RESOLVED_ENTRY) return '// piskel build entry';
      return null;
    },
  };
}

/** @type {import('vite').UserConfig} */
module.exports = {
  plugins: [
    virtualEntry(),
    htmlInclude({ rootDir: __dirname }),
    concatScripts({ rootDir: __dirname }),
    cssReplace(),
  ],

  build: {
    outDir: path.resolve(__dirname, 'dest/prod'),
    emptyOutDir: true,
    rollupOptions: {
      input: VIRTUAL_ENTRY,
      output: {
        // The virtual entry produces a trivial JS file; we'll clean it up
        entryFileNames: '_entry.js',
      },
    },
    // We handle minification ourselves via terser in the concat plugin
    minify: false,
    // Disable CSS processing - we concatenate manually
    cssCodeSplit: false,
  },

  // Dev server and preview are handled by scripts/dev-server.js
  // (Vite's dev server assumes ES modules which doesn't fit our concat-based debug mode)
};
