/**
 * Vite plugin that replaces var(--highlight-color) with 'gold'
 * in CSS output during production builds.
 *
 * Note: The concat-scripts plugin also applies this replacement
 * to the concatenated CSS bundle. This plugin is a safety net
 * for any CSS that Vite processes through its normal pipeline.
 */

function cssReplace() {
  return {
    name: 'piskel-css-replace',
    enforce: 'post',

    generateBundle(options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        // Apply CSS variable replacement to any CSS assets
        if (fileName.endsWith('.css') && chunk.type === 'asset' && typeof chunk.source === 'string') {
          chunk.source = chunk.source.replace(/var\(--highlight-color\)/g, 'gold');
        }
      }

      // Remove the trivial virtual entry JS file from the bundle
      if (bundle['_entry.js']) {
        delete bundle['_entry.js'];
      }
    },
  };
}

module.exports = cssReplace;
