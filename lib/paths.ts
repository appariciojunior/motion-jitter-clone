// Build-time constants baked by next.config.mjs. Empty/false in local dev;
// set by the GitHub Pages workflow (STATIC_EXPORT=1) so the app works under
// the /motion-jitter-clone subpath and hides server-only features.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1';
