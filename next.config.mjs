/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    // R3F needs three transpiled from ESM in some setups
  },
  transpilePackages: ['three'],
};
export default nextConfig;
