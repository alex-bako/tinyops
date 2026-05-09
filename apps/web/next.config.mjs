/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@workspace/ui"],
}

export default nextConfig
