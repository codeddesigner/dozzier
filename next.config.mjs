/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  // Short legal URLs (used in Azure, Google and the Claude directory) → the real pages.
  async redirects() {
    return [
      { source: "/privacy", destination: "/legal/privacy", permanent: true },
      { source: "/terms", destination: "/legal/terms", permanent: true },
      { source: "/dpa", destination: "/legal/dpa", permanent: true },
    ];
  },
};
export default nextConfig;
