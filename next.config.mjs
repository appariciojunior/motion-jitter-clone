/** @type {import('next').NextConfig} */

// STATIC_EXPORT=1 → GitHub Pages build: static export served under the
// project subpath, with the server-only /api/export route removed by the
// workflow. Unset (default) → normal dev/build with native-ffmpeg export.
const isStatic = process.env.STATIC_EXPORT === '1';
// Project Pages sites are served under /<repo>/, so the basePath must match the
// repository name or every asset URL 404s. GitHub Actions exposes it as
// GITHUB_REPOSITORY="owner/repo"; derive from that so forks work without edits.
// Falls back to the local repo name when built outside Actions.
const repoName = (process.env.GITHUB_REPOSITORY || '').split('/')[1] || 'web-motion-export';
const basePath = isStatic ? `/${repoName}` : '';

const nextConfig = {
  reactStrictMode: false, // avoid double Pixi mount in dev
  devIndicators: false,   // hide the dev overlay badge (it covers the play button)
  ...(isStatic && {
    output: 'export',
    basePath,
    images: { unoptimized: true }, // no next/image today; keeps future use export-safe
  }),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_STATIC_EXPORT: isStatic ? '1' : '',
  },
};

export default nextConfig;
