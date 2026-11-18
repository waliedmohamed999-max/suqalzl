/** @type {import('next').NextConfig} */
const nextConfig = {
  // gzip would buffer text/event-stream chunks; SSE must not be compressed.
  compress: false,
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
