/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@workspace/ui"],
  experimental: {
    // Enables React's <ViewTransition> for client-side route crossfades.
    viewTransition: true,
  },
}

export default nextConfig
