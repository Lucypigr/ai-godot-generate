// New names take precedence, including an explicitly empty value.
export const browserChannel = (env = process.env) => env.PIXELBOLT_BROWSER_CHANNEL ?? env.PIXELFORGE_BROWSER_CHANNEL;
export const studioPacker = (env = process.env) => env.PIXELBOLT_STUDIO_PACKER ?? env.PIXELFORGE_STUDIO_PACKER;
