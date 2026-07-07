/** @type {import('next').NextConfig} */
const nextConfig = {
  // @atoa/core ships as TypeScript source; let Next transpile it.
  transpilePackages: ["@atoa/core"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
