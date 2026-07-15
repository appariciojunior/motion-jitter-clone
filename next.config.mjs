/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // avoid double Pixi mount in dev
  devIndicators: false,   // hide the dev overlay badge (it covers the play button)
};

export default nextConfig;
